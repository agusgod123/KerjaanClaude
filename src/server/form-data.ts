import { bulanTahunWita, judulPr } from "@/domain/rules";
import type { PurchaseRequest } from "@/domain/types";
import type { FormValues, PrFormProps, RouteInfo } from "@/components/pr/form-model";
import type { Db } from "./db";
import { holdersOf, holdsPosition, positionByKind, positionOf, type Viewer } from "./org";

const names = (db: Db, positionId: string, at: Date) =>
  holdersOf(db, positionId, at)
    .map((u) => u.name)
    .join(", ");

export function routeInfo(db: Db, viewer: Viewer, at: Date): RouteInfo {
  const head = positionOf(db, viewer.unit.headPositionId);
  const keu = positionByKind(db, "keuangan");
  return {
    diketahui: { title: head.title, names: names(db, head.id, at), skipped: holdsPosition(viewer, head.id) },
    verifikasi: { title: keu.title, names: names(db, keu.id, at) },
    sekretaris: names(db, positionByKind(db, "sekretaris").id, at),
    kepala_badan: names(db, positionByKind(db, "kepala_badan").id, at),
  };
}

export function lineOptions(db: Db, viewer: Viewer, at: Date): PrFormProps["lines"] {
  const { year } = bulanTahunWita(at);
  const all = db.budgetLines.filter((l) => l.year === year);
  const own = all.filter((l) => l.unitId === viewer.unit.id);
  return (own.length ? own : all).map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` }));
}

export function recentOf(db: Db, viewer: Viewer): PrFormProps["recent"] {
  return db.prs
    .filter((p) => p.requesterId === viewer.user.id && p.number)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6)
    .map((p) => ({ id: p.id, number: p.number!, title: judulPr(p.items) }));
}

let k = 0;
export function valuesFrom(pr: PurchaseRequest, keepIds: boolean): FormValues {
  return {
    items: pr.items.map((it) => ({
      key: `s${++k}`,
      id: keepIds ? it.id : undefined,
      description: it.description,
      kind: it.kind,
      qty: String(it.qty).replace(".", ","),
      unit: it.unit,
      unitPrice: it.unitPrice,
      reason: it.reason,
      link: it.link ?? "",
      attachments: keepIds ? it.attachments.map(({ name, size, type }) => ({ name, size, type })) : [],
    })),
    neededBy: keepIds ? pr.neededBy : "",
    budgetLineId: pr.budgetLineId ?? "",
    note: pr.note ?? "",
  };
}
