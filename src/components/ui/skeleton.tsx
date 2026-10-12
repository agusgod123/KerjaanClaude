/** Kerangka saat memuat: bentuknya mengikuti halaman daftar, tanpa kedip berlebihan. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat" className="animate-pulse">
      <div className="mb-2 h-4 w-32 rounded bg-sunken" />
      <div className="mb-8 h-8 w-64 max-w-full rounded bg-sunken" />
      <div className="rounded-xl border border-line bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-sunken" />
              <div className="h-3 w-1/3 rounded bg-sunken" />
            </div>
            <div className="h-4 w-24 rounded bg-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
