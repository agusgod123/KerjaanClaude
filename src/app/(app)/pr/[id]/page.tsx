import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { lama, rupiah, tanggal, tanggalJam, tanggalWita, tenggat } from "@/domain/format";
import { bulanTahunWita, judulPr, pemakaianPagu, totalEstimasi, totalRealisasi } from "@/domain/rules";
import { STEP_LABEL } from "@/domain/status";
import type { PurchaseRequest } from "@/domain/types";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status";
import { ApprovalPanel, type ApprovalPanelProps } from "@/components/pr/approval-panel";
import { ItemsTable } from "@/components/pr/items";
import { ArrivalForm, PurchaseForm, TakePanel } from "@/components/pr/purchase-panel";
import { CancelButton, DraftPanel, ReceivePanel, ReturnedPanel } from "@/components/pr/requester-panel";
import { Timeline } from "@/components/pr/timeline";
import { JumpToAction } from "@/components/pr/jump-to-action";
import { getDb, type Db } from "@/server/db";
import { buildViewer, canView, holdersOf, holdsPosition, positionByKind, type Viewer } from "@/server/org";
import { canAct, currentStep, isReapproval, validateForSubmit } from "@/server/service";
import { getViewer } from "@/server/session";
import { buildTimeline, HISTORY_LABEL } from "@/server/timeline";
import { deskOf, userName } from "@/server/views";

export const metadata: Metadata = { title: "Detail PR" };

export default function PrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrDetail params={params} />
    </Suspense>
  );
}

async function PrDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const pr = db.prs.find((p) => p.id === id);
  if (!pr || !canView(viewer, pr, db)) notFound();

  const isRequester = pr.requesterId === viewer.user.id;
  const requester = db.users.find((u) => u.id === pr.requesterId)!;
  const requesterTitle =
    pr.history.find((h) => h.actorId === pr.requesterId)?.actorTitle ?? buildViewer(db, pr.requesterId, now)?.title;
  const unit = db.units.find((u) => u.id === pr.unitId)!;
  const desk = deskOf(db, pr, now);
  const estimate = totalEstimasi(pr.items);
  const showRealized = pr.items.some((i) => i.realizedUnitPrice !== undefined);
  const line = db.budgetLines.find((l) => l.id === pr.budgetLineId);
  const panel = actionPanel(db, viewer, pr, now);
  const yourTurn = Boolean(desk?.who.split(", ").includes(viewer.user.name)) || (desk?.who === "Urusan Umum" && viewer.roles.has("umum"));
  const turnLabel = canAct(viewer, pr)
    ? (desk?.label.replace("Menunggu ", "") ?? "tindak lanjut")
    : pr.status === "tiba" && isRequester
      ? "konfirmasi terima"
      : pr.status === "dikembalikan" && isRequester
        ? "revisi"
        : undefined;
  const cancellable = isRequester && ["diketahui", "verifikasi", "persetujuan", "dikembalikan"].includes(pr.status);

  const back = canAct(viewer, pr)
    ? { href: "/menunggu", label: "Menunggu saya" }
    : isRequester
      ? { href: "/pr", label: "PR saya" }
      : viewer.roles.has("umum")
        ? { href: "/pembelian", label: "Pembelian" }
        : { href: "/laporan", label: "Laporan" };

  return (
    <>
      <PageHeader
        back={back}
        eyebrow={<span className="tabular">{pr.number ?? "Draf, belum bernomor"}</span>}
        title={judulPr(pr.items)}
        actions={
          <>
            {cancellable && <CancelButton prId={pr.id} />}
            {pr.verifyCode && (
              <Link href={`/cetak/${pr.id}`} target="_blank" className={buttonClass("secondary", "sm")}>
                <Printer /> Cetak PR
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusPill status={pr.status} />
          {desk && yourTurn ? (
            <p className="font-semibold text-ink">
              Giliran Anda
              {desk.since && <span className="font-normal text-ink-3"> · sudah {lama(desk.since, now)}</span>}
            </p>
          ) : desk && (
            <p className="text-ink-2">
              {desk.label === "Menunggu dibeli" ? "Di Urusan Umum" : <>Di meja {desk.who}</>}
              {desk.role && desk.role !== "Pemohon" && desk.who !== "Urusan Umum" && <span className="text-ink-3">, {desk.role}</span>}
              {desk.since && <span className="text-ink-3"> · sudah {lama(desk.since, now)}</span>}
            </p>
          )}
        </div>
        <p className="text-right">
          <span className="mr-2 text-sm text-ink-3">{showRealized ? "Total harga beli" : "Total"}</span>
          <span className="text-xl font-bold tabular">{rupiah(showRealized ? totalRealisasi(pr.items) : estimate)}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <ItemsTable items={pr.items} showRealized={showRealized} />
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {panel && (
            <div id="aksi" className="scroll-mt-20">
              {panel}
            </div>
          )}
          <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="linimasa">
            <h2 id="linimasa" className="mb-4 font-bold">
              Linimasa
            </h2>
            <Timeline entries={buildTimeline(db, pr, now)} now={now} />
            {pr.history.length > 0 && (
              <details className="group mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Tampilkan riwayat lengkap ({pr.history.length})</span>
                  <span className="hidden group-open:inline">Sembunyikan riwayat lengkap</span>
                </summary>
                <ol className="mt-3 space-y-2.5 text-sm">
                  {pr.history.map((h) => (
                    <li key={h.id} className="grid grid-cols-[7.5rem_1fr] gap-3">
                      <span className="text-ink-3 tabular">{tanggalJam(h.at)}</span>
                      <span className="text-ink-2">
                        <span className="font-semibold text-ink">{HISTORY_LABEL[h.type]}</span> · {userName(db, h.actorId)}
                        <span className="text-ink-3">, {h.actorTitle}</span>
                        {h.note && <span className="block text-ink-3">“{h.note}”</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        </aside>

        <section className="min-w-0 rounded-xl border border-line bg-surface p-5 lg:col-start-1 lg:row-start-2" aria-labelledby="keterangan">
          <h2 id="keterangan" className="mb-3 font-bold">
            Keterangan
          </h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
            <Info label="Pemohon">
              {requester.name}
              {requesterTitle && <span className="text-ink-3">, {requesterTitle}</span>}
            </Info>
            <Info label="Unit">{unit.name}</Info>
            {pr.submittedAt && <Info label="Diajukan">{tanggalJam(pr.submittedAt)} WITA</Info>}
            <Info label="Dibutuhkan">
              {tanggal(pr.neededBy)}
              {!["selesai", "ditolak", "dibatalkan"].includes(pr.status) && <span className="text-ink-3"> · {tenggat(pr.neededBy, now)}</span>}
            </Info>
            <Info label="Sumber dana">
              {pr.specialBudget ? (
                "Anggaran khusus"
              ) : line && pr.verifiedTotal !== undefined ? (
                `${line.code} · ${line.name}`
              ) : line ? (
                <>
                  Usulan pemohon: {line.code} · {line.name}
                  <span className="block text-sm text-ink-3">Ditetapkan Urusan Keuangan saat verifikasi</span>
                </>
              ) : (
                <span className="text-ink-3">Ditetapkan Urusan Keuangan saat verifikasi</span>
              )}
            </Info>
            {pr.note && <Info label="Catatan untuk pembeli">{pr.note}</Info>}
            {pr.verifyCode && (
              <Info label="Kode verifikasi">
                <Link href={`/v/${pr.verifyCode}`} className="font-semibold underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  {pr.verifyCode}
                </Link>
                <span className="block text-sm text-ink-3">Dicetak sebagai QR di PDF. Siapa pun bisa memeriksa keasliannya.</span>
              </Info>
            )}
          </dl>
        </section>
      </div>
      {panel && turnLabel && <JumpToAction label={turnLabel} />}
    </>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-ink-3 sm:pt-0.5">{label}</dt>
      <dd className="-mt-2 text-ink sm:mt-0">{children}</dd>
    </>
  );
}

/** Satu panel aksi sesuai peran dan status. Tidak ada aksi = tidak ada panel. */
function actionPanel(db: Db, viewer: Viewer, pr: PurchaseRequest, now: Date): ReactNode {
  const isRequester = pr.requesterId === viewer.user.id;
  const step = currentStep(pr);

  if (step && canAct(viewer, pr)) {
    const next = pr.steps.find((s) => s.round === pr.round && !s.action && s !== step);
    const estimate = totalEstimasi(pr.items);
    const props: ApprovalPanelProps = {
      prId: pr.id,
      kind: step.kind,
      total: estimate,
      basis: step.basis,
      nextAlsoYou: next && holdsPosition(viewer, next.positionId) ? STEP_LABEL[next.kind] : undefined,
    };
    if (isReapproval(step)) {
      const realized = totalRealisasi(pr.items);
      props.total = realized;
      props.reapproval = { estimate: pr.purchase?.approvedCeiling ?? pr.verifiedTotal ?? estimate, realized, reason: step.basis ?? "" };
    }
    if (step.kind === "verifikasi") {
      const { year } = bulanTahunWita(now);
      props.lines = db.budgetLines
        .filter((l) => l.year === year)
        .map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          unitName: db.units.find((u) => u.id === l.unitId)?.name ?? "",
          mine: l.unitId === pr.unitId,
          ...pemakaianPagu(l, db.prs, pr.id),
        }));
      props.proposedLineId = pr.budgetLineId;
      const names = (kind: "sekretaris" | "kepala_badan") =>
        holdersOf(db, positionByKind(db, kind).id, now).map((u) => u.name).join(", ");
      props.approverNames = { sekretaris: names("sekretaris"), kepala_badan: names("kepala_badan") };
    }
    if (step.kind === "persetujuan" && !props.reapproval) {
      const line = db.budgetLines.find((l) => l.id === pr.budgetLineId);
      props.budget = pr.specialBudget
        ? { special: true }
        : line
          ? { label: `${line.code} · ${line.name}`, data: pemakaianPagu(line, db.prs, pr.id) }
          : undefined;
    }
    return <ApprovalPanel {...props} />;
  }

  if (isRequester) {
    if (pr.status === "draf") return <DraftPanel prId={pr.id} ready={validateForSubmit(pr).length === 0} />;
    if (pr.status === "dikembalikan") {
      const back = [...pr.steps].reverse().find((s) => s.action === "kembalikan");
      return <ReturnedPanel prId={pr.id} by={`${userName(db, back?.actorId ?? "")}, ${back?.actorTitle ?? ""}`} note={back?.note} />;
    }
    if (pr.status === "tiba") {
      return (
        <ReceivePanel
          prId={pr.id}
          arrivedLabel={pr.purchase?.arrivedAt ? tanggalJam(pr.purchase.arrivedAt) : ""}
          items={pr.items.map((i) => ({ id: i.id, description: i.description, qty: i.qty, unit: i.unit, received: i.received }))}
        />
      );
    }
  }

  if (viewer.roles.has("umum")) {
    const buyItems = pr.items.map((i) => ({
      id: i.id,
      description: i.description,
      qty: i.qty,
      unit: i.unit,
      unitPrice: i.unitPrice,
      realizedUnitPrice: i.realizedUnitPrice,
    }));
    if (pr.status === "disetujui") return <TakePanel prId={pr.id} neededBy={`${tanggal(pr.neededBy)} (${tenggat(pr.neededBy, now)})`} />;
    if (pr.status === "pembelian" && pr.purchase?.picId === viewer.user.id) {
      if (!pr.purchase.recordedAt) {
        return (
          <PurchaseForm
            prId={pr.id}
            items={buyItems}
            estimate={pr.verifiedTotal ?? totalEstimasi(pr.items)}
            ceiling={pr.purchase.approvedCeiling}
            today={tanggalWita(now.toISOString())}
            initial={{ vendor: pr.purchase.vendor, purchasedOn: pr.purchase.purchasedOn, receiptName: pr.purchase.receiptName }}
          />
        );
      }
      return <ArrivalForm prId={pr.id} items={buyItems} />;
    }
  }
  return null;
}
