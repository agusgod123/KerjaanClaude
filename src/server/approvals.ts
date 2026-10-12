import type { PurchaseRequest } from "@/domain/types";
import type { Db } from "./db";
import { userName } from "./views";

export interface Signature {
  label: string;
  name?: string;
  title?: string;
  at?: string;
  note?: string;
  skipped?: boolean;
}

/** Empat kotak tanda tangan seperti formulir kertas: Dibuat, Diketahui, Verifikator, Disetujui. */
export function signatures(db: Db, pr: PurchaseRequest): Signature[] {
  const steps = pr.steps.filter((s) => s.round === pr.round);
  const done = (kind: string) => [...steps].reverse().find((s) => s.kind === kind && (s.action === "setuju" || s.action === "lewati"));
  const submitted = [...pr.history].reverse().find((h) => h.type === "diajukan" || h.type === "diajukan_ulang");
  const sig = (label: string, kind: string): Signature => {
    const s = done(kind);
    return s
      ? { label, name: s.actorId ? userName(db, s.actorId) : undefined, title: s.actorTitle, at: s.at, note: s.note, skipped: s.action === "lewati" }
      : { label };
  };
  return [
    { label: "Dibuat", name: userName(db, pr.requesterId), title: submitted?.actorTitle, at: submitted?.at },
    sig("Diketahui", "diketahui"),
    sig("Verifikator", "verifikasi"),
    sig("Disetujui", "persetujuan"),
  ];
}
