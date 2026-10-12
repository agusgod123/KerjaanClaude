/**
 * Bentuk data siap tampil. Komponen tidak perlu tahu cara mencari nama
 * jabatan atau siapa yang sedang memegang PR.
 */
import { judulPr, pemakaianPagu, totalEstimasi, totalRealisasi, type BudgetUsage } from "@/domain/rules";
import { trackStates, type TrackState } from "@/domain/status";
import type { BudgetLine, PrStatus, PurchaseRequest } from "@/domain/types";
import type { Db } from "./db";
import { holdersOf, positionOf } from "./org";
import { currentStep } from "./service";

export interface Desk {
  /** "Menunggu verifikasi" */
  label: string;
  /** "I Made Wirawan" */
  who: string;
  /** "Ka. Urusan Keuangan" */
  role?: string;
  since?: string;
}

export interface PrRow {
  id: string;
  number?: string;
  title: string;
  itemCount: number;
  unitName: string;
  unitCode: string;
  requesterId: string;
  requesterName: string;
  total: number;
  status: PrStatus;
  track: TrackState[];
  desk?: Desk;
  neededBy: string;
  submittedAt?: string;
  updatedAt: string;
  specialBudget: boolean;
}

export function userName(db: Db, id: string): string {
  return db.users.find((u) => u.id === id)?.name ?? "—";
}

export function deskOf(db: Db, pr: PurchaseRequest, at: Date): Desk | undefined {
  const step = currentStep(pr);
  if (step) {
    const position = positionOf(db, step.positionId);
    const names = holdersOf(db, step.positionId, at).map((u) => u.name);
    const verb = { diketahui: "diketahui", verifikasi: "verifikasi", persetujuan: "persetujuan" }[step.kind];
    const reapproval = step.basis?.startsWith("Persetujuan ulang");
    return {
      label: reapproval ? "Menunggu persetujuan ulang" : `Menunggu ${verb}`,
      who: names.join(", ") || position.title,
      role: position.title,
      since: step.startedAt,
    };
  }
  const requester = userName(db, pr.requesterId);
  switch (pr.status) {
    case "dikembalikan": {
      const back = [...pr.steps].reverse().find((s) => s.action === "kembalikan");
      return { label: "Perlu direvisi pemohon", who: requester, role: "Pemohon", since: back?.at };
    }
    case "disetujui":
      return { label: "Menunggu dibeli", who: "Urusan Umum", since: pr.approvedAt };
    case "pembelian":
      return pr.purchase?.recordedAt
        ? { label: "Menunggu barang tiba", who: userName(db, pr.purchase.picId), role: "Urusan Umum", since: pr.purchase.recordedAt }
        : { label: "Sedang dibeli", who: userName(db, pr.purchase!.picId), role: "Urusan Umum", since: pr.purchase?.takenAt };
    case "tiba":
      return { label: "Menunggu konfirmasi terima", who: requester, role: "Pemohon", since: pr.purchase?.arrivedAt };
    default:
      return undefined;
  }
}

export function toRow(db: Db, pr: PurchaseRequest, at: Date): PrRow {
  const unit = db.units.find((u) => u.id === pr.unitId)!;
  return {
    id: pr.id,
    number: pr.number,
    title: judulPr(pr.items),
    itemCount: pr.items.length,
    unitName: unit.name,
    unitCode: unit.code,
    requesterId: pr.requesterId,
    requesterName: userName(db, pr.requesterId),
    total: pr.purchase?.recordedAt ? totalRealisasi(pr.items) : totalEstimasi(pr.items),
    status: pr.status,
    track: trackStates(pr),
    desk: deskOf(db, pr, at),
    neededBy: pr.neededBy,
    submittedAt: pr.submittedAt,
    updatedAt: pr.updatedAt,
    specialBudget: pr.specialBudget,
  };
}

export interface BudgetRow extends BudgetUsage {
  line: BudgetLine;
  unitName: string;
}

export function budgetRows(db: Db, year: number): BudgetRow[] {
  return db.budgetLines
    .filter((l) => l.year === year)
    .map((line) => ({
      line,
      unitName: db.units.find((u) => u.id === line.unitId)?.name ?? "—",
      ...pemakaianPagu(line, db.prs),
    }));
}
