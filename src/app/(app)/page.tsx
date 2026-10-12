import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { lama, rupiah, sapaan, tanggalPanjang } from "@/domain/format";
import { totalEstimasi } from "@/domain/rules";
import { AKTIF } from "@/domain/status";
import { ButtonLink } from "@/components/ui/button";
import { Empty, PageHeader, Section } from "@/components/ui/page";
import { PrList } from "@/components/pr/pr-list";
import { getDb } from "@/server/db";
import { canCreate, isApprover } from "@/server/nav";
import { currentStep, waitingFor } from "@/server/service";
import { getViewer } from "@/server/session";
import { toRow } from "@/server/views";

export const metadata: Metadata = { title: "Beranda" };

export default function BerandaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Beranda />
    </Suspense>
  );
}

async function Beranda() {
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const row = (pr: (typeof db.prs)[number]) => toRow(db, pr, now);
  const byUpdate = (a: { updatedAt: string }, b: { updatedAt: string }) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

  const approver = isApprover(viewer);
  const waiting = approver ? waitingFor(db, viewer) : [];

  const mine = db.prs.filter((p) => p.requesterId === viewer.user.id);
  const todo = mine.filter((p) => p.status === "dikembalikan" || p.status === "tiba" || p.status === "draf").sort(byUpdate);
  const running = mine
    .filter((p) => AKTIF.has(p.status) && p.status !== "dikembalikan" && p.status !== "tiba")
    .sort(byUpdate);

  const umum = viewer.roles.has("umum");
  const toBuy = umum ? db.prs.filter((p) => p.status === "disetujui").sort((a, b) => Date.parse(a.neededBy) - Date.parse(b.neededBy)) : [];
  const buying = umum ? db.prs.filter((p) => p.status === "pembelian" && p.purchase?.picId === viewer.user.id) : [];

  const overseer = viewer.roles.has("spi") || viewer.roles.has("kepala");
  const inFlight = db.prs.filter((p) => AKTIF.has(p.status));

  // Judul halaman = hal terpenting hari ini, bukan sapaan.
  let title: string;
  let description: string | undefined;
  if (waiting.length) {
    const oldest = waiting[0]!;
    title = `${waiting.length} PR menunggu Anda`;
    description = `Paling lama: ${oldest.number}, sudah ${lama(currentStep(oldest)!.startedAt!, now)}.`;
  } else if (toBuy.length) {
    title = `${toBuy.length} PR siap dibeli`;
    description = "Urut dari tanggal dibutuhkan paling dekat.";
  } else if (todo.some((p) => p.status !== "draf")) {
    const n = todo.filter((p) => p.status !== "draf").length;
    title = `${n} PR perlu tindakan Anda`;
  } else if (approver || umum) {
    title = "Tidak ada yang menunggu Anda";
    description = "Semua PR di meja Anda sudah ditindaklanjuti.";
  } else {
    title = `Halo, ${sapaan(viewer.user.name)}`;
    description = running.length ? `${running.length} PR Anda sedang berjalan.` : "Belum ada PR yang berjalan.";
  }

  return (
    <>
      <PageHeader
        eyebrow={tanggalPanjang(now.toISOString())}
        title={title}
        description={description}
        actions={
          canCreate(viewer) && (
            <ButtonLink href="/pr/baru" variant="secondary" icon={<Plus />} className="hidden sm:inline-flex lg:hidden">
              Buat PR
            </ButtonLink>
          )
        }
      />

      {approver && (
        <Section
          title="Menunggu Anda"
          count={waiting.length}
          action={waiting.length > 5 ? { href: "/menunggu", label: "Lihat semua" } : undefined}
          flush
        >
          <PrList viewerName={viewer.user.name}
            rows={waiting.slice(0, 5).map(row)}
            now={now}
            empty={<Empty title="Tidak ada antrean">PR baru yang perlu Anda tindak lanjuti akan muncul di sini.</Empty>}
          />
        </Section>
      )}

      {umum && (
        <>
          <Section title="Siap dibeli" count={toBuy.length} action={{ href: "/pembelian", label: "Buka pembelian" }} flush>
            <PrList viewerName={viewer.user.name} rows={toBuy.slice(0, 5).map(row)} now={now} empty={<Empty title="Belum ada PR yang disetujui" />} />
          </Section>
          {buying.length > 0 && (
            <Section title="Sedang Anda proses" count={buying.length} flush>
              <PrList viewerName={viewer.user.name} rows={buying.map(row)} now={now} />
            </Section>
          )}
        </>
      )}

      {todo.length > 0 && (
        <Section title="Perlu tindakan Anda" count={todo.length} flush>
          <PrList viewerName={viewer.user.name} rows={todo.map(row)} now={now} showRequester={false} />
        </Section>
      )}

      {canCreate(viewer) && (running.length > 0 || (!approver && !umum)) && (
        <Section
          title="PR saya yang berjalan"
          count={running.length}
          action={{ href: "/pr", label: "Semua PR saya" }}
          flush
        >
          <PrList viewerName={viewer.user.name}
            rows={running.map(row)}
            now={now}
            showRequester={false}
            empty={
              <Empty title="Belum ada PR yang berjalan">
                Butuh barang atau jasa? Buat PR, dan pantau di sini sampai barangnya Anda terima.
              </Empty>
            }
          />
        </Section>
      )}

      {overseer && (
        <Section title="Sedang berjalan di semua unit" count={inFlight.length} action={{ href: "/laporan", label: "Buka laporan" }} flush>
          <p className="border-b border-line px-5 py-3 text-sm text-ink-3">
            Nilai total {rupiah(inFlight.reduce((s, p) => s + totalEstimasi(p.items), 0))}
          </p>
          <PrList viewerName={viewer.user.name} rows={inFlight.sort(byUpdate).slice(0, 6).map(row)} now={now} />
        </Section>
      )}

      {viewer.roles.has("admin") && !canCreate(viewer) && (
        <Section title="Data induk" action={{ href: "/pengaturan", label: "Buka" }}>
          <p className="text-ink-2">
            {db.users.length} pegawai, {db.units.length} unit, {db.positions.length} jabatan, {db.budgetLines.length} pos RKA.
            Admin sistem mengelola akun dan data induk, tidak menyetujui PR.
          </p>
        </Section>
      )}
    </>
  );
}
