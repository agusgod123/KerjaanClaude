import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { desimal, persen, rupiah, rupiahRingkas, tanggal } from "@/domain/format";
import { bulanTahunWita, judulPr } from "@/domain/rules";
import { buttonClass } from "@/components/ui/button";
import { Empty, PageHeader } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { PrList } from "@/components/pr/pr-list";
import { getDb } from "@/server/db";
import { canReport, filterPrs, firstSubmit, nilai, stats, STATUS_GROUPS, type ReportFilter } from "@/server/report";
import { getViewer } from "@/server/session";
import { toRow } from "@/server/views";
import { cn } from "@/lib/cn";
import { ReportFilters } from "./filters";

export const metadata: Metadata = { title: "Laporan" };

type Props = { searchParams: Promise<ReportFilter> };

export default function LaporanPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Laporan {...props} />
    </Suspense>
  );
}

const TARGET_HARI = 3;

async function Laporan({ searchParams }: Props) {
  const viewer = await getViewer();
  if (!canReport(viewer)) notFound();
  const db = getDb();
  const now = new Date();
  const filter = await searchParams;
  const prs = filterPrs(db, filter);
  const s = stats(prs);
  const { year } = bulanTahunWita(now);
  const query = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();
  const maxStage = Math.max(1, ...s.stage.map((x) => x.avg ?? 0));

  return (
    <>
      <PageHeader
        title="Laporan"
        description={viewer.roles.has("spi") ? "Akses baca penuh untuk SPI: semua PR, jejak waktu, dan ekspor." : "Semua PR yang sudah diajukan, dengan jejak waktu setiap tahap."}
        actions={
          <a href={`/laporan/ekspor${query ? `?${query}` : ""}`} className={buttonClass("secondary", "md")}>
            <Download /> Ekspor Excel
          </a>
        }
      />

      <ReportFilters
        options={{
          statuses: Object.entries(STATUS_GROUPS).map(([key, g]) => ({ key, label: g.label })),
          units: db.units.filter((u) => db.prs.some((p) => p.unitId === u.id)).map((u) => ({ id: u.id, name: u.name })),
          lines: db.budgetLines.filter((l) => l.year === year).map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` })),
        }}
      />

      <dl className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="PR diajukan" value={String(s.count)} detail={`Nilai ${rupiahRingkas(s.total)}`} />
        <Tile
          label="Median sampai disetujui"
          value={s.medianToApproval === undefined ? "—" : `${desimal(s.medianToApproval)} hari kerja`}
          detail={`Target ≤ ${TARGET_HARI} hari kerja · ${s.approvedCount} PR`}
          warn={s.medianToApproval !== undefined && s.medianToApproval > TARGET_HARI}
        />
        <Tile
          label="Tertaut pos RKA"
          value={s.linkedShare === undefined ? "—" : persen(s.linkedShare)}
          detail={`Termasuk anggaran khusus · target ≥ 95%`}
          warn={s.linkedShare !== undefined && s.linkedShare < 0.95}
        />
        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          <dt className="text-sm text-ink-3">Rata-rata lama per tahap</dt>
          <dd className="mt-2 space-y-2">
            {s.stage.map((x) => (
              <div key={x.kind} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
                <span className="text-ink-2">{x.label}</span>
                <span className="h-2 rounded-full bg-sunken">
                  <span
                    className="block h-full rounded-full bg-meter-1"
                    style={{ width: `${((x.avg ?? 0) / maxStage) * 100}%` }}
                    title={x.avg === undefined ? "Belum ada data" : `${desimal(x.avg)} hari kerja dari ${x.n} tindakan`}
                  />
                </span>
                <span className="font-semibold tabular">{x.avg === undefined ? "—" : `${desimal(x.avg)} hr`}</span>
              </div>
            ))}
          </dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {prs.length === 0 ? (
          <Empty title="Tidak ada PR yang cocok">Ubah atau hapus saringan.</Empty>
        ) : (
          <>
            <div className="md:hidden">
              <PrList viewerName={viewer.user.name} rows={prs.map((p) => toRow(db, p, now))} now={now} />
            </div>
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-line text-sm text-ink-3">
                  <th className="py-2.5 pl-5 font-medium">Nomor</th>
                  <th className="py-2.5 pr-4 font-medium">PR</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 pr-4 font-medium">Pos RKA</th>
                  <th className="py-2.5 pr-4 font-medium">Diajukan</th>
                  <th className="py-2.5 pr-5 text-right font-medium">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {prs.map((p) => {
                  const line = db.budgetLines.find((l) => l.id === p.budgetLineId);
                  return (
                    <tr key={p.id} className="hover:bg-paper/70">
                      <td className="py-3 pr-4 pl-5 text-sm whitespace-nowrap tabular">
                        <Link href={`/pr/${p.id}`} className="font-semibold underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {p.number}
                        </Link>
                      </td>
                      <td className="max-w-72 py-3 pr-4">
                        <p className="truncate">{judulPr(p.items)}</p>
                        <p className="truncate text-sm text-ink-3">{db.units.find((u) => u.id === p.unitId)?.name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="py-3 pr-4 text-sm text-ink-2">{p.specialBudget ? "Anggaran khusus" : line ? line.code : <span className="text-ink-3">—</span>}</td>
                      <td className="py-3 pr-4 text-sm whitespace-nowrap text-ink-2 tabular">{tanggal(firstSubmit(p))}</td>
                      <td className="py-3 pr-5 text-right font-semibold whitespace-nowrap tabular">{rupiah(nilai(p))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}

function Tile({ label, value, detail, warn }: { label: string; value: string; detail: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className={cn("mt-1 text-2xl font-bold tracking-tight", warn && "text-merah")}>{value}</dd>
      <dd className="mt-0.5 text-sm text-ink-3">{detail}</dd>
    </div>
  );
}
