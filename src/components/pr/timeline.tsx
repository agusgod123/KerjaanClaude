import { Check, CornerUpLeft, Minus, X } from "lucide-react";
import { lama, tanggalJam } from "@/domain/format";
import type { EntryState, TimelineEntry } from "@/server/timeline";
import { cn } from "@/lib/cn";

const node: Record<EntryState, string> = {
  selesai: "bg-ink text-surface",
  sekarang: "bg-tunggu-soft text-tunggu ring-2 ring-tunggu-dot",
  nanti: "bg-surface ring-1 ring-line-strong ring-inset",
  kembali: "bg-revisi-soft text-revisi ring-1 ring-revisi-dot",
  berhenti: "bg-merah text-white",
  lewat: "bg-sunken text-ink-3 ring-1 ring-line-strong ring-inset",
};

function Icon({ state }: { state: EntryState }) {
  const cls = "size-3";
  if (state === "selesai") return <Check className={cls} strokeWidth={3} />;
  if (state === "kembali") return <CornerUpLeft className={cls} strokeWidth={2.5} />;
  if (state === "berhenti") return <X className={cls} strokeWidth={3} />;
  if (state === "lewat") return <Minus className={cls} strokeWidth={3} />;
  if (state === "sekarang") return <span className="size-1.5 rounded-full bg-tunggu-dot" />;
  return null;
}

export function Timeline({ entries, now }: { entries: TimelineEntry[]; now: Date }) {
  return (
    <ol className="relative">
      {entries.map((e, i) => {
        const last = i === entries.length - 1;
        const muted = e.state === "nanti";
        return (
          <li key={e.key} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 bottom-0 left-[11px] w-0.5 rounded-full",
                  e.state === "selesai" || e.state === "lewat" ? "bg-ink/80" : "bg-line",
                )}
              />
            )}
            <span className={cn("relative z-[1] mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", node[e.state])}>
              <Icon state={e.state} />
            </span>
            <div className={cn("min-w-0 flex-1", muted && "text-ink-3")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn("font-semibold", muted ? "text-ink-3" : "text-ink", e.state === "berhenti" && "text-merah-strong")}>
                  {e.title}
                </p>
                {e.at && <p className="text-sm text-ink-3 tabular">{tanggalJam(e.at)}</p>}
                {e.state === "sekarang" && e.since && (
                  <p className="text-sm font-semibold text-tunggu">sudah {lama(e.since, now)}</p>
                )}
              </div>
              {(e.who || e.role) && (
                <p className={cn("text-sm", muted ? "text-ink-3" : "text-ink-2")}>
                  {e.who}
                  {e.who && e.role && <span className="text-ink-3"> · </span>}
                  {e.role && <span className="text-ink-3">{e.role}</span>}
                </p>
              )}
              {e.meta && <p className="mt-0.5 text-sm text-ink-3">{e.meta}</p>}
              {e.note && (
                <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm text-ink-2">
                  “{e.note}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
