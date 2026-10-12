/**
 * Aturan bisnis yang murni (tanpa I/O). Semua yang menentukan ke mana PR
 * mengalir ada di sini supaya bisa diuji tanpa database.
 */
import type { BudgetLine, PrItem, PurchaseRequest } from "./types";
import { TIME_ZONE, persen } from "./format";

/** Rp5.000.000 ke atas, termasuk tepat Rp5.000.000, disetujui Kepala Badan. */
export const AMBANG_KEPALA_BADAN = 5_000_000;

/** Realisasi lebih dari 10% di atas estimasi perlu persetujuan ulang (usulan PRD). */
export const TOLERANSI_REALISASI = 0.1;

export function subtotal(item: Pick<PrItem, "qty" | "unitPrice">): number {
  return Math.round(item.qty * item.unitPrice);
}

export function totalEstimasi(items: Pick<PrItem, "qty" | "unitPrice">[]): number {
  return items.reduce((sum, item) => sum + subtotal(item), 0);
}

export function totalRealisasi(items: Pick<PrItem, "qty" | "unitPrice" | "realizedUnitPrice">[]): number {
  return items.reduce((sum, item) => sum + Math.round(item.qty * (item.realizedUnitPrice ?? item.unitPrice)), 0);
}

export type FinalApproverKind = "sekretaris" | "kepala_badan";

export interface FinalApprover {
  kind: FinalApproverKind;
  /** Alasan yang ditampilkan ke pengguna */
  basis: string;
}

export function penyetujuAkhir(total: number, anggaranKhusus: boolean): FinalApprover {
  if (anggaranKhusus) return { kind: "kepala_badan", basis: "Anggaran khusus" };
  if (total >= AMBANG_KEPALA_BADAN) return { kind: "kepala_badan", basis: "Total Rp5 jt ke atas" };
  return { kind: "sekretaris", basis: "Total di bawah Rp5 jt" };
}

export interface ReapprovalCheck {
  needed: boolean;
  reason?: string;
}

/**
 * Setelah Urusan Umum mencatat harga realisasi: perlu kembali ke penyetuju
 * akhir bila naik lebih dari 10%, atau bila total melewati ambang Rp5 jt.
 */
export function cekPersetujuanUlang(estimasi: number, realisasi: number): ReapprovalCheck {
  if (estimasi < AMBANG_KEPALA_BADAN && realisasi >= AMBANG_KEPALA_BADAN) {
    return { needed: true, reason: "Total realisasi menjadi Rp5 jt ke atas" };
  }
  if (estimasi > 0 && realisasi > estimasi * (1 + TOLERANSI_REALISASI)) {
    return {
      needed: true,
      reason: `Realisasi ${persen(realisasi / estimasi - 1)} di atas estimasi`,
    };
  }
  return { needed: false };
}

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function romawi(month: number): string {
  const r = ROMAWI[month - 1];
  if (!r) throw new RangeError(`Bulan tidak valid: ${month}`);
  return r;
}

/** Bulan dan tahun menurut WITA, bukan UTC: PR jam 07.00 WITA tanggal 1 masuk bulan baru. */
export function bulanTahunWita(at: Date): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "numeric",
    year: "numeric",
  }).formatToParts(at);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  return { month, year };
}

/** 007/PR/IT/X/2026 — urut per unit per tahun. */
export function nomorPr(seq: number, unitCode: string, at: Date): string {
  const { month, year } = bulanTahunWita(at);
  return `${String(seq).padStart(3, "0")}/PR/${unitCode}/${romawi(month)}/${year}`;
}

export interface BudgetUsage {
  pagu: number;
  /** Sudah dibeli (harga realisasi) */
  realisasi: number;
  /** Disetujui tapi belum dibeli: uangnya sudah terikat */
  terikat: number;
  /** Sudah diverifikasi ke pos ini, menunggu persetujuan akhir. Info, tidak memotong pagu. */
  dalamProses: number;
  /** pagu − terikat − realisasi */
  sisa: number;
}

const CLOSED = new Set(["ditolak", "dibatalkan"]);

/** Sisa pagu = pagu − PR disetujui yang belum dibeli − realisasi. */
export function pemakaianPagu(
  line: Pick<BudgetLine, "id" | "pagu">,
  prs: Pick<PurchaseRequest, "id" | "budgetLineId" | "specialBudget" | "status" | "items" | "purchase" | "verifiedTotal">[],
  excludePrId?: string,
): BudgetUsage {
  let realisasi = 0;
  let terikat = 0;
  let dalamProses = 0;
  for (const pr of prs) {
    if (pr.id === excludePrId) continue;
    if (pr.budgetLineId !== line.id || pr.specialBudget || CLOSED.has(pr.status)) continue;
    if (pr.purchase?.recordedAt) {
      realisasi += totalRealisasi(pr.items);
    } else if (pr.status === "disetujui" || pr.status === "pembelian") {
      terikat += pr.verifiedTotal ?? totalEstimasi(pr.items);
    } else if (pr.status === "persetujuan") {
      dalamProses += pr.verifiedTotal ?? totalEstimasi(pr.items);
    }
  }
  return { pagu: line.pagu, realisasi, terikat, dalamProses, sisa: line.pagu - realisasi - terikat };
}

/** Judul PR untuk daftar: item pertama + jumlah item lain. */
export function judulPr(items: Pick<PrItem, "description">[]): string {
  if (items.length === 0) return "Tanpa item";
  const first = items[0]!.description.trim() || "Tanpa nama";
  return items.length === 1 ? first : `${first} dan ${items.length - 1} item lain`;
}
