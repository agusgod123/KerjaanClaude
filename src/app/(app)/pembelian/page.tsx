import type { Metadata } from "next";
import { Suspense } from "react";
import type { PurchaseRequest } from "@/domain/types";
import { Empty, PageHeader, Tabs } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PrList } from "@/components/pr/pr-list";
import { getDb } from "@/server/db";
import { getViewer } from "@/server/session";
import { toRow } from "@/server/views";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Pembelian" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default function PembelianPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Pembelian {...props} />
    </Suspense>
  );
}

const TABS: { key: string; label: string; test: (p: PurchaseRequest) => boolean; empty: string }[] = [
  { key: "siap", label: "Siap dibeli", test: (p) => p.status === "disetujui", empty: "Belum ada PR yang disetujui." },
  { key: "proses", label: "Dalam proses", test: (p) => p.status === "pembelian" || (p.status === "persetujuan" && Boolean(p.purchase)), empty: "Tidak ada pembelian yang sedang berjalan." },
  { key: "tiba", label: "Menunggu konfirmasi", test: (p) => p.status === "tiba", empty: "Tidak ada barang yang menunggu konfirmasi pemohon." },
  { key: "selesai", label: "Selesai", test: (p) => p.status === "selesai", empty: "Belum ada pembelian yang selesai." },
];

async function Pembelian({ searchParams }: Props) {
  const viewer = await getViewer();
  if (!viewer.roles.has("umum")) notFound();
  const db = getDb();
  const now = new Date();
  const { tab: asked } = await searchParams;
  const tab = TABS.find((t) => t.key === asked) ?? TABS[0]!;
  const rows = db.prs
    .filter(tab.test)
    .sort((a, b) => (tab.key === "selesai" ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt) : Date.parse(a.neededBy) - Date.parse(b.neededBy)))
    .map((p) => toRow(db, p, now));

  return (
    <>
      <PageHeader title="Pembelian" description="PR yang sudah disetujui, urut dari tanggal dibutuhkan paling dekat. Ambil PR untuk menjadi PIC-nya." />
      <Tabs current={tab.key} tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: db.prs.filter(t.test).length, href: `/pembelian?tab=${t.key}` }))} />
      <div className="rounded-xl border border-line bg-surface">
        <PrList viewerName={viewer.user.name} rows={rows} now={now} empty={<Empty title={tab.empty} />} />
      </div>
    </>
  );
}
