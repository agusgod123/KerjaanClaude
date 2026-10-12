import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { persen, rupiah, rupiahRingkas } from "@/domain/format";
import { bulanTahunWita, judulPr, totalEstimasi, totalRealisasi } from "@/domain/rules";
import { PageHeader, Section, Empty } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { getDb } from "@/server/db";
import { getViewer } from "@/server/session";
import { budgetRows, type BudgetRow } from "@/server/views";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Anggaran" };

export default function AnggaranPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Anggaran />
    </Suspense>
  );
}

function MiniMeter({ row }: { row: BudgetRow }) {
  const pct = (v: number) => (row.pagu ? Math.min(100, (v / row.pagu) * 100) : 0);
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
      {row.realisasi > 0 && <span className="h-full bg-meter-1" style={{ width: `${pct(row.realisasi)}%` }} />}
      {row.terikat > 0 && <span className="h-full bg-meter-2" style={{ width: `${pct(row.terikat)}%` }} />}
    </div>
  );
}

async function Anggaran() {
  const viewer = await getViewer();
  const r = viewer.roles;
  if (!(r.has("atasan") || r.has("verifikator") || r.has("sekretaris") || r.has("kepala") || r.has("spi"))) notFound();
  const db = getDb();
  const now = new Date();
  const { year } = bulanTahunWita(now);
  const rows = budgetRows(db, year);
  const sum = (k: "pagu" | "realisasi" | "terikat" | "sisa" | "dalamProses") => rows.reduce((s, x) => s + x[k], 0);
  const units = [...new Set(rows.map((x) => x.unitName))];
  const special = db.prs.filter((p) => p.specialBudget && !["ditolak", "dibatalkan"].includes(p.status));
  const terpakai = sum("realisasi") + sum("terikat");

  return (
    <>
      <PageHeader
        eyebrow={`Tahun anggaran ${year}`}
        title="Anggaran"
        description="Sisa pagu = pagu − disetujui belum dibeli − sudah dibeli. PR yang masih menunggu persetujuan belum memotong pagu."
      />

      <dl className="mb-8 grid gap-3 sm:grid-cols-3">
        <Tile label="Total pagu" value={rupiahRingkas(sum("pagu"))} detail={`${rows.length} pos RKA`} />
        <Tile label="Terpakai" value={rupiahRingkas(terpakai)} detail={`${persen(terpakai / sum("pagu"))} dari pagu`} />
        <Tile label="Sisa" value={rupiahRingkas(sum("sisa"))} detail={`${rupiahRingkas(sum("dalamProses"))} sedang menunggu persetujuan`} />
      </dl>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-meter-1" /> Sudah dibeli
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-meter-2" /> Disetujui, belum dibeli
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-sunken ring-1 ring-line-strong ring-inset" /> Sisa
        </span>
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-left">
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-line text-sm text-ink-3">
              <th className="py-2.5 pl-5 font-medium">Pos RKA</th>
              <th className="w-44 py-2.5 pr-4 font-medium">Pemakaian</th>
              <th className="py-2.5 pr-4 text-right font-medium">Pagu</th>
              <th className="py-2.5 pr-4 text-right font-medium">Sudah dibeli</th>
              <th className="py-2.5 pr-4 text-right font-medium">Terikat</th>
              <th className="py-2.5 pr-5 text-right font-medium">Sisa</th>
            </tr>
          </thead>
          {units.map((unit) => (
            <tbody key={unit} className="border-b border-line last:border-0">
              <tr>
                <th colSpan={6} className="bg-paper/60 px-5 py-2 text-sm font-semibold text-ink-2">
                  {unit}
                </th>
              </tr>
              {rows
                .filter((x) => x.unitName === unit)
                .map((x) => {
                  const low = x.sisa < x.pagu * 0.15;
                  return (
                    <tr key={x.line.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-line px-5 py-3 md:table-row md:px-0 md:py-0">
                      <td className="md:py-3 md:pl-5">
                        <p className="font-semibold">{x.line.name}</p>
                        <p className="text-sm text-ink-3 tabular">{x.line.code}</p>
                      </td>
                      <td className="col-span-2 row-start-2 md:py-3 md:pr-4">
                        <MiniMeter row={x} />
                        <p className="mt-1 text-xs text-ink-3 md:hidden">
                          Pagu {rupiah(x.pagu)} · dibeli {rupiah(x.realisasi)} · terikat {rupiah(x.terikat)}
                        </p>
                      </td>
                      <td className="hidden py-3 pr-4 text-right tabular md:table-cell">{rupiah(x.pagu)}</td>
                      <td className="hidden py-3 pr-4 text-right text-ink-2 tabular md:table-cell">{rupiah(x.realisasi)}</td>
                      <td className="hidden py-3 pr-4 text-right text-ink-2 tabular md:table-cell">{rupiah(x.terikat)}</td>
                      <td className={cn("col-start-2 row-start-1 text-right font-semibold tabular md:py-3 md:pr-5", low && "text-merah")}>
                        {rupiah(x.sisa)}
                        {low && <span className="block text-xs font-medium">Sisa di bawah 15%</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          ))}
        </table>
      </div>

      <Section title="Anggaran khusus" count={special.length} flush>
        {special.length === 0 ? (
          <Empty title="Belum ada PR dengan anggaran khusus" />
        ) : (
          <ul className="divide-y divide-line">
            {special.map((p) => (
              <li key={p.id}>
                <Link href={`/pr/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper/70">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{judulPr(p.items)}</p>
                    <p className="text-sm text-ink-3 tabular">{p.number} · {db.units.find((u) => u.id === p.unitId)?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={p.status} />
                    <span className="font-semibold tabular">{rupiah(p.purchase?.recordedAt ? totalRealisasi(p.items) : totalEstimasi(p.items))}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight">{value}</dd>
      <dd className="mt-0.5 text-sm text-ink-3">{detail}</dd>
    </div>
  );
}
