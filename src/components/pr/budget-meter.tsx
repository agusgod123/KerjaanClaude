import { rupiah } from "@/domain/format";
import { cn } from "@/lib/cn";

export interface MeterData {
  pagu: number;
  realisasi: number;
  terikat: number;
}

/**
 * Meter pagu: satu rona (gelap = sudah dibeli, sedang = terikat), PR yang
 * sedang diperiksa ditonjolkan merah. Setiap nilai juga ditulis sebagai
 * angka, jadi warna tidak pernah menjadi satu-satunya cara membaca.
 */
export function BudgetMeter({ data, thisPr, className }: { data: MeterData; thisPr?: number; className?: string }) {
  const { pagu, realisasi, terikat } = data;
  const sisa = pagu - realisasi - terikat;
  const after = thisPr !== undefined ? sisa - thisPr : sisa;
  const pct = (v: number) => (pagu > 0 ? Math.max(0, Math.min(100, (v / pagu) * 100)) : 0);
  const segs = [
    { key: "realisasi", value: realisasi, cls: "bg-meter-1", label: "Sudah dibeli" },
    { key: "terikat", value: terikat, cls: "bg-meter-2", label: "Disetujui, belum dibeli" },
    ...(thisPr !== undefined ? [{ key: "ini", value: Math.min(thisPr, Math.max(0, sisa)), cls: "bg-merah", label: "PR ini" }] : []),
  ].filter((s) => s.value > 0);

  return (
    <div className={className}>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`Pagu ${rupiah(pagu)}, sisa ${rupiah(after)}`}>
        {segs.map((s) => (
          <span key={s.key} className={cn("h-full first:rounded-l-full", s.cls)} style={{ width: `${pct(s.value)}%` }} title={`${s.label}: ${rupiah(s.value)}`} />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-sm">
        <Row swatch="bg-meter-1" label="Sudah dibeli" value={realisasi} />
        <Row swatch="bg-meter-2" label="Disetujui, belum dibeli" value={terikat} />
        {thisPr !== undefined && <Row swatch="bg-merah" label="PR ini" value={thisPr} />}
        <dt className="col-span-2 mt-1 border-t border-line pt-2 font-semibold text-ink">
          {thisPr !== undefined ? "Sisa setelah PR ini" : "Sisa pagu"}
        </dt>
        <dd className={cn("mt-1 border-t border-line pt-2 text-right font-bold tabular", after < 0 ? "text-merah" : "text-ink")}>
          {rupiah(after)}
        </dd>
        <dt className="col-span-2 text-ink-3">dari pagu</dt>
        <dd className="text-right text-ink-3 tabular">{rupiah(pagu)}</dd>
      </dl>
    </div>
  );
}

function Row({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <>
      <span className={cn("size-2.5 rounded-sm", swatch)} aria-hidden />
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right text-ink-2 tabular">{rupiah(value)}</dd>
    </>
  );
}
