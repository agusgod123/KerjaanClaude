import type { PrStatus, PurchaseRequest, StepKind } from "./types";

/**
 * Nada warna status. Sengaja hanya lima, dan selalu disertai label:
 * warna membantu memindai, bukan satu-satunya penanda.
 */
export type Tone = "netral" | "tunggu" | "revisi" | "tolak" | "jalan" | "selesai";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export const STATUS: Record<PrStatus, StatusMeta> = {
  draf: { label: "Draf", tone: "netral" },
  diketahui: { label: "Menunggu diketahui", tone: "tunggu" },
  verifikasi: { label: "Menunggu verifikasi", tone: "tunggu" },
  persetujuan: { label: "Menunggu persetujuan", tone: "tunggu" },
  dikembalikan: { label: "Dikembalikan", tone: "revisi" },
  ditolak: { label: "Ditolak", tone: "tolak" },
  disetujui: { label: "Disetujui, menunggu dibeli", tone: "jalan" },
  pembelian: { label: "Dalam pembelian", tone: "jalan" },
  tiba: { label: "Barang tiba", tone: "jalan" },
  selesai: { label: "Selesai", tone: "selesai" },
  dibatalkan: { label: "Dibatalkan", tone: "netral" },
};

export const STEP_LABEL: Record<StepKind, string> = {
  diketahui: "Diketahui",
  verifikasi: "Verifikasi",
  persetujuan: "Disetujui",
};

/** Label tombol utama per tahap: kata kerja yang sama dengan formulir kertas. */
export const STEP_VERB: Record<StepKind, string> = {
  diketahui: "Ketahui",
  verifikasi: "Verifikasi",
  persetujuan: "Setujui",
};

/** Lima tahap yang dilihat pemohon di jalur kemajuan. */
export const TRACK = ["Diketahui", "Verifikasi", "Disetujui", "Dibeli", "Diterima"] as const;

export type TrackState = "selesai" | "sekarang" | "berhenti" | "kembali" | "nanti";

/** Keadaan tiap segmen jalur kemajuan untuk satu PR. */
export function trackStates(pr: Pick<PurchaseRequest, "status" | "steps" | "round" | "purchase">): TrackState[] {
  const s = pr.status;
  const fill = (done: number, current?: TrackState): TrackState[] =>
    TRACK.map((_, i) => (i < done ? "selesai" : i === done && current ? current : "nanti"));

  switch (s) {
    case "draf":
      return fill(0);
    case "diketahui":
      return fill(0, "sekarang");
    case "verifikasi":
      return fill(1, "sekarang");
    case "persetujuan":
      return fill(2, "sekarang");
    case "disetujui":
    case "pembelian":
      return fill(3, "sekarang");
    case "tiba":
      return fill(4, "sekarang");
    case "selesai":
      return fill(5);
    case "dikembalikan":
    case "ditolak": {
      const step = [...pr.steps]
        .reverse()
        .find((st) => st.round === pr.round && (st.action === "kembalikan" || st.action === "tolak"));
      const idx = step ? (["diketahui", "verifikasi", "persetujuan"] as const).indexOf(step.kind) : 0;
      return fill(idx, s === "ditolak" ? "berhenti" : "kembali");
    }
    case "dibatalkan":
      return fill(0);
  }
}

/** Status yang masih bergerak (belum final dan bukan draf). */
export const AKTIF: ReadonlySet<PrStatus> = new Set([
  "diketahui",
  "verifikasi",
  "persetujuan",
  "dikembalikan",
  "disetujui",
  "pembelian",
  "tiba",
]);

export const MENUNGGU_PERSETUJUAN: ReadonlySet<PrStatus> = new Set(["diketahui", "verifikasi", "persetujuan"]);

export const FINAL: ReadonlySet<PrStatus> = new Set(["selesai", "ditolak", "dibatalkan"]);
