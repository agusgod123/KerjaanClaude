/**
 * Penyimpanan sementara di memori untuk prototipe UI.
 *
 * Bentuk datanya sama dengan tabel di PRD; langkah berikutnya mengganti modul
 * ini dengan Drizzle + PostgreSQL tanpa mengubah layanan dan tampilan.
 * Data hilang saat server dimulai ulang, dan diisi ulang dari seed.
 */
import type {
  AuditEntry,
  BudgetLine,
  Notification,
  Position,
  PositionHolder,
  PurchaseRequest,
  Unit,
  User,
} from "@/domain/types";
import { seed } from "./seed";

export interface Db {
  units: Unit[];
  positions: Position[];
  holders: PositionHolder[];
  users: User[];
  /** Hanya prototipe. Produksi: Better Auth dengan sandi di-hash. */
  passwords: Map<string, string>;
  budgetLines: BudgetLine[];
  prs: PurchaseRequest[];
  notifications: Notification[];
  audit: AuditEntry[];
  /** Penghitung nomor PR per unit per tahun: "unitId:2026" → 7 */
  sequences: Map<string, number>;
}

export function emptyDb(): Db {
  return {
    units: [],
    positions: [],
    holders: [],
    users: [],
    passwords: new Map(),
    budgetLines: [],
    prs: [],
    notifications: [],
    audit: [],
    sequences: new Map(),
  };
}

const globalForDb = globalThis as unknown as { __pengadaanDb?: Db };

export function getDb(): Db {
  globalForDb.__pengadaanDb ??= seed(new Date());
  return globalForDb.__pengadaanDb;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
