/**
 * Model domain. Bentuknya mengikuti tabel di PRD (users, units, positions,
 * purchase_requests, pr_items, approval_steps, purchases, receipts) supaya
 * pindah ke Drizzle + PostgreSQL tinggal memetakan, bukan mendesain ulang.
 *
 * Uang = bilangan bulat rupiah. Waktu = string ISO UTC, ditampilkan WITA.
 */

export type PositionKind =
  | "kepala_badan"
  | "sekretaris"
  | "kepala_unit"
  | "keuangan"
  | "umum"
  | "spi"
  | "admin"
  | "staf";

export interface Unit {
  id: string;
  /** Kode untuk nomor PR, mis. IT, PLP, INFRA */
  code: string;
  name: string;
  /** Jabatan kepala unit: penanggung tahap Diketahui */
  headPositionId: string;
}

export interface Position {
  id: string;
  title: string;
  kind: PositionKind;
  unitId?: string;
}

export interface PositionHolder {
  positionId: string;
  userId: string;
  from: string;
  to?: string;
}

export interface User {
  id: string;
  name: string;
  /** NIP atau ID pegawai. NIK KTP sengaja tidak disimpan. */
  nip: string;
  email: string;
  phone?: string;
  unitId: string;
  active: boolean;
}

export interface BudgetLine {
  id: string;
  year: number;
  code: string;
  name: string;
  unitId: string;
  pagu: number;
}

export type ItemKind = "barang" | "jasa";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export type ItemCondition = "baik" | "rusak" | "kurang";

export interface PrItem {
  id: string;
  description: string;
  kind: ItemKind;
  qty: number;
  unit: string;
  unitPrice: number;
  reason: string;
  link?: string;
  attachments: Attachment[];
  /** Diisi Urusan Umum saat mencatat pembelian */
  realizedUnitPrice?: number;
  /** Diisi Urusan Umum saat barang tiba */
  received?: { qty: number; condition: ItemCondition; note?: string };
}

export type PrStatus =
  | "draf"
  | "diketahui"
  | "verifikasi"
  | "persetujuan"
  | "dikembalikan"
  | "ditolak"
  | "disetujui"
  | "pembelian"
  | "tiba"
  | "selesai"
  | "dibatalkan";

export type StepKind = "diketahui" | "verifikasi" | "persetujuan";
export type StepAction = "setuju" | "kembalikan" | "tolak" | "lewati";

export interface ApprovalStep {
  id: string;
  round: number;
  kind: StepKind;
  positionId: string;
  /** Mengapa jabatan ini yang dituju, mis. "Total Rp5 jt ke atas" */
  basis?: string;
  startedAt?: string;
  action?: StepAction;
  actorId?: string;
  /** Jabatan pelaku saat bertindak, dibekukan supaya PDF tetap benar */
  actorTitle?: string;
  note?: string;
  at?: string;
}

export interface Purchase {
  picId: string;
  takenAt: string;
  vendor?: string;
  purchasedOn?: string;
  receiptName?: string;
  recordedAt?: string;
  arrivedAt?: string;
  /** Total realisasi yang sudah disetujui ulang; pembelian di bawahnya tidak perlu persetujuan lagi */
  approvedCeiling?: number;
}

export type HistoryType =
  | "dibuat"
  | "diajukan"
  | "diajukan_ulang"
  | "diketahui"
  | "diketahui_otomatis"
  | "diverifikasi"
  | "disetujui"
  | "dikembalikan"
  | "ditolak"
  | "dibatalkan"
  | "pembelian_diambil"
  | "pembelian_dicatat"
  | "perlu_persetujuan_ulang"
  | "barang_tiba"
  | "diterima";

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  actorId: string;
  actorTitle: string;
  at: string;
  round: number;
  note?: string;
}

export interface PurchaseRequest {
  id: string;
  number?: string;
  requesterId: string;
  unitId: string;
  neededBy: string;
  budgetLineId?: string;
  specialBudget: boolean;
  status: PrStatus;
  note?: string;
  items: PrItem[];
  steps: ApprovalStep[];
  round: number;
  /** Total estimasi saat verifikasi: dasar penentuan penyetuju akhir */
  verifiedTotal?: number;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  updatedAt: string;
  purchase?: Purchase;
  confirmedAt?: string;
  /** Kode acak di QR halaman verifikasi */
  verifyCode?: string;
  history: HistoryEntry[];
}

export interface Notification {
  id: string;
  userId: string;
  prId: string;
  text: string;
  at: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  objectId: string;
  before: unknown;
  after: unknown;
  at: string;
}
