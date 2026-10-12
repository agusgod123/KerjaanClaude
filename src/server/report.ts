import { hariKerja, tanggalWita } from "@/domain/format";
import { totalEstimasi, totalRealisasi } from "@/domain/rules";
import type { PrStatus, PurchaseRequest, StepKind } from "@/domain/types";
import type { Db } from "./db";
import type { Viewer } from "./org";

export interface ReportFilter {
  status?: string;
  unit?: string;
  pos?: string;
  dari?: string;
  sampai?: string;
}

export function canReport(viewer: Viewer): boolean {
  const r = viewer.roles;
  return r.has("verifikator") || r.has("sekretaris") || r.has("kepala") || r.has("spi") || r.has("umum");
}

export const STATUS_GROUPS: Record<string, { label: string; statuses: PrStatus[] }> = {
  proses: { label: "Dalam persetujuan", statuses: ["diketahui", "verifikasi", "persetujuan"] },
  dikembalikan: { label: "Dikembalikan", statuses: ["dikembalikan"] },
  pembelian: { label: "Disetujui atau dibeli", statuses: ["disetujui", "pembelian", "tiba"] },
  selesai: { label: "Selesai", statuses: ["selesai"] },
  ditolak: { label: "Ditolak atau batal", statuses: ["ditolak", "dibatalkan"] },
};

export function filterPrs(db: Db, f: ReportFilter): PurchaseRequest[] {
  return db.prs
    .filter((p) => p.submittedAt) // draf tidak masuk laporan
    .filter((p) => !f.status || STATUS_GROUPS[f.status]?.statuses.includes(p.status))
    .filter((p) => !f.unit || p.unitId === f.unit)
    .filter((p) => !f.pos || (f.pos === "khusus" ? p.specialBudget : p.budgetLineId === f.pos))
    .filter((p) => {
      const d = tanggalWita(firstSubmit(p));
      return (!f.dari || d >= f.dari) && (!f.sampai || d <= f.sampai);
    })
    .sort((a, b) => Date.parse(firstSubmit(b)) - Date.parse(firstSubmit(a)));
}

export function firstSubmit(pr: PurchaseRequest): string {
  return pr.history.find((h) => h.type === "diajukan")?.at ?? pr.submittedAt ?? pr.createdAt;
}

export function nilai(pr: PurchaseRequest): number {
  return pr.purchase?.recordedAt ? totalRealisasi(pr.items) : totalEstimasi(pr.items);
}

function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1]! + s[m]!) / 2;
}

export interface ReportStats {
  count: number;
  total: number;
  medianToApproval?: number;
  approvedCount: number;
  linkedShare?: number;
  verifiedCount: number;
  stage: { kind: StepKind; label: string; avg?: number; n: number }[];
}

export function stats(prs: PurchaseRequest[]): ReportStats {
  const approved = prs.filter((p) => p.approvedAt);
  const verified = prs.filter((p) => p.verifiedTotal !== undefined);
  const stage = (["diketahui", "verifikasi", "persetujuan"] as const).map((kind) => {
    const xs = prs.flatMap((p) =>
      p.steps.filter((s) => s.kind === kind && s.action && s.action !== "lewati" && s.startedAt && s.at).map((s) => hariKerja(s.startedAt!, s.at!)),
    );
    return {
      kind,
      label: { diketahui: "Diketahui", verifikasi: "Verifikasi", persetujuan: "Persetujuan" }[kind],
      avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined,
      n: xs.length,
    };
  });
  return {
    count: prs.length,
    total: prs.reduce((s, p) => s + nilai(p), 0),
    medianToApproval: median(approved.map((p) => hariKerja(firstSubmit(p), p.approvedAt!))),
    approvedCount: approved.length,
    linkedShare: verified.length ? verified.filter((p) => p.budgetLineId || p.specialBudget).length / verified.length : undefined,
    verifiedCount: verified.length,
    stage,
  };
}
