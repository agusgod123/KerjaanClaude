import { cn } from "@/lib/cn";

/**
 * Tanda tridatu: dasar hitam dengan dua helai benang, merah dan putih,
 * dipilin miring. Sederhana supaya tetap terbaca di ukuran ikon tab.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--color-ink)" />
      <path d="M12.25 7h4.5l-4 18h-4.5z" fill="var(--color-merah)" />
      <path d="M19.25 7h4.5l-4 18h-4.5z" fill="var(--color-paper)" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark className={compact ? "size-7" : undefined} />
      <span className="flex flex-col leading-tight">
        <span className="text-md font-bold tracking-tight text-ink">Pengadaan</span>
        {!compact && <span className="text-xs text-ink-3">Pengajuan barang dan jasa</span>}
      </span>
    </span>
  );
}
