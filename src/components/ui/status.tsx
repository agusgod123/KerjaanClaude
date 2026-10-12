import { Check } from "lucide-react";
import { STATUS, TRACK, type Tone, type TrackState } from "@/domain/status";
import type { PrStatus } from "@/domain/types";
import { cn } from "@/lib/cn";

const toneClass: Record<Tone, { pill: string; dot: string }> = {
  netral: { pill: "bg-sunken text-ink-2", dot: "bg-ink-3" },
  tunggu: { pill: "bg-tunggu-soft text-tunggu", dot: "bg-tunggu-dot" },
  revisi: { pill: "bg-revisi-soft text-revisi", dot: "bg-revisi-dot" },
  tolak: { pill: "bg-merah-soft text-merah-strong", dot: "bg-merah" },
  jalan: { pill: "bg-jalan-soft text-jalan", dot: "bg-jalan-dot" },
  selesai: { pill: "bg-sunken text-ink", dot: "" },
};

export function StatusPill({ status, label, className }: { status: PrStatus; label?: string; className?: string }) {
  const meta = STATUS[status];
  const t = toneClass[meta.tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-sm font-semibold whitespace-nowrap",
        t.pill,
        className,
      )}
    >
      {meta.tone === "selesai" ? (
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
      ) : (
        <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />
      )}
      {label ?? meta.label}
    </span>
  );
}

const segment: Record<TrackState, string> = {
  selesai: "bg-ink",
  sekarang: "bg-tunggu-dot",
  kembali: "bg-revisi-dot",
  berhenti: "bg-merah",
  nanti: "bg-line-strong/70",
};

const stateWord: Record<TrackState, string> = {
  selesai: "selesai",
  sekarang: "sedang berjalan",
  kembali: "dikembalikan",
  berhenti: "ditolak",
  nanti: "belum",
};

/**
 * Jalur kemajuan lima tahap. Dibaca sekilas di daftar: berapa jauh PR sudah
 * berjalan dan di tahap mana berhenti. Teks untuk pembaca layar menyebut
 * keadaan tiap tahap, jadi warna bukan satu-satunya penanda.
 */
export function Track({ states, className, size = "sm" }: { states: TrackState[]; className?: string; size?: "sm" | "md" }) {
  const summary = TRACK.map((name, i) => `${name}: ${stateWord[states[i] ?? "nanti"]}`).join(", ");
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={summary} title={summary}>
      {states.map((s, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full",
            size === "sm" ? "h-1.5 w-4" : "h-2 w-full",
            segment[s],
          )}
        />
      ))}
    </span>
  );
}
