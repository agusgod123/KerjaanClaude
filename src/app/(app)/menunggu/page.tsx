import type { Metadata } from "next";
import { Suspense } from "react";
import { Empty, PageHeader, Tabs } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PrList } from "@/components/pr/pr-list";
import { getDb } from "@/server/db";
import { currentStep, waitingFor } from "@/server/service";
import { getViewer } from "@/server/session";
import { toRow } from "@/server/views";

export const metadata: Metadata = { title: "Menunggu saya" };

type Props = { searchParams: Promise<{ tahap?: string }> };

export default function MenungguPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Menunggu {...props} />
    </Suspense>
  );
}

const TAHAP = [
  { key: "semua", label: "Semua" },
  { key: "diketahui", label: "Diketahui" },
  { key: "verifikasi", label: "Verifikasi" },
  { key: "persetujuan", label: "Persetujuan" },
] as const;

async function Menunggu({ searchParams }: Props) {
  const { tahap = "semua" } = await searchParams;
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const all = waitingFor(db, viewer);
  const count = (k: string) => (k === "semua" ? all.length : all.filter((p) => currentStep(p)?.kind === k).length);
  const tabs = TAHAP.filter((t) => t.key === "semua" || count(t.key) > 0 || t.key === tahap);
  const shown = tahap === "semua" ? all : all.filter((p) => currentStep(p)?.kind === tahap);

  return (
    <>
      <PageHeader
        title="Menunggu saya"
        description="Urut dari yang paling lama menunggu. Waktu merah berarti sudah 2 hari kerja atau lebih di meja Anda."
      />
      {tabs.length > 2 && (
        <Tabs
          current={tahap}
          tabs={tabs.map((t) => ({ key: t.key, label: t.label, count: count(t.key), href: t.key === "semua" ? "/menunggu" : `/menunggu?tahap=${t.key}` }))}
        />
      )}
      <div className="rounded-xl border border-line bg-surface">
        <PrList viewerName={viewer.user.name}
          rows={shown.map((p) => toRow(db, p, now))}
          now={now}
          empty={<Empty title="Tidak ada yang menunggu Anda">PR yang perlu Anda ketahui, verifikasi, atau setujui akan muncul di sini, dan Anda diberi tahu lewat notifikasi.</Empty>}
        />
      </div>
    </>
  );
}
