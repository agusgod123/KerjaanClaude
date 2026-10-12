/**
 * Data contoh untuk uji coba: struktur organisasi, pos RKA 2026, dan PR di
 * setiap tahap. PR tidak ditulis langsung; alurnya diputar ulang lewat
 * layanan yang sama dengan aplikasi, jadi data contoh selalu taat aturan.
 *
 * Nama, NIP, dan email fiktif. Email memakai domain .test supaya tidak
 * pernah terkirim ke alamat sungguhan.
 */
import type { BudgetLine, ItemKind, Position, PositionKind, Unit, User } from "@/domain/types";
import { emptyDb, type Db } from "./db";
import { buildViewer } from "./org";
import {
  act,
  cancel,
  confirmReceipt,
  recordArrival,
  recordPurchase,
  saveDraft,
  submit,
  takePurchase,
  type ItemInput,
} from "./service";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WITA = 8 * HOUR;

export const DEMO_PASSWORD = "pengadaan";

export function seed(now: Date): Db {
  const db = emptyDb();

  /* ---------- waktu relatif terhadap sekarang ---------- */

  /** n hari kerja sebelum hari ini, pukul hh.mm WITA */
  const kerja = (n: number, hhmm: string): Date => {
    const shifted = now.getTime() + WITA;
    let cursor = Math.floor(shifted / DAY) * DAY;
    let count = 0;
    while (count < n) {
      cursor -= DAY;
      const wd = new Date(cursor).getUTCDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    const [hh, mm] = hhmm.split(":").map(Number) as [number, number];
    return new Date(cursor + hh * HOUR + mm * 60_000 - WITA);
  };
  const jamLalu = (h: number): Date => new Date(now.getTime() - h * HOUR);
  const tanggal = (d: Date) => new Date(d.getTime() + WITA).toISOString().slice(0, 10);
  const nanti = (days: number) => tanggal(new Date(now.getTime() + days * DAY));

  /* ---------- organisasi ---------- */

  const units: Unit[] = [
    { id: "pimpinan", code: "KB", name: "Pimpinan", headPositionId: "kepala" },
    { id: "sek", code: "SEK", name: "Sekretariat", headPositionId: "sekretaris" },
    { id: "it", code: "IT", name: "Tim IT", headPositionId: "waksek" },
    { id: "keu", code: "KEU", name: "Urusan Keuangan", headPositionId: "kaur-keu" },
    { id: "umum", code: "UMUM", name: "Urusan Umum", headPositionId: "kaur-umum" },
    { id: "plp", code: "PLP", name: "Bidang Pelayanan", headPositionId: "kabid-plp" },
    { id: "infra", code: "INFRALING", name: "Bidang Infrastruktur dan Lingkungan", headPositionId: "kabid-infra" },
    { id: "spi", code: "SPI", name: "Satuan Pengawas Internal", headPositionId: "spi" },
  ];
  const pos = (id: string, title: string, kind: PositionKind, unitId?: string): Position => ({ id, title, kind, unitId });
  const positions: Position[] = [
    pos("kepala", "Kepala Badan", "kepala_badan", "pimpinan"),
    pos("sekretaris", "Sekretaris Badan", "sekretaris", "sek"),
    pos("waksek", "Wakil Sekretaris", "kepala_unit", "sek"),
    pos("kaur-keu", "Ka. Urusan Keuangan", "keuangan", "keu"),
    pos("kaur-umum", "Ka. Urusan Umum", "kepala_unit", "umum"),
    pos("pengadaan", "Staf Pengadaan, Urusan Umum", "umum", "umum"),
    pos("kabid-plp", "Kepala Bidang Pelayanan", "kepala_unit", "plp"),
    pos("kabid-infra", "Kepala Bidang Infrastruktur dan Lingkungan", "kepala_unit", "infra"),
    pos("spi", "Pemeriksa SPI", "spi", "spi"),
    pos("admin", "Admin Sistem", "admin", "it"),
    pos("staf-it", "Staf IT", "staf", "it"),
    pos("staf-plp", "Staf Pelayanan", "staf", "plp"),
    pos("staf-infra", "Staf Infrastruktur dan Lingkungan", "staf", "infra"),
  ];
  const person = (id: string, name: string, nip: string, unitId: string): User => ({
    id,
    name,
    nip,
    email: `${id}@kantor.test`,
    unitId,
    active: true,
  });
  const users: User[] = [
    person("kadek", "Kadek Ayu Lestari", "199503172020122004", "it"),
    person("made", "I Made Wirawan", "197808242005011003", "sek"),
    person("nyoman", "I Nyoman Suarta", "197201101998031002", "sek"),
    person("gus", "Ida Bagus Ketut Wira", "196905051994031005", "pimpinan"),
    person("komang", "Komang Juliana", "199107092015032001", "umum"),
    person("adi", "Nyoman Adi Putra", "198306152009011004", "umum"),
    person("sukerti", "Ni Wayan Sukerti", "198012302006042002", "plp"),
    person("gede", "Gede Pramana", "199609212021011001", "plp"),
    person("arimbawa", "Ketut Arimbawa", "197911182005011006", "infra"),
    person("wulan", "Luh Putu Wulandari", "199802142022032003", "infra"),
    person("eka", "Putu Eka Wijaya", "198704032011011002", "spi"),
    person("darma", "Wayan Darma", "199211252018011001", "it"),
  ];
  const holding: [string, string][] = [
    ["kadek", "staf-it"],
    ["made", "waksek"],
    ["made", "kaur-keu"], // rangkap jabatan, sesuai keputusan PRD
    ["nyoman", "sekretaris"],
    ["gus", "kepala"],
    ["komang", "pengadaan"],
    ["adi", "kaur-umum"],
    ["sukerti", "kabid-plp"],
    ["gede", "staf-plp"],
    ["arimbawa", "kabid-infra"],
    ["wulan", "staf-infra"],
    ["eka", "spi"],
    ["darma", "admin"],
  ];

  db.units = units;
  db.positions = positions;
  db.users = users;
  db.holders = holding.map(([userId, positionId]) => ({ userId, positionId, from: "2024-01-01T00:00:00.000Z" }));
  for (const u of users) db.passwords.set(u.id, DEMO_PASSWORD);

  const year = Number(tanggal(now).slice(0, 4));
  const line = (id: string, code: string, name: string, unitId: string, pagu: number): BudgetLine => ({
    id,
    year,
    code,
    name,
    unitId,
    pagu,
  });
  db.budgetLines = [
    line("it-01", "IT-01", "Pemeliharaan perangkat TI", "it", 45_000_000),
    line("it-02", "IT-02", "Perangkat jaringan", "it", 60_000_000),
    line("it-03", "IT-03", "Langganan layanan dan lisensi", "it", 36_000_000),
    line("plp-01", "PLP-01", "Operasional loket pelayanan", "plp", 30_000_000),
    line("plp-02", "PLP-02", "Sarana kenyamanan pengunjung", "plp", 75_000_000),
    line("inf-01", "INF-01", "Pemeliharaan sarana kawasan", "infra", 120_000_000),
    line("inf-02", "INF-02", "Kebersihan dan pertamanan", "infra", 48_000_000),
    line("sek-01", "SEK-01", "Alat tulis dan perlengkapan kantor", "sek", 24_000_000),
    line("sek-02", "SEK-02", "Pemeliharaan gedung kantor", "sek", 40_000_000),
  ];

  /* ---------- pemutar alur ---------- */

  const as = (userId: string, at: Date) => {
    const viewer = buildViewer(db, userId, at);
    if (!viewer) throw new Error(`Seed: pengguna ${userId} tidak ada`);
    return { db, viewer, at };
  };
  const item = (
    description: string,
    qty: number,
    unit: string,
    unitPrice: number,
    reason: string,
    extra: Partial<ItemInput> & { kind?: ItemKind } = {},
  ): ItemInput => ({ description, kind: "barang", qty, unit, unitPrice, reason, attachments: [], ...extra });
  const shot = (name: string, size: number) => ({ name, size, type: "image/jpeg" });

  const draft = (by: string, at: Date, neededBy: string, items: ItemInput[], note?: string) =>
    saveDraft(as(by, at), { neededBy, items, note });
  const ajukan = (by: string, at: Date, id: string) => submit(as(by, at), id);
  const setuju = (by: string, at: Date, id: string, note?: string, budget?: { line?: string; special?: boolean }) =>
    act(as(by, at), id, { action: "setuju", note, budgetLineId: budget?.line, specialBudget: budget?.special });
  const beli = (at: Date, id: string, vendor: string, prices: number[], receiptName = "nota.jpg") => {
    const pr = db.prs.find((p) => p.id === id)!;
    return recordPurchase(as("komang", at), id, {
      vendor,
      purchasedOn: tanggal(at),
      receiptName,
      prices: Object.fromEntries(pr.items.map((it, i) => [it.id, prices[i] ?? it.unitPrice])),
    });
  };
  const tiba = (at: Date, id: string) => {
    const pr = db.prs.find((p) => p.id === id)!;
    return recordArrival(as("komang", at), id, {
      items: Object.fromEntries(pr.items.map((it) => [it.id, { qty: it.qty, condition: "baik" as const }])),
    });
  };

  // Diputar urut waktu pengajuan supaya nomor PR urut seperti aslinya.

  // A. IT — selesai
  const a = draft("kadek", kerja(18, "08:50"), tanggal(kerja(12, "00:00")), [
    item("Toner printer HP 107A", 4, "buah", 385_000, "Stok toner ruang administrasi habis", {
      link: "https://www.tokopedia.com/",
      attachments: [shot("harga-toner.jpg", 412_000)],
    }),
    item("Kertas HVS A4 70 gsm", 5, "rim", 52_000, "Kebutuhan cetak laporan bulanan"),
  ]);
  ajukan("kadek", kerja(18, "09:10"), a.id);
  setuju("made", kerja(18, "13:20"), a.id);
  setuju("made", kerja(17, "08:45"), a.id, undefined, { line: "it-01" });
  setuju("nyoman", kerja(16, "10:05"), a.id);
  takePurchase(as("komang", kerja(16, "14:00")), a.id);
  beli(kerja(15, "11:30"), a.id, "CV Sinar Office, Denpasar", [375_000, 52_000]);
  tiba(kerja(14, "10:00"), a.id);
  confirmReceipt(as("kadek", kerja(14, "13:40")), a.id);

  // M. INFRALING — selesai, disetujui Kepala Badan (≥ Rp5 jt)
  const m = draft("wulan", kerja(16, "08:40"), tanggal(kerja(8, "00:00")), [
    item("Tong sampah terpilah 3 warna, 120 liter", 10, "set", 650_000, "Area parkir dan jalur pejalan kaki belum punya tempat sampah terpilah", {
      attachments: [shot("contoh-tong.jpg", 655_000)],
    }),
  ]);
  ajukan("wulan", kerja(16, "09:00"), m.id);
  setuju("arimbawa", kerja(16, "10:00"), m.id);
  setuju("made", kerja(15, "09:00"), m.id, undefined, { line: "inf-02" });
  setuju("gus", kerja(14, "11:00"), m.id, "Pastikan label pemilahan dalam dua bahasa.");
  takePurchase(as("komang", kerja(13, "09:00")), m.id);
  beli(kerja(12, "10:00"), m.id, "UD Karya Plastik", [640_000]);
  tiba(kerja(9, "10:00"), m.id);
  confirmReceipt(as("wulan", kerja(8, "09:00")), m.id);

  // B. IT — selesai
  const b = draft("kadek", kerja(12, "09:40"), tanggal(kerja(5, "00:00")), [
    item("UPS 1200 VA", 2, "unit", 1_650_000, "Melindungi server lokal dan switch dari listrik padam", {
      link: "https://www.bhinneka.com/",
    }),
  ]);
  ajukan("kadek", kerja(12, "10:00"), b.id);
  setuju("made", kerja(11, "09:00"), b.id);
  setuju("made", kerja(11, "09:20"), b.id, undefined, { line: "it-01" });
  setuju("nyoman", kerja(10, "15:10"), b.id);
  takePurchase(as("komang", kerja(9, "09:00")), b.id);
  beli(kerja(8, "14:00"), b.id, "Toko Komputer Dewata", [1_620_000]);
  tiba(kerja(6, "10:30"), b.id);
  confirmReceipt(as("kadek", kerja(6, "11:15")), b.id);

  // I. PLP — ditolak Kepala Badan
  const i = draft("gede", kerja(10, "08:45"), tanggal(kerja(0, "00:00")), [
    item("Televisi LED 65 inci", 1, "unit", 12_500_000, "Layar informasi antrean di ruang tunggu"),
  ]);
  ajukan("gede", kerja(10, "09:00"), i.id);
  setuju("sukerti", kerja(10, "14:00"), i.id);
  setuju("made", kerja(9, "10:00"), i.id, undefined, { line: "plp-02" });
  act(as("gus", kerja(8, "16:00")), i.id, {
    action: "tolak",
    note: "Belum menjadi prioritas tahun ini. Manfaatkan layar informasi yang sudah ada di loket.",
  });

  // C. IT — dibatalkan pemohon
  const c = draft("kadek", kerja(9, "08:20"), tanggal(kerja(3, "00:00")), [
    item("Webcam 1080p", 2, "unit", 450_000, "Rapat daring dengan mitra"),
  ]);
  ajukan("kadek", kerja(9, "08:30"), c.id);
  cancel(as("kadek", kerja(9, "10:00")), c.id, "Sudah dipinjami webcam dari ruang rapat.");

  // H. PLP — barang tiba, menunggu konfirmasi pemohon
  const h = draft("gede", kerja(8, "09:45"), tanggal(kerja(2, "00:00")), [
    item("Tinta stempel biru 50 ml", 6, "botol", 18_500, "Stok loket habis"),
    item("Bantalan stempel no. 2", 3, "buah", 32_000, "Bantalan lama sudah kering"),
  ]);
  ajukan("gede", kerja(8, "10:00"), h.id);
  setuju("sukerti", kerja(8, "11:30"), h.id);
  setuju("made", kerja(7, "09:15"), h.id, undefined, { line: "plp-01" });
  setuju("nyoman", kerja(7, "13:00"), h.id);
  takePurchase(as("komang", kerja(6, "09:00")), h.id);
  beli(kerja(5, "10:00"), h.id, "Toko Buku Gramedia Denpasar", [18_500, 30_000]);
  tiba(kerja(1, "09:30"), h.id);

  // N. INFRALING — anggaran khusus, selesai
  const n = draft("wulan", kerja(7, "08:10"), tanggal(kerja(2, "00:00")), [
    item("Jasa perbaikan atap bale kulkul", 1, "paket", 3_800_000, "Atap bocor, perlu selesai sebelum musim hujan", {
      kind: "jasa",
      attachments: [shot("atap-bocor-1.jpg", 820_000), shot("atap-bocor-2.jpg", 760_000)],
    }),
    item("Genteng tanah liat", 150, "buah", 9_500, "Pengganti genteng yang pecah"),
  ]);
  ajukan("wulan", kerja(7, "08:30"), n.id);
  setuju("arimbawa", kerja(7, "09:00"), n.id, "Mendesak, atap bocor sebelum musim hujan.");
  setuju("made", kerja(7, "11:00"), n.id, "Di luar RKA. Diajukan sebagai anggaran khusus.", { special: true });
  setuju("gus", kerja(6, "10:00"), n.id);
  takePurchase(as("komang", kerja(6, "13:00")), n.id);
  beli(kerja(4, "10:00"), n.id, "CV Bangun Bali Lestari", [3_800_000, 9_800]);
  tiba(kerja(2, "14:00"), n.id);
  confirmReceipt(as("wulan", kerja(1, "10:00")), n.id);

  // P. INFRALING — dalam pembelian
  const p = draft("wulan", kerja(6, "08:45"), tanggal(new Date(now.getTime() + 4 * DAY)), [
    item("Mesin pemotong rumput gendong", 2, "unit", 3_250_000, "Mesin lama rusak, area taman utama tidak terawat", {
      link: "https://www.tokopedia.com/",
    }),
  ]);
  ajukan("wulan", kerja(6, "09:00"), p.id);
  setuju("arimbawa", kerja(6, "10:00"), p.id);
  setuju("made", kerja(5, "09:30"), p.id, undefined, { line: "inf-01" });
  setuju("gus", kerja(3, "15:00"), p.id);
  takePurchase(as("komang", kerja(2, "09:00")), p.id);

  // Q. INFRALING — harga naik saat dibeli, menunggu persetujuan ulang Sekretaris
  const q = draft("wulan", kerja(6, "13:40"), nanti(6), [
    item("Pompa celup 1 HP", 1, "unit", 2_300_000, "Pompa kolam penampungan mati"),
    item("Selang spiral 1 inci", 50, "meter", 9_000, "Sambungan ke pompa baru"),
  ]);
  ajukan("wulan", kerja(6, "14:00"), q.id);
  setuju("arimbawa", kerja(5, "08:30"), q.id);
  setuju("made", kerja(4, "10:30"), q.id, undefined, { line: "inf-01" });
  setuju("nyoman", kerja(3, "09:15"), q.id);
  takePurchase(as("komang", kerja(3, "10:00")), q.id);
  beli(jamLalu(4), q.id, "UD Tirta Teknik", [2_950_000, 9_000], "penawaran-tirta-teknik.pdf");

  // F. IT — menunggu Kepala Badan (Rp5 jt ke atas)
  const f = draft("kadek", kerja(5, "12:30"), nanti(10), [
    item("Access point Wi-Fi 6 outdoor", 2, "unit", 2_450_000, "Sinyal di area parkir timur dan loket tiket lemah", {
      link: "https://www.bhinneka.com/",
      attachments: [shot("denah-titik-ap.jpg", 540_000)],
    }),
    item("Kabel UTP Cat6 305 m", 1, "roll", 1_850_000, "Jalur kabel ke dua titik access point"),
    item("Instalasi jaringan dua titik", 1, "paket", 1_500_000, "Penarikan kabel dan konfigurasi", { kind: "jasa" }),
  ]);
  ajukan("kadek", kerja(5, "13:00"), f.id);
  setuju("made", kerja(5, "15:30"), f.id);
  setuju("made", kerja(1, "14:20"), f.id, "Masuk pos perangkat jaringan.", { line: "it-02" });

  // D. IT — dikembalikan Keuangan, perlu revisi pemohon
  const d = draft("kadek", kerja(4, "09:10"), nanti(12), [
    item("Perpanjangan lisensi antivirus 25 perangkat, 1 tahun", 1, "paket", 4_375_000, "Lisensi berakhir akhir bulan ini", {
      kind: "jasa",
    }),
  ]);
  ajukan("kadek", kerja(4, "09:30"), d.id);
  setuju("made", kerja(4, "11:00"), d.id);
  act(as("made", kerja(3, "10:15")), d.id, {
    action: "kembalikan",
    note: "Lampirkan penawaran resmi dari distributor. Bandingkan juga harga perpanjangan 2 tahun.",
  });

  // O. INFRALING — disetujui, menunggu dibeli
  const o = draft("wulan", kerja(4, "09:40"), nanti(3), [
    item("Servis pompa air sumur dalam", 1, "kali", 1_750_000, "Debit air ke toilet umum turun", { kind: "jasa" }),
    item("Pipa PVC 3 inci", 12, "batang", 98_000, "Mengganti pipa yang retak"),
  ]);
  ajukan("wulan", kerja(4, "10:00"), o.id);
  setuju("arimbawa", kerja(3, "09:30"), o.id);
  setuju("made", kerja(2, "10:00"), o.id, undefined, { line: "inf-01" });
  setuju("nyoman", kerja(1, "11:20"), o.id);

  // J. PLP — menunggu verifikasi sejak 3 hari kerja
  const j = draft("gede", kerja(3, "10:00"), nanti(9), [
    item("Kamera CCTV outdoor 4 MP", 4, "unit", 1_250_000, "Area parkir timur belum terpantau", {
      attachments: [shot("penawaran-cctv.jpg", 380_000)],
    }),
    item("NVR 8 kanal", 1, "unit", 2_100_000, "Perekam untuk kamera baru"),
    item("Hard disk 4 TB untuk CCTV", 1, "unit", 1_450_000, "Rekaman 30 hari"),
    item("Pemasangan CCTV", 1, "paket", 1_200_000, "Penarikan kabel dan pemasangan", { kind: "jasa" }),
  ]);
  ajukan("gede", kerja(3, "10:20"), j.id);
  setuju("sukerti", kerja(3, "15:45"), j.id, "Prioritas, ada laporan kehilangan helm pengunjung.");

  // E. IT — Diketahui oleh Wakil Sekretaris, kini menunggu verifikasi oleh orang yang sama
  const e = draft("kadek", kerja(2, "08:50"), nanti(7), [
    item("SSD 512 GB", 3, "unit", 780_000, "PC loket lambat saat jam ramai", { link: "https://www.tokopedia.com/" }),
    item("RAM DDR4 8 GB", 3, "keping", 420_000, "Menambah memori PC loket"),
  ]);
  ajukan("kadek", kerja(2, "09:05"), e.id);
  setuju("made", kerja(1, "10:40"), e.id);

  // L. PLP — menunggu persetujuan Sekretaris
  const l = draft("gede", kerja(1, "08:30"), nanti(5), [
    item("Payung lipat untuk pengunjung", 30, "buah", 45_000, "Dipinjamkan saat hujan di jalur pura"),
  ]);
  ajukan("gede", kerja(1, "08:40"), l.id);
  setuju("sukerti", kerja(1, "09:30"), l.id);
  setuju("made", jamLalu(6), l.id, undefined, { line: "plp-02" });

  // K. PLP — baru diajukan, menunggu Kabid
  const k = draft("gede", jamLalu(5.5), nanti(14), [
    item("Kursi tunggu 3 dudukan", 4, "set", 1_150_000, "Ruang tunggu loket sering penuh"),
  ]);
  ajukan("gede", jamLalu(5), k.id);

  // G. IT — draf
  draft("kadek", jamLalu(3), nanti(9), [
    item("Mouse dan keyboard nirkabel", 6, "set", 275_000, "Pengganti perangkat loket yang rusak"),
  ]);

  // Id yang mudah dibaca dan tetap sama setiap seed, mis. /pr/plp-003-2026,
  // supaya tautan uji coba tidak putus saat server dimulai ulang.
  const rename = new Map<string, string>();
  let drafts = 0;
  for (const pr of db.prs) {
    const readable = pr.number
      ? pr.number.replace(/^(\d+)\/PR\/([^/]+)\/[^/]+\/(\d+)$/, (_, seq, unit, yr) => `${unit.toLowerCase()}-${seq}-${yr}`)
      : `draf-${++drafts}`;
    rename.set(pr.id, readable);
    pr.id = readable;
  }
  for (const n of db.notifications) n.prId = rename.get(n.prId) ?? n.prId;
  for (const a of db.audit) a.objectId = rename.get(a.objectId) ?? a.objectId;

  // Notifikasi lebih dari sehari dianggap sudah dibaca.
  for (const note of db.notifications) {
    if (now.getTime() - Date.parse(note.at) > DAY) note.read = true;
  }
  return db;
}
