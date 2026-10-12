import { tanggal } from "@/domain/format";
import type { HistoryType, PurchaseRequest } from "@/domain/types";
import type { Db } from "./db";
import { holdersOf, positionOf } from "./org";
import { currentStep, isReapproval } from "./service";
import { userName } from "./views";

export type EntryState = "selesai" | "sekarang" | "nanti" | "kembali" | "berhenti" | "lewat";

export interface TimelineEntry {
  key: string;
  title: string;
  state: EntryState;
  who?: string;
  role?: string;
  at?: string;
  since?: string;
  note?: string;
  meta?: string;
}

export function buildTimeline(db: Db, pr: PurchaseRequest, now: Date): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  const requester = userName(db, pr.requesterId);
  const submitted = [...pr.history].reverse().find((h) => h.type === "diajukan" || h.type === "diajukan_ulang");
  const closed = pr.status === "ditolak" || pr.status === "dibatalkan";

  out.push(
    pr.submittedAt
      ? {
          key: "diajukan",
          title: pr.round > 1 ? "Diajukan ulang" : "Diajukan",
          state: "selesai",
          who: requester,
          role: submitted?.actorTitle,
          at: pr.submittedAt,
          meta: pr.round > 1 ? `Putaran ke-${pr.round}, setelah revisi` : undefined,
        }
      : { key: "diajukan", title: "Draf", state: "sekarang", who: requester, meta: "Belum diajukan" },
  );

  const active = currentStep(pr);
  const steps = pr.steps.filter((s) => s.round === pr.round);
  for (const step of steps) {
    const position = positionOf(db, step.positionId);
    const holders = holdersOf(db, step.positionId, now).map((u) => u.name).join(", ");
    const title = isReapproval(step)
      ? "Persetujuan ulang"
      : { diketahui: "Diketahui", verifikasi: "Verifikasi", persetujuan: "Disetujui" }[step.kind];
    const base = { key: step.id, title };
    if (step.action === "lewati") {
      out.push({ ...base, state: "lewat", who: step.actorId && userName(db, step.actorId), role: step.actorTitle, at: step.at, meta: step.note });
    } else if (step.action) {
      const state: EntryState = step.action === "setuju" ? "selesai" : step.action === "kembalikan" ? "kembali" : "berhenti";
      let meta: string | undefined;
      if (step.kind === "verifikasi" && step.action === "setuju") {
        const line = db.budgetLines.find((l) => l.id === pr.budgetLineId);
        meta = pr.specialBudget ? "Anggaran khusus" : line ? `${line.code} · ${line.name}` : undefined;
      } else if (step.kind === "persetujuan") {
        meta = step.basis;
      }
      out.push({
        ...base,
        title: step.action === "kembalikan" ? "Dikembalikan" : step.action === "tolak" ? "Ditolak" : title,
        state,
        who: step.actorId && userName(db, step.actorId),
        role: step.actorTitle,
        at: step.at,
        note: step.note,
        meta,
      });
    } else if (step === active) {
      out.push({ ...base, state: "sekarang", who: holders, role: position.title, since: step.startedAt, meta: step.basis });
    } else {
      const provisional = step.kind === "persetujuan" && !pr.verifiedTotal;
      out.push({
        ...base,
        state: "nanti",
        who: closed || pr.status === "dikembalikan" ? undefined : holders,
        role: position.title,
        meta: closed || pr.status === "dikembalikan" ? undefined : provisional ? `${step.basis}, dipastikan saat verifikasi` : step.basis,
      });
    }
  }
  if (!pr.submittedAt) {
    out.push({ key: "diketahui", title: "Diketahui", state: "nanti", role: "Atasan langsung" });
    out.push({ key: "verifikasi", title: "Verifikasi", state: "nanti", role: "Urusan Keuangan" });
    out.push({ key: "persetujuan", title: "Disetujui", state: "nanti", role: "Sekretaris atau Kepala Badan" });
  }

  if (pr.status === "dibatalkan") {
    const h = [...pr.history].reverse().find((e) => e.type === "dibatalkan");
    out.push({ key: "batal", title: "Dibatalkan", state: "berhenti", who: requester, role: h?.actorTitle, at: h?.at, note: h?.note });
    return out;
  }
  if (closed) return out;

  const p = pr.purchase;
  const pic = p ? userName(db, p.picId) : undefined;
  if (p?.recordedAt) {
    out.push({
      key: "dibeli",
      title: "Dibeli",
      state: "selesai",
      who: pic,
      role: "Urusan Umum",
      at: p.recordedAt,
      meta: [p.vendor, p.purchasedOn && tanggal(p.purchasedOn)].filter(Boolean).join(" · "),
    });
  } else if (p && pr.status === "pembelian") {
    out.push({ key: "dibeli", title: "Dibeli", state: "sekarang", who: pic, role: "Urusan Umum", since: p.takenAt, meta: "Sedang diproses" });
  } else if (pr.status === "disetujui") {
    out.push({ key: "dibeli", title: "Dibeli", state: "sekarang", who: "Urusan Umum", since: pr.approvedAt, meta: "Menunggu diambil" });
  } else {
    out.push({ key: "dibeli", title: "Dibeli", state: "nanti", who: pic, role: "Urusan Umum" });
  }

  if (pr.confirmedAt) {
    out.push({
      key: "diterima",
      title: "Diterima",
      state: "selesai",
      who: requester,
      role: "Pemohon",
      at: pr.confirmedAt,
      meta: p?.arrivedAt ? `Tiba ${tanggal(p.arrivedAt)}` : undefined,
    });
  } else if (pr.status === "tiba") {
    out.push({ key: "diterima", title: "Diterima", state: "sekarang", who: requester, role: "Pemohon", since: p?.arrivedAt, meta: "Barang tiba, menunggu konfirmasi" });
  } else if (p?.recordedAt && pr.status === "pembelian") {
    out.push({ key: "diterima", title: "Diterima", state: "nanti", who: requester, role: "Pemohon", meta: "Menunggu barang tiba" });
  } else {
    out.push({ key: "diterima", title: "Diterima", state: "nanti", who: requester, role: "Pemohon" });
  }
  return out;
}

export const HISTORY_LABEL: Record<HistoryType, string> = {
  dibuat: "Draf dibuat",
  diajukan: "Diajukan",
  diajukan_ulang: "Diajukan ulang",
  diketahui: "Diketahui",
  diketahui_otomatis: "Diketahui otomatis",
  diverifikasi: "Diverifikasi",
  disetujui: "Disetujui",
  dikembalikan: "Dikembalikan",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
  pembelian_diambil: "Diambil untuk dibeli",
  pembelian_dicatat: "Pembelian dicatat",
  perlu_persetujuan_ulang: "Perlu persetujuan ulang",
  barang_tiba: "Barang tiba",
  diterima: "Diterima pemohon",
};
