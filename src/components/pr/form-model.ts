/** Bentuk data form PR, dipakai bersama oleh server (nilai awal) dan klien. */
import type { ItemKind } from "@/domain/types";

export interface Attachment {
  name: string;
  size: number;
  type: string;
  /** Ukuran asli sebelum dikecilkan, untuk ditunjukkan ke pengguna */
  original?: number;
}

export interface ItemDraft {
  key: string;
  id?: string;
  description: string;
  kind: ItemKind;
  qty: string;
  unit: string;
  unitPrice: number;
  reason: string;
  link: string;
  attachments: Attachment[];
}

export interface FormValues {
  items: ItemDraft[];
  neededBy: string;
  budgetLineId: string;
  note: string;
}

export interface RouteInfo {
  diketahui: { title: string; names: string; skipped: boolean };
  verifikasi: { title: string; names: string };
  sekretaris: string;
  kepala_badan: string;
}

export interface PrFormProps {
  prId?: string;
  mode: "baru" | "draf" | "revisi";
  initial: FormValues;
  today: string;
  lines: { id: string; label: string }[];
  route: RouteInfo;
  recent: { id: string; number: string; title: string }[];
  returnNote?: { by: string; note: string };
}

export const blankItem = (): ItemDraft => ({
  key: crypto.randomUUID(),
  description: "",
  kind: "barang",
  qty: "1",
  unit: "",
  unitPrice: 0,
  reason: "",
  link: "",
  attachments: [],
});
