import type { Position, PositionKind, PurchaseRequest, Unit, User } from "@/domain/types";
import type { Db } from "./db";

export type Role = "pemohon" | "atasan" | "verifikator" | "sekretaris" | "kepala" | "umum" | "spi" | "admin";

export interface Viewer {
  user: User;
  unit: Unit;
  positions: Position[];
  roles: ReadonlySet<Role>;
  /** Jabatan utama untuk ditampilkan */
  title: string;
}

const ROLE_OF_KIND: Partial<Record<PositionKind, Role>> = {
  kepala_unit: "atasan",
  keuangan: "verifikator",
  sekretaris: "sekretaris",
  kepala_badan: "kepala",
  umum: "umum",
  spi: "spi",
  admin: "admin",
};

function isActive(from: string, to: string | undefined, at: Date): boolean {
  const t = at.getTime();
  return Date.parse(from) <= t && (!to || Date.parse(to) > t);
}

export function positionsOf(db: Db, userId: string, at: Date): Position[] {
  return db.holders
    .filter((h) => h.userId === userId && isActive(h.from, h.to, at))
    .map((h) => db.positions.find((p) => p.id === h.positionId))
    .filter((p): p is Position => Boolean(p));
}

export function holdersOf(db: Db, positionId: string, at: Date): User[] {
  return db.holders
    .filter((h) => h.positionId === positionId && isActive(h.from, h.to, at))
    .map((h) => db.users.find((u) => u.id === h.userId))
    .filter((u): u is User => Boolean(u?.active));
}

export function positionByKind(db: Db, kind: PositionKind): Position {
  const p = db.positions.find((pos) => pos.kind === kind);
  if (!p) throw new Error(`Jabatan ${kind} belum diatur di data induk`);
  return p;
}

export function unitOf(db: Db, unitId: string): Unit {
  const u = db.units.find((unit) => unit.id === unitId);
  if (!u) throw new Error(`Unit ${unitId} tidak ditemukan`);
  return u;
}

export function userOf(db: Db, userId: string): User {
  const u = db.users.find((user) => user.id === userId);
  if (!u) throw new Error(`Pengguna ${userId} tidak ditemukan`);
  return u;
}

export function positionOf(db: Db, positionId: string): Position {
  const p = db.positions.find((pos) => pos.id === positionId);
  if (!p) throw new Error(`Jabatan ${positionId} tidak ditemukan`);
  return p;
}

/** Urutan tampil jabatan: jabatan pimpinan lebih dulu dari staf. */
const KIND_ORDER: PositionKind[] = ["kepala_badan", "sekretaris", "kepala_unit", "keuangan", "umum", "spi", "admin", "staf"];

export function buildViewer(db: Db, userId: string, at: Date): Viewer | null {
  const user = db.users.find((u) => u.id === userId && u.active);
  if (!user) return null;
  const positions = positionsOf(db, user.id, at).sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
  const roles = new Set<Role>(["pemohon"]);
  for (const p of positions) {
    const r = ROLE_OF_KIND[p.kind];
    if (r) roles.add(r);
  }
  return {
    user,
    unit: unitOf(db, user.unitId),
    positions,
    roles,
    title: positions.map((p) => p.title).join(" · ") || "Pegawai",
  };
}

export function holdsPosition(viewer: Viewer, positionId: string): boolean {
  return viewer.positions.some((p) => p.id === positionId);
}

/** Siapa boleh membuka PR. Hak akses selalu dicek di server. */
export function canView(viewer: Viewer, pr: PurchaseRequest, db: Db): boolean {
  if (pr.requesterId === viewer.user.id) return true;
  if (pr.status === "draf") return false;
  const r = viewer.roles;
  if (r.has("verifikator") || r.has("sekretaris") || r.has("kepala") || r.has("spi")) return true;
  if (r.has("umum") && ["disetujui", "pembelian", "tiba", "selesai"].includes(pr.status)) return true;
  if (pr.steps.some((s) => holdsPosition(viewer, s.positionId))) return true;
  const unit = db.units.find((u) => u.id === pr.unitId);
  return Boolean(unit && holdsPosition(viewer, unit.headPositionId));
}
