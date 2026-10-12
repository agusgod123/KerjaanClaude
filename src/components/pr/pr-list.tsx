import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { hariKerja, lama, rupiah, tanggal, tenggat, selisihHari } from "@/domain/format";
import { MENUNGGU_PERSETUJUAN } from "@/domain/status";
import { StatusPill, Track } from "@/components/ui/status";
import type { PrRow } from "@/server/views";
import { cn } from "@/lib/cn";

/** Lebih dari 2 hari kerja di satu meja dianggap terlambat (target total ≤ 3 hari kerja). */
export function isLate(row: PrRow, now: Date): boolean {
  return Boolean(row.desk?.since && MENUNGGU_PERSETUJUAN.has(row.status) && hariKerja(row.desk.since, now.toISOString()) >= 2);
}

export function PrRowItem({ row, now, showRequester = true, viewerName }: { row: PrRow; now: Date; showRequester?: boolean; viewerName?: string }) {
  const yours = Boolean(viewerName && row.desk?.who.split(", ").includes(viewerName));
  const late = isLate(row, now);
  const dueSoon = !["selesai", "ditolak", "dibatalkan", "tiba"].includes(row.status) && selisihHari(row.neededBy, now) <= 2;
  return (
    <li>
      <Link
        href={row.status === "draf" ? `/pr/${row.id}/ubah` : `/pr/${row.id}`}
        className="group grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-paper/70 sm:px-5 md:grid-cols-[minmax(0,1fr)_15rem_9rem_1rem] md:items-center"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 truncate text-sm text-ink-3">
            <span className="tabular">{row.number ?? "Belum bernomor"}</span>
            <span aria-hidden> · </span>
            {showRequester ? `${row.requesterName}, ${row.unitName}` : row.unitName}
          </p>
        </div>

        <div className="col-start-2 row-start-1 text-right md:col-start-3">
          <p className="font-semibold text-ink tabular">{rupiah(row.total)}</p>
          <p className={cn("mt-0.5 text-sm", dueSoon ? "font-medium text-tunggu" : "text-ink-3")}>
            {row.status === "selesai" ? "Selesai" : `Perlu ${tenggat(row.neededBy, now)}`}
          </p>
        </div>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:col-span-1 md:col-start-2 md:row-start-1 md:flex-col md:items-start">
          <div className="flex items-center gap-2.5">
            <Track states={row.track} />
            <StatusPill status={row.status} />
          </div>
          {row.desk ? (
            <p className="min-w-0 truncate text-sm text-ink-3">
              {yours ? <span className="font-semibold text-ink-2">Giliran Anda</span> : row.desk.who}
              {row.desk.since && (
                <span className={cn(late && "font-semibold text-merah")}>
                  {" "}
                  · {lama(row.desk.since, now)}
                </span>
              )}
            </p>
          ) : row.specialBudget ? (
            <p className="text-sm text-ink-3">Anggaran khusus</p>
          ) : row.submittedAt ? (
            <p className="text-sm text-ink-3">Diajukan {tanggal(row.submittedAt)}</p>
          ) : (
            <p className="text-sm text-ink-3">Diubah {tanggal(row.updatedAt)}</p>
          )}
        </div>

        <ChevronRight className="hidden size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 md:block" aria-hidden />
      </Link>
    </li>
  );
}

export function PrList({
  rows,
  now,
  showRequester,
  empty,
  viewerName,
}: {
  rows: PrRow[];
  now: Date;
  showRequester?: boolean;
  empty?: React.ReactNode;
  /** Bila pemegang meja adalah pengguna ini, tampil "Giliran Anda" */
  viewerName?: string;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <PrRowItem key={r.id} row={r} now={now} showRequester={showRequester} viewerName={viewerName} />
      ))}
    </ul>
  );
}
