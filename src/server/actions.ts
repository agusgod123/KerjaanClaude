"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "./db";
import * as svc from "./service";
import { endSession, getViewer, startSession } from "./session";

export type ActionResult = { ok: true; message?: string; prId?: string } | { ok: false; error: string };

async function run(fn: (ctx: { db: ReturnType<typeof getDb>; viewer: Awaited<ReturnType<typeof getViewer>>; at: Date }) => ActionResult): Promise<ActionResult> {
  const viewer = await getViewer();
  try {
    const result = fn({ db: getDb(), viewer, at: new Date() });
    revalidatePath("/", "layout");
    return result;
  } catch (err) {
    if (err instanceof svc.ServiceError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return { ok: false, error: "Isian belum lengkap atau tidak valid." };
    throw err;
  }
}

/* ---------- masuk dan keluar ---------- */

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: "Isi NIP atau email, dan kata sandi." };
  const db = getDb();
  const user = db.users.find((u) => u.active && (u.nip === identifier || u.email.toLowerCase() === identifier));
  if (!user || db.passwords.get(user.id) !== password) {
    return { error: "NIP/email atau kata sandi salah." };
  }
  await startSession(user.id);
  redirect("/");
}

/** Hanya untuk uji coba: masuk sebagai akun contoh tanpa sandi. */
export async function loginAs(form: FormData) {
  const userId = String(form.get("userId") ?? "");
  if (!getDb().users.some((u) => u.id === userId && u.active)) redirect("/masuk");
  await startSession(userId);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/masuk");
}

/* ---------- pengajuan ---------- */

const itemSchema = z.object({
  id: z.string().optional(),
  description: z.string().max(300),
  kind: z.enum(["barang", "jasa"]),
  qty: z.number().nonnegative(),
  unit: z.string().max(40),
  unitPrice: z.number().int().nonnegative(),
  reason: z.string().max(1000),
  link: z.string().max(1000).optional(),
  attachments: z
    .array(z.object({ id: z.string().optional(), name: z.string().max(200), size: z.number(), type: z.string().max(100) }))
    .max(10)
    .optional(),
});

const draftSchema = z.object({
  prId: z.string().optional(),
  neededBy: z.string().max(10),
  budgetLineId: z.string().optional(),
  note: z.string().max(2000).optional(),
  items: z.array(itemSchema).max(50),
});

export type DraftPayload = z.infer<typeof draftSchema>;

export async function saveDraft(payload: DraftPayload): Promise<ActionResult> {
  return run((ctx) => {
    const { prId, ...input } = draftSchema.parse(payload);
    const pr = svc.saveDraft(ctx, input, prId);
    return { ok: true, prId: pr.id, message: "Draf tersimpan." };
  });
}

export async function submitPr(payload: DraftPayload): Promise<ActionResult> {
  return run((ctx) => {
    const { prId, ...input } = draftSchema.parse(payload);
    const draft = svc.saveDraft(ctx, input, prId);
    const pr = svc.submit(ctx, draft.id);
    return { ok: true, prId: pr.id, message: `${pr.number} ${pr.round > 1 ? "diajukan ulang" : "diajukan"}.` };
  });
}

export async function submitExisting(prId: string): Promise<ActionResult> {
  return run((ctx) => {
    const pr = svc.submit(ctx, z.string().parse(prId));
    return { ok: true, prId: pr.id, message: `${pr.number} diajukan.` };
  });
}

export async function deleteDraft(prId: string): Promise<ActionResult> {
  return run((ctx) => {
    svc.deleteDraft(ctx, z.string().parse(prId));
    return { ok: true, message: "Draf dihapus." };
  });
}

export async function cancelPr(prId: string, reason: string): Promise<ActionResult> {
  return run((ctx) => {
    const pr = svc.cancel(ctx, z.string().parse(prId), z.string().max(1000).parse(reason));
    return { ok: true, prId: pr.id, message: `${pr.number} dibatalkan.` };
  });
}

/* ---------- persetujuan ---------- */

const actSchema = z.object({
  prId: z.string(),
  action: z.enum(["setuju", "kembalikan", "tolak"]),
  note: z.string().max(1000).optional(),
  budgetLineId: z.string().optional(),
  specialBudget: z.boolean().optional(),
});

export async function actOnPr(payload: z.infer<typeof actSchema>): Promise<ActionResult> {
  return run((ctx) => {
    const { prId, ...input } = actSchema.parse(payload);
    const before = ctx.db.prs.find((p) => p.id === prId);
    const kind = before ? svc.currentStep(before)?.kind : undefined;
    const pr = svc.act(ctx, prId, input);
    const message =
      input.action === "kembalikan"
        ? `${pr.number} dikembalikan ke pemohon.`
        : input.action === "tolak"
          ? `${pr.number} ditolak.`
          : kind === "diketahui"
            ? `${pr.number} sudah Anda ketahui.`
            : kind === "verifikasi"
              ? `${pr.number} terverifikasi dan diteruskan.`
              : `${pr.number} disetujui.`;
    return { ok: true, prId: pr.id, message };
  });
}

/* ---------- pembelian dan penerimaan ---------- */

export async function takePurchase(prId: string): Promise<ActionResult> {
  return run((ctx) => {
    const pr = svc.takePurchase(ctx, z.string().parse(prId));
    return { ok: true, prId: pr.id, message: `${pr.number} masuk daftar pembelian Anda.` };
  });
}

const purchaseSchema = z.object({
  prId: z.string(),
  vendor: z.string().max(200),
  purchasedOn: z.string().max(10),
  receiptName: z.string().max(200).optional(),
  prices: z.record(z.string(), z.number().int().nonnegative()),
});

export async function recordPurchase(payload: z.infer<typeof purchaseSchema>): Promise<ActionResult> {
  return run((ctx) => {
    const { prId, ...input } = purchaseSchema.parse(payload);
    const { pr, reapproval } = svc.recordPurchase(ctx, prId, input);
    return {
      ok: true,
      prId: pr.id,
      message: reapproval ? `${reapproval}. ${pr.number} dikirim untuk persetujuan ulang.` : "Pembelian tercatat.",
    };
  });
}

const arrivalSchema = z.object({
  prId: z.string(),
  items: z.record(
    z.string(),
    z.object({ qty: z.number().nonnegative(), condition: z.enum(["baik", "rusak", "kurang"]), note: z.string().max(500).optional() }),
  ),
});

export async function recordArrival(payload: z.infer<typeof arrivalSchema>): Promise<ActionResult> {
  return run((ctx) => {
    const { prId, ...input } = arrivalSchema.parse(payload);
    const pr = svc.recordArrival(ctx, prId, input);
    return { ok: true, prId: pr.id, message: "Barang tiba tercatat. Pemohon diminta konfirmasi." };
  });
}

export async function confirmReceipt(prId: string, note?: string): Promise<ActionResult> {
  return run((ctx) => {
    const pr = svc.confirmReceipt(ctx, z.string().parse(prId), note);
    return { ok: true, prId: pr.id, message: `${pr.number} selesai. Terima kasih sudah mengonfirmasi.` };
  });
}

/* ---------- notifikasi ---------- */

export async function markAllRead(): Promise<ActionResult> {
  return run(({ db, viewer }) => {
    for (const n of db.notifications) if (n.userId === viewer.user.id) n.read = true;
    return { ok: true };
  });
}
