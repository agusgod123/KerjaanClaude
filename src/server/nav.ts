import type { NavEntry } from "@/components/shell/nav-items";
import type { Db } from "./db";
import type { Viewer } from "./org";
import { waitingFor } from "./service";

export function canCreate(viewer: Viewer): boolean {
  return !viewer.positions.every((p) => p.kind === "admin");
}

export function isApprover(viewer: Viewer): boolean {
  const r = viewer.roles;
  return r.has("atasan") || r.has("verifikator") || r.has("sekretaris") || r.has("kepala");
}

export function navFor(db: Db, viewer: Viewer): NavEntry[] {
  const r = viewer.roles;
  const out: NavEntry[] = [{ key: "beranda" }];
  if (isApprover(viewer)) out.push({ key: "menunggu", count: waitingFor(db, viewer).length, urgent: true });
  if (r.has("umum")) {
    const toBuy = db.prs.filter((p) => p.status === "disetujui").length;
    out.push({ key: "pembelian", count: toBuy, urgent: true });
  }
  if (canCreate(viewer)) {
    const mine = db.prs.filter(
      (p) => p.requesterId === viewer.user.id && (p.status === "dikembalikan" || p.status === "tiba"),
    ).length;
    out.push({ key: "pr", count: mine, urgent: true });
  }
  if (r.has("atasan") || r.has("verifikator") || r.has("sekretaris") || r.has("kepala") || r.has("spi")) {
    out.push({ key: "anggaran" });
  }
  if (r.has("verifikator") || r.has("sekretaris") || r.has("kepala") || r.has("spi") || r.has("umum")) {
    out.push({ key: "laporan" });
  }
  const unread = db.notifications.filter((n) => n.userId === viewer.user.id && !n.read).length;
  out.push({ key: "notifikasi", count: unread });
  if (r.has("admin")) out.push({ key: "pengaturan" });
  return out;
}
