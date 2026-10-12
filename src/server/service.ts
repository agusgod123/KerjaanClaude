/**
 * Layanan inti: semua perubahan status PR lewat sini. Setiap fungsi
 * memeriksa hak akses sendiri, menulis linimasa, notifikasi, dan jejak audit.
 * Waktu (`at`) disuntikkan supaya seed dan uji bisa memutar ulang alur.
 */
import {
  cekPersetujuanUlang,
  nomorPr,
  bulanTahunWita,
  penyetujuAkhir,
  totalEstimasi,
  totalRealisasi,
} from "@/domain/rules";
import { rupiah } from "@/domain/format";
import type {
  ApprovalStep,
  HistoryType,
  ItemCondition,
  ItemKind,
  PrItem,
  PurchaseRequest,
} from "@/domain/types";
import { newId, type Db } from "./db";
import {
  canView,
  holdersOf,
  holdsPosition,
  positionByKind,
  positionOf,
  unitOf,
  userOf,
  type Viewer,
} from "./org";

export class ServiceError extends Error {}

function fail(message: string): never {
  throw new ServiceError(message);
}

interface Ctx {
  db: Db;
  viewer: Viewer;
  at: Date;
}

export interface ItemInput {
  id?: string;
  description: string;
  kind: ItemKind;
  qty: number;
  unit: string;
  unitPrice: number;
  reason: string;
  link?: string;
  attachments?: { id?: string; name: string; size: number; type: string }[];
}

export interface DraftInput {
  neededBy: string;
  budgetLineId?: string;
  note?: string;
  items: ItemInput[];
}

/* ---------- pembacaan ---------- */

export function getPr(db: Db, viewer: Viewer, prId: string): PurchaseRequest {
  const pr = db.prs.find((p) => p.id === prId);
  if (!pr || !canView(viewer, pr, db)) fail("PR tidak ditemukan atau Anda tidak punya akses.");
  return pr;
}

/** Tahap yang sedang menunggu pada putaran berjalan. */
export function currentStep(pr: PurchaseRequest): ApprovalStep | undefined {
  if (pr.status !== "diketahui" && pr.status !== "verifikasi" && pr.status !== "persetujuan") return undefined;
  return pr.steps.find((s) => s.round === pr.round && !s.action);
}

export function canAct(viewer: Viewer, pr: PurchaseRequest): boolean {
  if (viewer.roles.has("admin") && viewer.positions.every((p) => p.kind === "admin")) return false;
  const step = currentStep(pr);
  return Boolean(step && holdsPosition(viewer, step.positionId));
}

export function isReapproval(step: ApprovalStep): boolean {
  return step.kind === "persetujuan" && Boolean(step.basis?.startsWith("Persetujuan ulang"));
}

/* ---------- pencatatan ---------- */

function titleFor(ctx: Ctx, positionId?: string): string {
  if (positionId) {
    const held = ctx.viewer.positions.find((p) => p.id === positionId);
    if (held) return held.title;
  }
  return ctx.viewer.title;
}

function log(ctx: Ctx, pr: PurchaseRequest, type: HistoryType, note?: string, positionId?: string) {
  pr.history.push({
    id: newId(),
    type,
    actorId: ctx.viewer.user.id,
    actorTitle: titleFor(ctx, positionId),
    at: ctx.at.toISOString(),
    round: pr.round,
    note,
  });
}

function snapshot(pr: PurchaseRequest) {
  return {
    status: pr.status,
    round: pr.round,
    budgetLineId: pr.budgetLineId ?? null,
    specialBudget: pr.specialBudget,
    total: totalEstimasi(pr.items),
  };
}

function audit(ctx: Ctx, action: string, pr: PurchaseRequest, before: unknown) {
  ctx.db.audit.push({
    id: newId(),
    actorId: ctx.viewer.user.id,
    action,
    objectId: pr.id,
    before,
    after: snapshot(pr),
    at: ctx.at.toISOString(),
  });
}

function notify(ctx: Ctx, userIds: Iterable<string>, pr: PurchaseRequest, text: string) {
  const seen = new Set<string>();
  for (const userId of userIds) {
    if (seen.has(userId) || userId === ctx.viewer.user.id) continue;
    seen.add(userId);
    ctx.db.notifications.push({
      id: newId(),
      userId,
      prId: pr.id,
      text,
      at: ctx.at.toISOString(),
      read: false,
    });
  }
}

function label(pr: PurchaseRequest): string {
  return pr.number ?? "PR";
}

function assigneeIds(ctx: Ctx, step: ApprovalStep): string[] {
  return holdersOf(ctx.db, step.positionId, ctx.at).map((u) => u.id);
}

/* ---------- draf ---------- */

function cleanItems(items: ItemInput[]): PrItem[] {
  return items.map((it) => ({
    id: it.id ?? newId(),
    description: it.description.trim(),
    kind: it.kind,
    qty: it.qty,
    unit: it.unit.trim(),
    unitPrice: Math.round(it.unitPrice),
    reason: it.reason.trim(),
    link: it.link?.trim() || undefined,
    attachments: (it.attachments ?? []).map((a) => ({ ...a, id: a.id ?? newId() })),
  }));
}

export function saveDraft(ctx: Ctx, input: DraftInput, prId?: string): PurchaseRequest {
  const now = ctx.at.toISOString();
  if (prId) {
    const pr = getPr(ctx.db, ctx.viewer, prId);
    if (pr.requesterId !== ctx.viewer.user.id) fail("Hanya pemohon yang bisa mengubah PR ini.");
    if (pr.status !== "draf" && pr.status !== "dikembalikan") fail("PR yang sedang diproses tidak bisa diubah.");
    pr.items = cleanItems(input.items);
    pr.neededBy = input.neededBy;
    pr.budgetLineId = input.budgetLineId || undefined;
    pr.note = input.note?.trim() || undefined;
    pr.updatedAt = now;
    return pr;
  }
  const pr: PurchaseRequest = {
    id: newId(),
    requesterId: ctx.viewer.user.id,
    unitId: ctx.viewer.user.unitId,
    neededBy: input.neededBy,
    budgetLineId: input.budgetLineId || undefined,
    specialBudget: false,
    status: "draf",
    note: input.note?.trim() || undefined,
    items: cleanItems(input.items),
    steps: [],
    round: 0,
    createdAt: now,
    updatedAt: now,
    history: [],
  };
  ctx.db.prs.push(pr);
  log(ctx, pr, "dibuat");
  return pr;
}

export function deleteDraft(ctx: Ctx, prId: string) {
  const pr = getPr(ctx.db, ctx.viewer, prId);
  if (pr.requesterId !== ctx.viewer.user.id || pr.status !== "draf") fail("Hanya draf milik Anda yang bisa dihapus.");
  ctx.db.prs = ctx.db.prs.filter((p) => p.id !== prId);
}

export function validateForSubmit(pr: Pick<PurchaseRequest, "items" | "neededBy">): string[] {
  const errors: string[] = [];
  if (pr.items.length === 0) errors.push("Tambahkan minimal satu item.");
  pr.items.forEach((it, i) => {
    const n = i + 1;
    if (!it.description) errors.push(`Item ${n}: nama barang atau jasa belum diisi.`);
    if (!(it.qty > 0)) errors.push(`Item ${n}: jumlah harus lebih dari 0.`);
    if (!it.unit) errors.push(`Item ${n}: satuan belum diisi.`);
    if (!(it.unitPrice > 0)) errors.push(`Item ${n}: harga satuan belum diisi.`);
    if (!it.reason) errors.push(`Item ${n}: alasan kebutuhan belum diisi.`);
  });
  if (!pr.neededBy) errors.push("Tanggal dibutuhkan belum diisi.");
  return errors;
}

/* ---------- pengajuan ---------- */

export function submit(ctx: Ctx, prId: string): PurchaseRequest {
  const { db, at } = ctx;
  const pr = getPr(db, ctx.viewer, prId);
  if (pr.requesterId !== ctx.viewer.user.id) fail("Hanya pemohon yang bisa mengajukan PR ini.");
  if (pr.status !== "draf" && pr.status !== "dikembalikan") fail("PR ini sudah diajukan.");
  const errors = validateForSubmit(pr);
  if (errors.length) fail(errors[0]!);

  const before = snapshot(pr);
  const resubmit = pr.status === "dikembalikan";
  const unit = unitOf(db, pr.unitId);

  if (!pr.number) {
    const { year } = bulanTahunWita(at);
    const key = `${unit.id}:${year}`;
    const seq = (db.sequences.get(key) ?? 0) + 1;
    db.sequences.set(key, seq);
    pr.number = nomorPr(seq, unit.code, at);
  }

  pr.round += 1;
  pr.submittedAt = at.toISOString();
  pr.updatedAt = at.toISOString();
  // Pos dari pemohon hanya usulan; Keuangan menetapkan ulang saat verifikasi.
  pr.specialBudget = false;
  pr.verifiedTotal = undefined;

  const total = totalEstimasi(pr.items);
  const final = penyetujuAkhir(total, false);
  const head = positionOf(db, unit.headPositionId);
  const steps: ApprovalStep[] = [
    { id: newId(), round: pr.round, kind: "diketahui", positionId: head.id },
    { id: newId(), round: pr.round, kind: "verifikasi", positionId: positionByKind(db, "keuangan").id },
    {
      id: newId(),
      round: pr.round,
      kind: "persetujuan",
      positionId: positionByKind(db, final.kind).id,
      basis: final.basis,
    },
  ];
  pr.steps.push(...steps);
  log(ctx, pr, resubmit ? "diajukan_ulang" : "diajukan");

  // Pemohon kepala unit: tahap Diketahui dilewati otomatis, tetap tercatat.
  const first = steps[0]!;
  if (holdsPosition(ctx.viewer, first.positionId)) {
    first.startedAt = at.toISOString();
    first.action = "lewati";
    first.actorId = ctx.viewer.user.id;
    first.actorTitle = titleFor(ctx, first.positionId);
    first.note = "Pemohon adalah kepala unit";
    first.at = at.toISOString();
    log(ctx, pr, "diketahui_otomatis", first.note, first.positionId);
  }

  advance(ctx, pr);
  audit(ctx, resubmit ? "ajukan_ulang" : "ajukan", pr, before);
  return pr;
}

/** Pindahkan PR ke tahap berikutnya yang belum ditindak, atau ke Disetujui. */
function advance(ctx: Ctx, pr: PurchaseRequest) {
  const next = pr.steps.find((s) => s.round === pr.round && !s.action);
  const requester = userOf(ctx.db, pr.requesterId);
  if (next) {
    next.startedAt = ctx.at.toISOString();
    pr.status = next.kind;
    const verb = { diketahui: "diketahui", verifikasi: "diverifikasi", persetujuan: "disetujui" }[next.kind];
    notify(
      ctx,
      assigneeIds(ctx, next),
      pr,
      `${label(pr)} dari ${requester.name} menunggu ${verb} Anda.`,
    );
    return;
  }
  if (pr.purchase?.approvedCeiling !== undefined) {
    // Selesai persetujuan ulang: kembali ke Urusan Umum.
    pr.status = "pembelian";
    notify(ctx, [pr.purchase.picId], pr, `${label(pr)} disetujui ulang. Pembelian bisa dilanjutkan.`);
    return;
  }
  pr.status = "disetujui";
  pr.approvedAt = ctx.at.toISOString();
  pr.verifyCode ??= newId();
  notify(ctx, [pr.requesterId], pr, `${label(pr)} disetujui. Urusan Umum akan memproses pembelian.`);
  notify(
    ctx,
    holdersOf(ctx.db, positionByKind(ctx.db, "umum").id, ctx.at).map((u) => u.id),
    pr,
    `${label(pr)} disetujui dan siap dibeli.`,
  );
}

/* ---------- persetujuan ---------- */

export interface ActInput {
  action: "setuju" | "kembalikan" | "tolak";
  note?: string;
  /** Wajib saat verifikasi: pos RKA, atau tandai anggaran khusus */
  budgetLineId?: string;
  specialBudget?: boolean;
}

export function act(ctx: Ctx, prId: string, input: ActInput): PurchaseRequest {
  const { db, at } = ctx;
  const pr = getPr(db, ctx.viewer, prId);
  const step = currentStep(pr);
  if (!step) fail("PR ini tidak sedang menunggu persetujuan.");
  if (!canAct(ctx.viewer, pr)) fail("PR ini tidak sedang menunggu Anda.");

  const note = input.note?.trim() || undefined;
  if ((input.action === "kembalikan" || input.action === "tolak") && (!note || note.length < 5)) {
    fail("Tuliskan alasan supaya pemohon tahu apa yang perlu diperbaiki.");
  }
  if (input.action === "kembalikan" && isReapproval(step)) {
    fail("Persetujuan ulang hanya bisa disetujui atau ditolak.");
  }

  const before = snapshot(pr);

  if (input.action === "setuju" && step.kind === "verifikasi") {
    const special = Boolean(input.specialBudget);
    if (!special) {
      const line = db.budgetLines.find((l) => l.id === input.budgetLineId);
      if (!line) fail("Pilih pos RKA, atau tandai sebagai anggaran khusus.");
      pr.budgetLineId = line.id;
    } else {
      pr.budgetLineId = undefined;
    }
    pr.specialBudget = special;
    pr.verifiedTotal = totalEstimasi(pr.items);
    // Nilai dasar penyetuju akhir = total estimasi saat verifikasi.
    const final = penyetujuAkhir(pr.verifiedTotal, special);
    const finalStep = pr.steps.find((s) => s.round === pr.round && s.kind === "persetujuan" && !s.action);
    if (finalStep) {
      finalStep.positionId = positionByKind(db, final.kind).id;
      finalStep.basis = final.basis;
    }
  }

  step.action = input.action;
  step.actorId = ctx.viewer.user.id;
  step.actorTitle = titleFor(ctx, step.positionId);
  step.note = note;
  step.at = at.toISOString();
  pr.updatedAt = at.toISOString();

  if (input.action === "setuju") {
    const type: HistoryType = { diketahui: "diketahui", verifikasi: "diverifikasi", persetujuan: "disetujui" }[
      step.kind
    ] as HistoryType;
    log(ctx, pr, type, note, step.positionId);
    if (step.kind === "persetujuan" && isReapproval(step) && pr.purchase) {
      pr.purchase.approvedCeiling = totalRealisasi(pr.items);
    }
    advance(ctx, pr);
    if (pr.status !== "disetujui" && pr.status !== "pembelian") {
      const done = { diketahui: "diketahui", verifikasi: "diverifikasi", persetujuan: "disetujui" }[step.kind];
      notify(ctx, [pr.requesterId], pr, `${label(pr)} sudah ${done} oleh ${ctx.viewer.user.name}.`);
    }
  } else if (input.action === "kembalikan") {
    pr.status = "dikembalikan";
    log(ctx, pr, "dikembalikan", note, step.positionId);
    notify(ctx, [pr.requesterId], pr, `${label(pr)} dikembalikan untuk direvisi: "${note}"`);
  } else {
    pr.status = "ditolak";
    log(ctx, pr, "ditolak", note, step.positionId);
    notify(ctx, [pr.requesterId], pr, `${label(pr)} ditolak: "${note}"`);
    if (pr.purchase) notify(ctx, [pr.purchase.picId], pr, `${label(pr)} ditolak pada persetujuan ulang.`);
  }
  audit(ctx, `tahap_${step.kind}_${input.action}`, pr, before);
  return pr;
}

export function cancel(ctx: Ctx, prId: string, reason: string): PurchaseRequest {
  const pr = getPr(ctx.db, ctx.viewer, prId);
  if (pr.requesterId !== ctx.viewer.user.id) fail("Hanya pemohon yang bisa membatalkan PR.");
  if (!["diketahui", "verifikasi", "persetujuan", "dikembalikan"].includes(pr.status)) {
    fail("PR yang sudah disetujui tidak bisa dibatalkan dari sini. Hubungi Urusan Umum.");
  }
  if (reason.trim().length < 5) fail("Tuliskan alasan pembatalan.");
  const before = snapshot(pr);
  const step = currentStep(pr);
  pr.status = "dibatalkan";
  pr.updatedAt = ctx.at.toISOString();
  log(ctx, pr, "dibatalkan", reason.trim());
  if (step) notify(ctx, assigneeIds(ctx, step), pr, `${label(pr)} dibatalkan oleh pemohon.`);
  audit(ctx, "batalkan", pr, before);
  return pr;
}

/* ---------- pembelian dan penerimaan ---------- */

function requireUmum(ctx: Ctx) {
  if (!ctx.viewer.roles.has("umum")) fail("Hanya Urusan Umum yang bisa mencatat pembelian.");
}

export function takePurchase(ctx: Ctx, prId: string): PurchaseRequest {
  requireUmum(ctx);
  const pr = getPr(ctx.db, ctx.viewer, prId);
  if (pr.status !== "disetujui") fail("PR ini tidak sedang menunggu pembelian.");
  const before = snapshot(pr);
  pr.status = "pembelian";
  pr.purchase = { picId: ctx.viewer.user.id, takenAt: ctx.at.toISOString() };
  pr.updatedAt = ctx.at.toISOString();
  log(ctx, pr, "pembelian_diambil");
  notify(ctx, [pr.requesterId], pr, `${label(pr)} sedang dibelikan oleh ${ctx.viewer.user.name}.`);
  audit(ctx, "ambil_pembelian", pr, before);
  return pr;
}

export interface PurchaseInput {
  vendor: string;
  purchasedOn: string;
  receiptName?: string;
  prices: Record<string, number>;
}

export type PurchaseResult = { pr: PurchaseRequest; reapproval?: string };

export function recordPurchase(ctx: Ctx, prId: string, input: PurchaseInput): PurchaseResult {
  requireUmum(ctx);
  const { db } = ctx;
  const pr = getPr(db, ctx.viewer, prId);
  if (pr.status !== "pembelian" || !pr.purchase) fail("Ambil PR ini dulu sebelum mencatat pembelian.");
  if (pr.purchase.recordedAt) fail("Pembelian sudah dicatat.");
  if (!input.vendor.trim()) fail("Isi nama toko atau vendor.");
  if (!input.purchasedOn) fail("Isi tanggal pembelian.");
  for (const item of pr.items) {
    const price = input.prices[item.id];
    if (!(price && price > 0)) fail(`Isi harga realisasi untuk "${item.description}".`);
  }

  const before = snapshot(pr);
  for (const item of pr.items) item.realizedUnitPrice = Math.round(input.prices[item.id]!);
  pr.purchase.vendor = input.vendor.trim();
  pr.purchase.purchasedOn = input.purchasedOn;
  pr.purchase.receiptName = input.receiptName || pr.purchase.receiptName;
  pr.updatedAt = ctx.at.toISOString();

  const estimate = pr.verifiedTotal ?? totalEstimasi(pr.items);
  const realized = totalRealisasi(pr.items);
  const ceiling = pr.purchase.approvedCeiling;
  const check = ceiling !== undefined && realized <= ceiling ? { needed: false } : cekPersetujuanUlang(estimate, realized);

  if (check.needed) {
    const final = penyetujuAkhir(realized, pr.specialBudget);
    const step: ApprovalStep = {
      id: newId(),
      round: pr.round,
      kind: "persetujuan",
      positionId: positionByKind(db, final.kind).id,
      basis: `Persetujuan ulang: ${check.reason}`,
      startedAt: ctx.at.toISOString(),
    };
    pr.steps.push(step);
    pr.status = "persetujuan";
    log(ctx, pr, "perlu_persetujuan_ulang", `${check.reason}: ${rupiah(estimate)} → ${rupiah(realized)}`);
    notify(
      ctx,
      assigneeIds(ctx, step),
      pr,
      `${label(pr)} perlu persetujuan ulang: ${check.reason?.toLowerCase()}.`,
    );
    notify(ctx, [pr.requesterId], pr, `${label(pr)} menunggu persetujuan ulang karena harga berubah.`);
    audit(ctx, "catat_pembelian_perlu_persetujuan_ulang", pr, before);
    return { pr, reapproval: check.reason };
  }

  pr.purchase.recordedAt = ctx.at.toISOString();
  log(ctx, pr, "pembelian_dicatat", `${pr.purchase.vendor} · ${rupiah(realized)}`);
  audit(ctx, "catat_pembelian", pr, before);
  return { pr };
}

export interface ArrivalInput {
  items: Record<string, { qty: number; condition: ItemCondition; note?: string }>;
}

export function recordArrival(ctx: Ctx, prId: string, input: ArrivalInput): PurchaseRequest {
  requireUmum(ctx);
  const pr = getPr(ctx.db, ctx.viewer, prId);
  if (pr.status !== "pembelian" || !pr.purchase?.recordedAt) fail("Catat pembelian dulu sebelum mencatat barang tiba.");
  const before = snapshot(pr);
  for (const item of pr.items) {
    const r = input.items[item.id];
    if (!r || !(r.qty >= 0)) fail(`Isi jumlah yang tiba untuk "${item.description}".`);
    item.received = { qty: r.qty, condition: r.condition, note: r.note?.trim() || undefined };
  }
  pr.status = "tiba";
  pr.purchase.arrivedAt = ctx.at.toISOString();
  pr.updatedAt = ctx.at.toISOString();
  const issues = pr.items.filter((i) => i.received && (i.received.condition !== "baik" || i.received.qty < i.qty));
  log(ctx, pr, "barang_tiba", issues.length ? `${issues.length} item perlu perhatian` : undefined);
  notify(ctx, [pr.requesterId], pr, `Barang untuk ${label(pr)} sudah tiba. Mohon konfirmasi penerimaan.`);
  audit(ctx, "catat_barang_tiba", pr, before);
  return pr;
}

export function confirmReceipt(ctx: Ctx, prId: string, note?: string): PurchaseRequest {
  const pr = getPr(ctx.db, ctx.viewer, prId);
  if (pr.requesterId !== ctx.viewer.user.id) fail("Hanya pemohon yang bisa mengonfirmasi penerimaan.");
  if (pr.status !== "tiba") fail("Barang belum dicatat tiba oleh Urusan Umum.");
  const before = snapshot(pr);
  pr.status = "selesai";
  pr.confirmedAt = ctx.at.toISOString();
  pr.updatedAt = ctx.at.toISOString();
  log(ctx, pr, "diterima", note?.trim() || undefined);
  if (pr.purchase) notify(ctx, [pr.purchase.picId], pr, `${label(pr)} sudah diterima pemohon. PR selesai.`);
  audit(ctx, "konfirmasi_terima", pr, before);
  return pr;
}

/* ---------- daftar untuk tampilan ---------- */

export function waitingFor(db: Db, viewer: Viewer): PurchaseRequest[] {
  return db.prs
    .filter((pr) => canAct(viewer, pr))
    .sort((a, b) => Date.parse(currentStep(a)!.startedAt!) - Date.parse(currentStep(b)!.startedAt!));
}
