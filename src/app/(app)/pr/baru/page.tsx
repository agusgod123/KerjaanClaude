import type { Metadata } from "next";
import { Suspense } from "react";
import { tanggalWita } from "@/domain/format";
import { PageHeader } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { blankItem } from "@/components/pr/form-model";
import { PrForm } from "@/components/pr/pr-form";
import { getDb } from "@/server/db";
import { lineOptions, recentOf, routeInfo, valuesFrom } from "@/server/form-data";
import { getViewer } from "@/server/session";

export const metadata: Metadata = { title: "Buat PR" };

export default function BuatPrPage({ searchParams }: { searchParams: Promise<{ salin?: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BuatPr searchParams={searchParams} />
    </Suspense>
  );
}

async function BuatPr({ searchParams }: { searchParams: Promise<{ salin?: string }> }) {
  const { salin } = await searchParams;
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const source = salin ? db.prs.find((p) => p.id === salin && p.requesterId === viewer.user.id) : undefined;
  const initial = source
    ? valuesFrom(source, false)
    : { items: [blankItem()], neededBy: "", budgetLineId: "", note: "" };

  return (
    <>
      <div className="max-w-3xl">
        <PageHeader
          back={{ href: "/", label: "Beranda" }}
          title="Buat PR"
          description={
            source
              ? `Disalin dari ${source.number}. Periksa jumlah, harga, dan tanggal dibutuhkan.`
              : `Untuk ${viewer.unit.name}. Isian tersimpan otomatis di perangkat ini sampai diajukan.`
          }
        />
      </div>
      <PrForm
        key={salin ?? "baru"}
        mode="baru"
        initial={initial}
        today={tanggalWita(now.toISOString())}
        lines={lineOptions(db, viewer, now)}
        route={routeInfo(db, viewer, now)}
        recent={recentOf(db, viewer)}
      />
    </>
  );
}
