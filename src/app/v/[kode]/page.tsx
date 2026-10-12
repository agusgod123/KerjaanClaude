import type { Metadata } from "next";
import { connection } from "next/server";
import { BadgeCheck, CircleHelp } from "lucide-react";
import { Suspense } from "react";
import { rupiah, tanggalJam } from "@/domain/format";
import { totalEstimasi } from "@/domain/rules";
import { STATUS } from "@/domain/status";
import { Mark } from "@/components/shell/logo";
import { signatures } from "@/server/approvals";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Verifikasi PR", robots: { index: false } };

type Props = { params: Promise<{ kode: string }> };

/** Halaman publik dari QR di PDF. Hanya data seperlunya untuk mencocokkan dokumen. */
export default function VerifikasiPage(props: Props) {
  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-2.5">
          <Mark className="size-7" />
          <span className="font-bold">Pengadaan</span>
          <span className="text-ink-3">· Verifikasi dokumen</span>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-line bg-surface" />}>
          <Hasil {...props} />
        </Suspense>
      </div>
    </div>
  );
}

async function Hasil({ params }: Props) {
  await connection();
  const { kode } = await params;
  const db = getDb();
  const pr = db.prs.find((p) => p.verifyCode === kode);

  if (!pr) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <CircleHelp className="size-8 text-ink-3" />
        <h1 className="mt-4 text-xl font-bold">Kode tidak dikenal</h1>
        <p className="mt-2 text-ink-2">
          Tidak ada PR dengan kode <span className="font-semibold">{kode}</span>. Dokumen ini mungkin bukan terbitan aplikasi, atau kodenya salah ketik.
        </p>
      </div>
    );
  }

  const unit = db.units.find((u) => u.id === pr.unitId);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="bg-jalan-soft px-6 py-5 text-jalan">
        <BadgeCheck className="size-8" />
        <h1 className="mt-3 text-xl font-bold">PR ini sah dan tercatat</h1>
        <p className="mt-1">Cocokkan nomor, nilai, dan nama penyetuju dengan dokumen yang Anda pegang.</p>
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2.5 px-6 py-5">
        <dt className="text-ink-3">Nomor PR</dt>
        <dd className="font-semibold tabular">{pr.number}</dd>
        <dt className="text-ink-3">Unit</dt>
        <dd>{unit?.name}</dd>
        <dt className="text-ink-3">Nilai estimasi</dt>
        <dd className="font-semibold tabular">
          {rupiah(totalEstimasi(pr.items))} <span className="font-normal text-ink-3">· {pr.items.length} item</span>
        </dd>
        <dt className="text-ink-3">Status kini</dt>
        <dd>{STATUS[pr.status].label}</dd>
      </dl>
      <div className="border-t border-line px-6 py-5">
        <h2 className="mb-3 font-bold">Persetujuan elektronik</h2>
        <ol className="space-y-3">
          {signatures(db, pr).map((s) => (
            <li key={s.label} className="grid grid-cols-[6.5rem_1fr] gap-4">
              <span className="text-sm text-ink-3">{s.label}</span>
              <span>
                {s.skipped ? (
                  <span className="text-ink-2">Dilewati, pemohon kepala unit</span>
                ) : s.name ? (
                  <>
                    <span className="font-semibold">{s.name}</span>
                    <span className="block text-sm text-ink-2">{s.title}</span>
                    {s.at && <span className="block text-sm text-ink-3 tabular">{tanggalJam(s.at)} WITA</span>}
                  </>
                ) : (
                  <span className="text-ink-3">Belum</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
