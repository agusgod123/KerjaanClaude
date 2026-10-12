// Periksa kontras WCAG pasangan warna token di src/app/globals.css.
// Pakai: node scripts/kontras.mjs   (keluar dengan kode 1 bila ada yang gagal)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const token = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Token --color-${name} tidak ditemukan`);
  return m[1];
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => lin(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [teks, latar, minimal]  4.5 = teks biasa, 3 = batas komponen (WCAG 1.4.11)
const pairs = [
  ["ink", "paper", 4.5], ["ink", "surface", 4.5], ["ink-2", "paper", 4.5], ["ink-2", "sunken", 4.5],
  ["ink-3", "paper", 4.5], ["ink-3", "surface", 4.5], ["ink-3", "sunken", 4.5],
  ["merah", "surface", 4.5], ["merah-strong", "merah-soft", 4.5], ["white", "merah", 4.5], ["surface", "ink", 4.5],
  ["tunggu", "tunggu-soft", 4.5], ["revisi", "revisi-soft", 4.5], ["jalan", "jalan-soft", 4.5],
  ["line-input", "surface", 3], ["merah", "surface", 3], ["meter-2", "surface", 3],
];

let failed = 0;
for (const [fg, bg, min] of pairs) {
  const r = ratio(fg === "white" ? "#ffffff" : token(fg), token(bg));
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "lolos" : "GAGAL"}  ${fg.padEnd(13)} di ${bg.padEnd(12)} ${r.toFixed(2)}:1 (min ${min})`);
}
process.exit(failed ? 1 : 0);
