import { describe, expect, it } from "vitest";
import {
  AMBANG_KEPALA_BADAN,
  cekPersetujuanUlang,
  judulPr,
  nomorPr,
  pemakaianPagu,
  penyetujuAkhir,
  romawi,
  totalEstimasi,
} from "./rules";
import { hariKerja, parseRupiah, rupiah, rupiahRingkas, tanggalJam } from "./format";

describe("penyetuju akhir", () => {
  it("di bawah Rp5 jt ke Sekretaris Badan", () => {
    expect(penyetujuAkhir(4_999_999, false).kind).toBe("sekretaris");
  });
  it("tepat Rp5.000.000 ke Kepala Badan", () => {
    expect(penyetujuAkhir(AMBANG_KEPALA_BADAN, false).kind).toBe("kepala_badan");
  });
  it("di atas Rp5 jt ke Kepala Badan", () => {
    expect(penyetujuAkhir(12_500_000, false).kind).toBe("kepala_badan");
  });
  it("anggaran khusus ke Kepala Badan berapa pun nilainya", () => {
    const r = penyetujuAkhir(150_000, true);
    expect(r.kind).toBe("kepala_badan");
    expect(r.basis).toBe("Anggaran khusus");
  });
});

describe("persetujuan ulang setelah realisasi", () => {
  it("naik tepat 10% masih dalam toleransi", () => {
    expect(cekPersetujuanUlang(1_000_000, 1_100_000).needed).toBe(false);
  });
  it("naik lebih dari 10% perlu persetujuan ulang", () => {
    const r = cekPersetujuanUlang(2_750_000, 3_400_000);
    expect(r.needed).toBe(true);
    expect(r.reason).toBe("Realisasi 24% di atas estimasi");
  });
  it("menembus Rp5 jt walau di bawah 10% perlu persetujuan ulang", () => {
    const r = cekPersetujuanUlang(4_800_000, 5_000_000);
    expect(r).toEqual({ needed: true, reason: "Total realisasi menjadi Rp5 jt ke atas" });
  });
  it("lebih murah tidak perlu apa-apa", () => {
    expect(cekPersetujuanUlang(3_300_000, 3_240_000).needed).toBe(false);
  });
});

describe("nomor PR", () => {
  it("format usulan PRD", () => {
    expect(nomorPr(7, "IT", new Date("2026-10-12T02:00:00Z"))).toBe("007/PR/IT/X/2026");
  });
  it("bulan mengikuti WITA, bukan UTC", () => {
    // 31 Okt 2026 20.30 UTC = 1 Nov 2026 04.30 WITA
    expect(nomorPr(1, "PLP", new Date("2026-10-31T20:30:00Z"))).toBe("001/PR/PLP/XI/2026");
  });
  it("angka romawi", () => {
    expect([1, 4, 9, 12].map(romawi)).toEqual(["I", "IV", "IX", "XII"]);
    expect(() => romawi(13)).toThrow();
  });
});

describe("sisa pagu", () => {
  const line = { id: "it-01", pagu: 10_000_000 };
  const base = { specialBudget: false, budgetLineId: "it-01", verifiedTotal: undefined, purchase: undefined };
  const items = (price: number, realized?: number) => [{ qty: 1, unitPrice: price, realizedUnitPrice: realized }] as never;
  it("pagu − disetujui belum dibeli − realisasi", () => {
    const u = pemakaianPagu(line, [
      { ...base, id: "a", status: "disetujui", items: items(2_000_000) },
      { ...base, id: "b", status: "selesai", items: items(3_000_000, 2_900_000), purchase: { recordedAt: "x" } as never },
      { ...base, id: "c", status: "persetujuan", items: items(1_000_000) },
      { ...base, id: "d", status: "ditolak", items: items(9_000_000) },
      { ...base, id: "e", status: "disetujui", items: items(500_000), specialBudget: true },
    ]);
    expect(u).toEqual({ pagu: 10_000_000, realisasi: 2_900_000, terikat: 2_000_000, dalamProses: 1_000_000, sisa: 5_100_000 });
  });
  it("bisa mengecualikan PR yang sedang diverifikasi", () => {
    const u = pemakaianPagu(line, [{ ...base, id: "a", status: "disetujui", items: items(2_000_000) }], "a");
    expect(u.sisa).toBe(10_000_000);
  });
});

describe("format", () => {
  it("rupiah tanpa desimal dan tanpa spasi", () => {
    expect(rupiah(4_750_000)).toBe("Rp4.750.000");
    expect(rupiah(0)).toBe("Rp0");
  });
  it("rupiah ringkas", () => {
    expect(rupiahRingkas(4_750_000)).toBe("Rp4,75 jt");
    expect(rupiahRingkas(120_000_000)).toBe("Rp120 jt");
  });
  it("membaca isian rupiah bebas", () => {
    expect(parseRupiah("Rp 1.250.000")).toBe(1_250_000);
    expect(parseRupiah("")).toBe(0);
  });
  it("waktu tampil dalam WITA", () => {
    expect(tanggalJam("2026-10-12T01:15:00Z")).toBe("12 Okt 2026, 09.15");
  });
  it("hari kerja melewati akhir pekan", () => {
    // Jumat 16.00 WITA → Senin 10.00 WITA = 8 jam Jumat + 10 jam Senin
    const d = hariKerja("2026-10-09T08:00:00Z", "2026-10-12T02:00:00Z");
    expect(d).toBeCloseTo(18 / 24, 5);
  });
  it("total dan judul", () => {
    expect(totalEstimasi([{ qty: 50, unitPrice: 95_000 }, { qty: 2, unitPrice: 1_000 }])).toBe(4_752_000);
    expect(judulPr([{ description: "Toner" }, { description: "Kertas" }, { description: "Map" }])).toBe("Toner dan 2 item lain");
  });
});
