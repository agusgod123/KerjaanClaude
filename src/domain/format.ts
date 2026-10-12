/** Format tampilan: rupiah tanpa desimal, waktu WITA (Asia/Makassar). */

export const TIME_ZONE = "Asia/Makassar";

const thousands = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Rp4.750.000 — tanpa spasi, sesuai penulisan baku. */
export function rupiah(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}Rp${thousands.format(Math.abs(Math.round(value)))}`;
}

/** Angka saja dengan titik ribuan, untuk isian dan tabel rapat. */
export function angka(value: number): string {
  return thousands.format(Math.round(value));
}

/** Rp4,75 jt — untuk ringkasan yang sempit. */
export function rupiahRingkas(value: number): string {
  const abs = Math.abs(value);
  const fmt = (n: number, unit: string) =>
    `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: n >= 100 ? 0 : n >= 10 ? 1 : 2 }).format(n)} ${unit}`;
  if (abs >= 1_000_000_000) return fmt(value / 1_000_000_000, "M");
  if (abs >= 1_000_000) return fmt(value / 1_000_000, "jt");
  if (abs >= 1_000) return fmt(value / 1_000, "rb");
  return rupiah(value);
}

/** Ambil angka dari isian bebas: "1.250.000", "Rp 1250000", "1,250,000". */
export function parseRupiah(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateLongFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 12 Okt 2026 */
export function tanggal(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Senin, 12 Oktober 2026 */
export function tanggalPanjang(iso: string): string {
  return dateLongFmt.format(new Date(iso));
}

/** 09.15 */
export function jam(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** 12 Okt 2026, 09.15 */
export function tanggalJam(iso: string): string {
  return `${tanggal(iso)}, ${jam(iso)}`;
}

/** Tanggal kalender (YYYY-MM-DD) menurut WITA. */
export function tanggalWita(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  return parts;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Lama sejak suatu waktu, tanpa kata "lalu": "15 menit", "3 jam", "2 hari". */
export function lama(fromIso: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(fromIso).getTime());
  if (ms < MINUTE) return "baru saja";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} menit`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)} jam`;
  const days = Math.floor(ms / DAY);
  if (days < 14) return `${days} hari`;
  if (days < 60) return `${Math.floor(days / 7)} minggu`;
  return `${Math.floor(days / 30)} bulan`;
}

/** "baru saja", "15 menit lalu", "2 hari lalu" */
export function lalu(fromIso: string, now: Date): string {
  const l = lama(fromIso, now);
  return l === "baru saja" ? l : `${l} lalu`;
}

/** Selisih hari kalender WITA dari hari ini ke tanggal target (negatif = lewat). */
export function selisihHari(targetDate: string, now: Date): number {
  const today = Date.parse(tanggalWita(now.toISOString()));
  const target = Date.parse(targetDate.slice(0, 10));
  return Math.round((target - today) / DAY);
}

/** "hari ini", "besok", "5 hari lagi", "lewat 2 hari" */
export function tenggat(targetDate: string, now: Date): string {
  const d = selisihHari(targetDate, now);
  if (d === 0) return "hari ini";
  if (d === 1) return "besok";
  if (d > 1) return `${d} hari lagi`;
  if (d === -1) return "lewat 1 hari";
  return `lewat ${-d} hari`;
}

/**
 * Hari kerja (Senin–Jumat, WITA) antara dua waktu, pecahan.
 * Dipakai untuk ukuran "median ≤ 3 hari kerja". Libur nasional belum dihitung.
 */
export function hariKerja(fromIso: string, toIso: string): number {
  const start = new Date(fromIso).getTime();
  const end = new Date(toIso).getTime();
  if (end <= start) return 0;
  // Geser ke WITA (UTC+8, tanpa DST) supaya batas hari sesuai kalender lokal.
  const offset = 8 * HOUR;
  let t = start + offset;
  const stop = end + offset;
  let worked = 0;
  while (t < stop) {
    const dayStart = Math.floor(t / DAY) * DAY;
    const next = Math.min(dayStart + DAY, stop);
    const weekday = new Date(dayStart).getUTCDay();
    if (weekday !== 0 && weekday !== 6) worked += next - t;
    t = next;
  }
  return worked / DAY;
}

/** 2,4 */
export function desimal(value: number, digits = 1): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function persen(value: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value * 100)}%`;
}

/** Inisial untuk avatar: "I Made Wirawan" → "MW" (lewati gelar/sapaan Bali). */
export function inisial(name: string): string {
  const skip = new Set(["i", "ni", "ida", "bagus", "ayu", "gusti", "ngurah", "dewa", "anak", "agung"]);
  const words = name.split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !skip.has(w.toLowerCase()));
  const pick = (meaningful.length ? meaningful : words).slice(-2);
  return pick.map((w) => w[0]!.toUpperCase()).join("");
}

/** Nama panggilan: "I Made Wirawan" → "Made" */
export function sapaan(name: string): string {
  const skip = new Set(["i", "ni", "ida", "bagus", "ayu", "gusti", "ngurah", "dewa", "anak", "agung"]);
  return name.split(/\s+/).find((w) => !skip.has(w.toLowerCase())) ?? name;
}
