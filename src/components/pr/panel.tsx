import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Wadah aksi di halaman PR. `turn` menandai bahwa giliran ada di pengguna ini. */
export function Panel({
  turn,
  eyebrow,
  title,
  children,
  className,
}: {
  turn?: boolean;
  eyebrow?: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-surface p-5", turn ? "border-merah/35 shadow-[0_0_0_3px_var(--color-merah-soft)]" : "border-line", className)}>
      {(turn || eyebrow) && (
        <p className={cn("mb-1 flex items-center gap-2 text-sm font-semibold", turn ? "text-merah" : "text-ink-3")}>
          {turn && <span className="size-1.5 rounded-full bg-merah" aria-hidden />}
          {eyebrow ?? "Giliran Anda"}
        </p>
      )}
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
