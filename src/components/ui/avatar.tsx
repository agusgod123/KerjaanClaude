import { inisial } from "@/domain/format";
import { cn } from "@/lib/cn";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold text-ink-2 ring-1 ring-line ring-inset",
        className,
      )}
    >
      {inisial(name)}
    </span>
  );
}
