import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { AKTIF } from "@/domain/status";
import type { PurchaseRequest } from "@/domain/types";
import { ButtonLink } from "@/components/ui/button";
import { Empty, PageHeader, Tabs } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PrList } from "@/components/pr/pr-list";
import { getDb } from "@/server/db";
import { getViewer } from "@/server/session";
import { toRow } from "@/server/views";

export const metadata: Metadata = { title: "PR saya" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default function PrSayaPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrSaya {...props} />
    </Suspense>
  );
}

const TABS: { key: string; label: string; test: (p: PurchaseRequest) => boolean; empty: string }[] = [
  { key: "tindakan", label: "Perlu tindakan", test: (p) => p.status === "dikembalikan" || p.status === "tiba", empty: "Tidak ada PR yang perlu Anda revisi atau konfirmasi." },
  { key: "berjalan", label: "Berjalan", test: (p) => AKTIF.has(p.status) && p.status !== "dikembalikan" && p.status !== "tiba", empty: "Tidak ada PR yang sedang berjalan." },
  { key: "draf", label: "Draf", test: (p) => p.status === "draf", empty: "Tidak ada draf." },
  { key: "selesai", label: "Selesai", test: (p) => ["selesai", "ditolak", "dibatalkan"].includes(p.status), empty: "Belum ada PR yang selesai." },
  { key: "semua", label: "Semua", test: () => true, empty: "Anda belum pernah membuat PR." },
];

async function PrSaya({ searchParams }: Props) {
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const mine = db.prs
    .filter((p) => p.requesterId === viewer.user.id)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const { tab: asked } = await searchParams;
  // Tanpa pilihan: buka tab yang menuntut tindakan bila ada, selain itu yang berjalan.
  const fallback = mine.some(TABS[0]!.test) ? "tindakan" : "berjalan";
  const tab = TABS.find((t) => t.key === asked) ?? TABS.find((t) => t.key === fallback)!;
  const rows = mine.filter(tab.test).map((p) => toRow(db, p, now));

  return (
    <>
      <PageHeader
        title="PR saya"
        description="Semua PR yang Anda buat, dari draf sampai barang diterima."
        actions={
          <ButtonLink href="/pr/baru" variant="primary" icon={<Plus />} className="lg:hidden">
            Buat PR
          </ButtonLink>
        }
      />
      <Tabs current={tab.key} tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: mine.filter(t.test).length, href: `/pr?tab=${t.key}` }))} />
      <div className="rounded-xl border border-line bg-surface">
        <PrList viewerName={viewer.user.name} rows={rows} now={now} showRequester={false} empty={<Empty title={tab.empty} />} />
      </div>
    </>
  );
}
