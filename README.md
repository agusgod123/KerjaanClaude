# Pengadaan

Aplikasi web pengajuan pengadaan barang dan jasa, sesuai PRD "Aplikasi Pengajuan Pengadaan". Pemohon mengajukan dari HP atau laptop, PR mengalir otomatis ke penyetuju yang tepat sesuai nilai, dan setiap PR terhubung ke pos RKA.

**Status: prototipe UI yang bisa diklik dari awal sampai akhir.** Alur, aturan bisnis, dan semua layar sudah jalan dengan data contoh di memori. Database, login sungguhan, unggah berkas, email, dan push belum ada (lihat [Berikutnya](#berikutnya)).

## Menjalankan

```bash
pnpm install
pnpm dev
```

Buka http://localhost:3000. Halaman masuk menampilkan akun uji coba per peran; klik salah satu, atau masuk dengan NIP/email dan sandi `pengadaan`. Data contoh diisi ulang setiap server dimulai.

| Akun | Peran | Yang bisa dicoba |
| --- | --- | --- |
| Kadek Ayu Lestari | Pemohon, Staf IT | Revisi PR yang dikembalikan, lanjutkan draf, buat PR |
| Gede Pramana | Pemohon, Staf Pelayanan | Konfirmasi barang tiba |
| Ni Wayan Sukerti | Kepala Bidang Pelayanan | Tahap Diketahui |
| I Made Wirawan | Wakil Sekretaris + Ka. Urusan Keuangan | Rangkap jabatan: Diketahui lalu Verifikasi, pilih pos RKA dan lihat sisa pagu |
| I Nyoman Suarta | Sekretaris Badan | Persetujuan di bawah Rp5 jt, persetujuan ulang karena harga naik |
| Ida Bagus Ketut Wira | Kepala Badan | Persetujuan Rp5 jt ke atas dan anggaran khusus |
| Komang Juliana | Urusan Umum | Ambil PR, catat pembelian, catat barang tiba |
| Putu Eka Wijaya | SPI | Laporan, jejak waktu, ekspor Excel |
| Wayan Darma | Admin sistem | Data induk; tidak bisa menyetujui PR |

## Yang sudah ada

- **Beranda per peran.** Judul halaman adalah hal terpenting hari itu ("2 PR menunggu Anda"), bukan sapaan atau angka hiasan.
- **Buat PR bertahap** (barang dan jasa → keterangan → periksa): subtotal dan total otomatis, isian rupiah dengan titik ribuan, saran satuan, lampiran per item dengan foto dikecilkan di browser, isian tersimpan di perangkat sampai diajukan, salin dari PR sebelumnya, pratinjau alur persetujuan sebelum diajukan.
- **Detail PR**: status dan "di meja siapa, sejak kapan", rincian item, linimasa per tahap, riwayat lengkap, dan satu panel aksi sesuai peran.
- **Persetujuan**: Ketahui / Verifikasi / Setujui, Kembalikan dan Tolak dengan alasan wajib (ada saran alasan singkat). Verifikasi memilih pos RKA dengan meter sisa pagu, atau menandai anggaran khusus, dan langsung menunjukkan ke siapa PR diteruskan.
- **Pembelian dan penerimaan**: ambil PR, catat vendor dan harga beli (memicu persetujuan ulang bila naik > 10% atau menembus Rp5 jt), catat barang tiba per item, konfirmasi terima oleh pemohon.
- **Menunggu saya, PR saya, Pembelian, Anggaran, Laporan** (saringan, median waktu sampai disetujui, rata-rata per tahap, ekspor .xlsx), **Notifikasi**, **Data induk**.
- **Cetak PR** berlayout formulir lama dengan blok persetujuan elektronik dan QR, serta **halaman verifikasi publik** `/v/{kode}`.

Aturan bisnis PRD ada di `src/domain` dan `src/server/service.ts`, dan teruji (`pnpm test`): ambang Rp5.000.000 (tepat Rp5 jt ke Kepala Badan), anggaran khusus ke Kepala Badan, rangkap jabatan tercatat dua kali, pemohon kepala unit melewati Diketahui, revisi mulai lagi dari Diketahui dengan nomor yang sama, nomor `007/PR/IT/X/2026` per unit per tahun menurut WITA, sisa pagu, persetujuan ulang setelah realisasi, dan hak akses.

## Desain

**Palet tridatu yang nyaman di mata.** Merah, putih, hitam dipakai sebagai struktur, bukan hiasan:

| Tridatu | Token | Nilai | Peran |
| --- | --- | --- | --- |
| Putih | `paper` / `surface` | `#f4f1eb` / `#fcfbf8` | Latar kertas hangat, bukan putih murni, supaya tidak silau dipakai seharian |
| Hitam | `ink` | `#1f1b17` | Teks dan tombol utama. Arang hangat, kontras 15:1 tanpa sekeras hitam pekat |
| Merah | `merah` | `#a3302a` | Merah bata yang diredam, dipakai hemat: giliran Anda, hitungan yang menuntut tindakan, terlambat, tolak, fokus keyboard |

Status memakai lima nada redup (tunggu, revisi, jalan, tolak, netral) dan selalu disertai label. Palet bawaan Tailwind dimatikan supaya tidak ada warna di luar token. Semua pasangan teks/latar lolos WCAG AA; periksa dengan `pnpm cek:kontras`.

Huruf: **Plus Jakarta Sans**, karya Tokotype (Indonesia), di-host sendiri dari npm. Angka uang memakai angka tabular di tabel.

Prinsip yang dipegang:

- Satu layar, satu tindakan utama. Tombol hitam = lanjut; merah hanya untuk perhatian atau tolak.
- Selalu jawab "PR saya sampai mana?": jalur lima tahap di setiap baris, plus nama pemegang meja dan sudah berapa lama.
- Tanpa ilustrasi, gradien, atau statistik hiasan. Angka hanya yang dipakai untuk memutuskan (sisa pagu, median hari kerja vs target).
- Nyaman di HP: teks isian 16 px (Safari tidak memperbesar halaman), tombol aksi utama 48 px, navigasi bawah, panel dialog dari bawah, bilah "Giliran Anda" yang menunjuk ke panel aksi.

## Struktur

```
src/domain/        aturan murni: ambang, nomor PR, sisa pagu, format rupiah dan WITA
src/server/        data contoh, layanan alur (cek hak akses di setiap aksi), server actions
src/components/ui  komponen dasar: tombol, isian, status, dialog, toast
src/components/pr  daftar PR, form, panel aksi, linimasa, meter anggaran
src/app/(app)      halaman yang butuh login
src/app/masuk, v/, cetak/   halaman masuk, verifikasi publik, cetak
```

Next.js 16.4 (App Router, Cache Components), React 19, TypeScript ketat, Tailwind CSS 4, Radix untuk dialog dan menu, Zod untuk validasi server actions, ExcelJS, qrcode, Vitest.

Pemeriksaan: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm cek:kontras`.

## Berikutnya

Sesuai fase di PRD:

1. **Fondasi**: ganti `src/server/db.ts` (memori) dengan Drizzle + PostgreSQL; bentuk data sudah mengikuti tabel PRD. Login dengan Better Auth (sandi di-hash, ganti sandi pertama kali, batas percobaan) menggantikan cookie uji coba di `src/server/session.ts`. Impor pegawai, unit, jabatan, dan pos RKA dari Excel.
2. Unggah lampiran dan nota ke object storage lewat tautan berumur 5 menit (saat ini hanya nama dan ukuran berkas yang dicatat).
3. Email dan push untuk notifikasi, ringkasan harian 08.00 WITA, PWA.
4. PDF dari server dengan hash SHA-256 (saat ini cetak dari browser), delegasi Plh, tabel audit append-only di database.

Next.js mengumumkan rilis keamanan untuk 14 Oktober 2026; naikkan versi `next` ke patch tersebut sebelum pilot.
