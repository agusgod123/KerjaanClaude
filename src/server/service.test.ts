import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { buildViewer } from "./org";
import { seed } from "./seed";
import {
  act,
  canAct,
  currentStep,
  recordArrival,
  recordPurchase,
  saveDraft,
  ServiceError,
  submit,
  takePurchase,
  waitingFor,
} from "./service";

const NOW = new Date("2026-10-12T02:00:00Z"); // Senin 10.00 WITA
let db: Db;
let clock: number;

const as = (userId: string) => {
  clock += 60_000;
  const at = new Date(clock);
  return { db, viewer: buildViewer(db, userId, at)!, at };
};
const item = (unitPrice: number, qty = 1) => ({
  description: "Barang uji",
  kind: "barang" as const,
  qty,
  unit: "unit",
  unitPrice,
  reason: "Untuk pengujian",
});
const buat = (by: string, unitPrice: number) =>
  saveDraft(as(by), { neededBy: "2026-10-30", items: [item(unitPrice)] });

beforeEach(() => {
  db = seed(NOW);
  clock = NOW.getTime();
});

describe("data contoh", () => {
  it("setiap status muncul minimal sekali", () => {
    const statuses = new Set(db.prs.map((p) => p.status));
    for (const s of ["draf", "diketahui", "verifikasi", "persetujuan", "dikembalikan", "ditolak", "disetujui", "pembelian", "tiba", "selesai", "dibatalkan"]) {
      expect(statuses, s).toContain(s);
    }
  });
  it("nomor PR unik", () => {
    const numbers = db.prs.map((p) => p.number).filter(Boolean);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("alur persetujuan", () => {
  it("di bawah Rp5 jt: Kabid → Keuangan → Sekretaris, lalu disetujui", () => {
    const pr = buat("gede", 4_999_999);
    submit(as("gede"), pr.id);
    expect(pr.number).toMatch(/^\d{3}\/PR\/PLP\/X\/2026$/);
    expect(pr.status).toBe("diketahui");
    act(as("sukerti"), pr.id, { action: "setuju" });
    expect(pr.status).toBe("verifikasi");
    act(as("made"), pr.id, { action: "setuju", budgetLineId: "plp-01" });
    expect(pr.status).toBe("persetujuan");
    expect(currentStep(pr)!.positionId).toBe("sekretaris");
    act(as("nyoman"), pr.id, { action: "setuju" });
    expect(pr.status).toBe("disetujui");
    expect(pr.verifyCode).toBeTruthy();
  });

  it("tepat Rp5.000.000 naik ke Kepala Badan", () => {
    const pr = buat("gede", 5_000_000);
    submit(as("gede"), pr.id);
    act(as("sukerti"), pr.id, { action: "setuju" });
    act(as("made"), pr.id, { action: "setuju", budgetLineId: "plp-02" });
    expect(currentStep(pr)!.positionId).toBe("kepala");
    expect(() => act(as("nyoman"), pr.id, { action: "setuju" })).toThrow(ServiceError);
  });

  it("anggaran khusus ke Kepala Badan walau kecil, tanpa pos RKA", () => {
    const pr = buat("gede", 100_000);
    submit(as("gede"), pr.id);
    act(as("sukerti"), pr.id, { action: "setuju" });
    act(as("made"), pr.id, { action: "setuju", specialBudget: true });
    expect(pr.budgetLineId).toBeUndefined();
    expect(currentStep(pr)).toMatchObject({ positionId: "kepala", basis: "Anggaran khusus" });
  });

  it("verifikasi wajib menetapkan pos RKA atau anggaran khusus", () => {
    const pr = buat("gede", 100_000);
    submit(as("gede"), pr.id);
    act(as("sukerti"), pr.id, { action: "setuju" });
    expect(() => act(as("made"), pr.id, { action: "setuju" })).toThrow(/pos RKA/);
  });

  it("rangkap jabatan: dua persetujuan tercatat terpisah", () => {
    const pr = buat("kadek", 1_000_000);
    submit(as("kadek"), pr.id);
    act(as("made"), pr.id, { action: "setuju" });
    expect(pr.status).toBe("verifikasi");
    act(as("made"), pr.id, { action: "setuju", budgetLineId: "it-01" });
    const done = pr.steps.filter((s) => s.action === "setuju");
    expect(done.map((s) => [s.kind, s.actorTitle])).toEqual([
      ["diketahui", "Wakil Sekretaris"],
      ["verifikasi", "Ka. Urusan Keuangan"],
    ]);
  });

  it("pemohon kepala unit: Diketahui dilewati dan tercatat", () => {
    const pr = buat("sukerti", 300_000);
    submit(as("sukerti"), pr.id);
    expect(pr.status).toBe("verifikasi");
    expect(pr.steps[0]).toMatchObject({ kind: "diketahui", action: "lewati" });
  });

  it("kembalikan wajib alasan; revisi mulai lagi dari Diketahui dengan nomor yang sama", () => {
    const pr = buat("gede", 200_000);
    submit(as("gede"), pr.id);
    const number = pr.number;
    act(as("sukerti"), pr.id, { action: "setuju" });
    expect(() => act(as("made"), pr.id, { action: "kembalikan", note: "" })).toThrow(/alasan/);
    act(as("made"), pr.id, { action: "kembalikan", note: "Lampirkan penawaran harga" });
    expect(pr.status).toBe("dikembalikan");
    submit(as("gede"), pr.id);
    expect(pr.status).toBe("diketahui");
    expect(pr.round).toBe(2);
    expect(pr.number).toBe(number);
  });

  it("tolak menutup PR", () => {
    const pr = buat("gede", 200_000);
    submit(as("gede"), pr.id);
    act(as("sukerti"), pr.id, { action: "tolak", note: "Tidak sesuai kebutuhan bidang" });
    expect(pr.status).toBe("ditolak");
    expect(() => submit(as("gede"), pr.id)).toThrow();
  });

  it("admin sistem tidak bisa menyetujui dan tidak melihat isi PR", () => {
    const pr = buat("kadek", 200_000);
    submit(as("kadek"), pr.id);
    const admin = buildViewer(db, "darma", NOW)!;
    expect(canAct(admin, pr)).toBe(false);
    expect(() => act(as("darma"), pr.id, { action: "setuju" })).toThrow();
  });

  it("nomor urut per unit", () => {
    const a = buat("gede", 100_000);
    const b = buat("gede", 100_000);
    submit(as("gede"), a.id);
    submit(as("gede"), b.id);
    const seq = (n?: string) => Number(n!.slice(0, 3));
    expect(seq(b.number) - seq(a.number)).toBe(1);
  });

  it("antrean Menunggu saya urut dari yang paling lama", () => {
    const list = waitingFor(db, buildViewer(db, "made", NOW)!);
    const started = list.map((p) => Date.parse(currentStep(p)!.startedAt!));
    expect(started).toEqual([...started].sort((x, y) => x - y));
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("pembelian", () => {
  const approved = (unitPrice: number) => {
    const pr = buat("gede", unitPrice);
    submit(as("gede"), pr.id);
    act(as("sukerti"), pr.id, { action: "setuju" });
    act(as("made"), pr.id, { action: "setuju", budgetLineId: "plp-01" });
    act(as("nyoman"), pr.id, { action: "setuju" });
    takePurchase(as("komang"), pr.id);
    return pr;
  };

  it("realisasi wajar langsung tercatat, lalu tiba dan dikonfirmasi", () => {
    const pr = approved(1_000_000);
    const r = recordPurchase(as("komang"), pr.id, {
      vendor: "Toko A",
      purchasedOn: "2026-10-12",
      prices: { [pr.items[0]!.id]: 1_050_000 },
    });
    expect(r.reapproval).toBeUndefined();
    recordArrival(as("komang"), pr.id, { items: { [pr.items[0]!.id]: { qty: 1, condition: "baik" } } });
    expect(pr.status).toBe("tiba");
  });

  it("realisasi naik > 10% kembali ke penyetuju akhir sesuai nilai baru", () => {
    const pr = approved(4_800_000);
    const r = recordPurchase(as("komang"), pr.id, {
      vendor: "Toko B",
      purchasedOn: "2026-10-12",
      prices: { [pr.items[0]!.id]: 5_400_000 },
    });
    expect(r.reapproval).toBeTruthy();
    expect(pr.status).toBe("persetujuan");
    expect(currentStep(pr)!.positionId).toBe("kepala");
    expect(() => act(as("gus"), pr.id, { action: "kembalikan", note: "Coba vendor lain" })).toThrow();
    act(as("gus"), pr.id, { action: "setuju" });
    expect(pr.status).toBe("pembelian");
    // Setelah disetujui ulang, mencatat dengan harga yang sama tidak memicu lagi.
    const again = recordPurchase(as("komang"), pr.id, {
      vendor: "Toko B",
      purchasedOn: "2026-10-12",
      prices: { [pr.items[0]!.id]: 5_400_000 },
    });
    expect(again.reapproval).toBeUndefined();
    expect(pr.purchase!.recordedAt).toBeTruthy();
  });

  it("hanya Urusan Umum yang mencatat pembelian", () => {
    const pr = buat("gede", 100_000);
    expect(() => takePurchase(as("gede"), pr.id)).toThrow(/Urusan Umum/);
  });
});
