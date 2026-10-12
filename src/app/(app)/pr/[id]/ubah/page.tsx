import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tanggalWita } from "@/domain/format";
import { PageHeader } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PrForm } from "@/components/pr/pr-form";
import { getDb } from "@/server/db";
import { lineOptions, recentOf, routeInfo, valuesFrom } from "@/server/form-data";
import { getViewer } from "@/server/session";
import { userName } from "@/server/views";

export const metadata: Metadata = { title: "Ubah PR" };

export default function UbahPrPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UbahPr params={params} />
    </Suspense>
  );
}

async function UbahPr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const pr = db.prs.find((p) => p.id === id && p.requesterId === viewer.user.id);
  if (!pr) notFound();
  if (pr.status !== "draf" && pr.status !== "dikembalikan") redirect(`/pr/${pr.id}`);

  const back = [...pr.steps].reverse().find((s) => s.action === "kembalikan");
  const revisi = pr.status === "dikembalikan";

  return (
    <>
      <div className="max-w-3xl">
        <PageHeader
          back={{ href: revisi ? `/pr/${pr.id}` : "/pr?tab=draf", label: revisi ? "Kembali ke PR" : "Draf saya" }}
          eyebrow={pr.number}
          title={revisi ? "Revisi PR" : "Lanjutkan draf"}
          description={revisi ? "Nomor PR tetap. Setelah diajukan ulang, alur mulai lagi dari tahap Diketahui." : undefined}
        />
      </div>
      <PrForm
        prId={pr.id}
        mode={revisi ? "revisi" : "draf"}
        initial={valuesFrom(pr, true)}
        today={tanggalWita(now.toISOString())}
        lines={lineOptions(db, viewer, now)}
        route={routeInfo(db, viewer, now)}
        recent={recentOf(db, viewer)}
        returnNote={revisi && back?.note ? { by: `${userName(db, back.actorId ?? "")}, ${back.actorTitle}`, note: back.note } : undefined}
      />
    </>
  );
}
