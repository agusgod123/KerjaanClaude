import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { angka, rupiah, tanggal, tanggalJam } from "@/domain/format";
import { subtotal, totalEstimasi } from "@/domain/rules";
import { Mark } from "@/components/shell/logo";
import { buttonClass } from "@/components/ui/button";
import { signatures } from "@/server/approvals";
import { getDb } from "@/server/db";
import { canView } from "@/server/org";
import { getViewer } from "@/server/session";
import { userName } from "@/server/views";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Cetak PR" };

type Props = { params: Promise<{ id: string }> };

/**
 * Tata letak mengikuti formulir Permohonan Pemesanan Barang yang sudah dikenal.
 * Versi ini dicetak dari browser; PDF server dengan hash SHA-256 menyusul.
 */
export default function CetakPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <Cetak {...props} />
    </Suspense>
  );
}

const cell = "border border-ink/70 px-2 py-1.5 align-top";

async function Cetak({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const pr = db.prs.find((p) => p.id === id);
  if (!pr || !canView(viewer, pr, db) || !pr.verifyCode) notFound();

  const h = await headers();
  const base = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const verifyUrl = `${base}/v/${pr.verifyCode}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, color: { dark: "#1f1b17", light: "#ffffff" } });
  const requester = db.users.find((u) => u.id === pr.requesterId)!;
  const unit = db.units.find((u) => u.id === pr.unitId)!;
  const line = db.budgetLines.find((l) => l.id === pr.budgetLineId);
  const org = process.env.ORG_NAME;

  return (
    <div className="min-h-dvh py-6 print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link href={`/pr/${pr.id}`} className={buttonClass("ghost", "md")}>
          Kembali ke PR
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-[14mm] text-[12.5px] leading-snug text-ink shadow-overlay print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-3">
          <div className="flex items-center gap-3">
            <Mark className="size-10" />
            <div>
              {org && <p className="font-bold uppercase">{org}</p>}
              <p className="text-ink-2">Aplikasi Pengadaan</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[15px] font-bold tracking-wide uppercase">Permohonan Pemesanan Barang</h1>
            <p className="mt-1 tabular">No. PR: <b>{pr.number}</b></p>
            <p className="tabular">Tanggal PR: {pr.submittedAt ? tanggal(pr.submittedAt) : "—"}</p>
          </div>
        </header>

        <table className="mt-4 w-full border-collapse">
          <tbody>
            <tr>
              <td className={`${cell} w-[22%] bg-sunken/60`}>Nama</td>
              <td className={`${cell} w-[28%]`}>{requester.name}</td>
              <td className={`${cell} w-[22%] bg-sunken/60`}>Departemen / Bagian</td>
              <td className={cell}>{unit.name}</td>
            </tr>
            <tr>
              <td className={`${cell} bg-sunken/60`}>NIP / ID pegawai</td>
              <td className={`${cell} tabular`}>{requester.nip}</td>
              <td className={`${cell} bg-sunken/60`}>Tanggal dibutuhkan</td>
              <td className={cell}>{tanggal(pr.neededBy)}</td>
            </tr>
            <tr>
              <td className={`${cell} bg-sunken/60`}>Pos pencatatan RKA</td>
              <td className={cell} colSpan={3}>
                {pr.specialBudget ? "Anggaran khusus" : line ? `${line.code} · ${line.name}` : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="bg-sunken/60 text-left">
              <th className={`${cell} w-8 text-center`}>No</th>
              <th className={cell}>Deskripsi barang / jasa</th>
              <th className={`${cell} text-right`}>Jumlah</th>
              <th className={`${cell} text-right`}>Harga satuan</th>
              <th className={`${cell} text-right`}>Estimasi harga</th>
              <th className={`${cell} w-[26%]`}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {pr.items.map((it, i) => (
              <tr key={it.id}>
                <td className={`${cell} text-center tabular`}>{i + 1}</td>
                <td className={cell}>
                  {it.description}
                  <span className="block text-[11px] text-ink-3">{it.kind === "jasa" ? "Jasa" : "Barang"}</span>
                </td>
                <td className={`${cell} text-right whitespace-nowrap tabular`}>
                  {angka(it.qty)} {it.unit}
                </td>
                <td className={`${cell} text-right whitespace-nowrap tabular`}>{rupiah(it.unitPrice)}</td>
                <td className={`${cell} text-right whitespace-nowrap tabular`}>{rupiah(subtotal(it))}</td>
                <td className={cell}>{it.reason}</td>
              </tr>
            ))}
            <tr>
              <td className={`${cell} text-right font-bold`} colSpan={4}>
                Total
              </td>
              <td className={`${cell} text-right font-bold whitespace-nowrap tabular`}>{rupiah(totalEstimasi(pr.items))}</td>
              <td className={cell} />
            </tr>
          </tbody>
        </table>

        {pr.note && (
          <p className="mt-3">
            <b>Catatan:</b> {pr.note}
          </p>
        )}

        <table className="mt-5 w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-sunken/60">
              {signatures(db, pr).map((s) => (
                <th key={s.label} className={`${cell} text-center`}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {signatures(db, pr).map((s) => (
                <td key={s.label} className={`${cell} h-28 text-center`}>
                  {s.skipped ? (
                    <p className="pt-6 text-ink-2">Dilewati: pemohon adalah kepala unit</p>
                  ) : s.name ? (
                    <>
                      <p className="text-[10.5px] tracking-wide text-jalan uppercase">Disetujui elektronik</p>
                      <p className="mt-3 font-bold">{s.name}</p>
                      <p className="text-ink-2">{s.title}</p>
                      {s.at && <p className="mt-1 text-[11px] text-ink-3 tabular">{tanggalJam(s.at)} WITA</p>}
                    </>
                  ) : (
                    <p className="pt-6 text-ink-3">—</p>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <footer className="mt-5 flex items-center gap-4 border-t border-line pt-4">
          <div className="size-24 shrink-0 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="text-[11.5px] text-ink-2">
            <p className="font-semibold text-ink">Pindai untuk memeriksa keaslian</p>
            <p className="break-all tabular">{verifyUrl}</p>
            <p className="mt-2">
              Persetujuan di atas dilakukan secara elektronik dan tercatat beserta waktunya. Dicetak oleh {userName(db, viewer.user.id)} pada{" "}
              {tanggalJam(new Date().toISOString())} WITA.
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
}
