import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Mark } from "@/components/shell/logo";
import { loginAs } from "@/server/actions";
import { getDb } from "@/server/db";
import { buildViewer } from "@/server/org";
import { waitingFor } from "@/server/service";
import { DEMO_PASSWORD } from "@/server/seed";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <div>
          <Mark className="size-11" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Masuk ke Pengadaan</h1>
          <p className="mt-2 text-ink-2">Ajukan kebutuhan barang dan jasa, dan pantau sampai barangnya Anda terima.</p>
          <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
            <LoginForm />
          </div>
          <p className="mt-4 text-sm text-ink-3">Lupa kata sandi? Hubungi Tim IT.</p>
        </div>

        <section aria-labelledby="demo" className="lg:pt-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="demo" className="font-bold">Akun uji coba</h2>
            <p className="text-sm text-ink-3">
              Sandi semua akun: <code className="rounded bg-sunken px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
            </p>
          </div>
          <p className="mt-1 text-sm text-ink-3">Pilih satu peran untuk mencoba alurnya. Data contoh direset saat server dimulai ulang.</p>
          <Suspense fallback={<div className="mt-4 h-[540px] rounded-xl border border-line bg-surface" />}>
            <DemoAccounts />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

const ROLE_HINT: Record<string, string> = {
  kadek: "Pemohon",
  gede: "Pemohon",
  wulan: "Pemohon",
  sukerti: "Atasan · Diketahui",
  made: "Rangkap · Diketahui dan Verifikasi",
  nyoman: "Persetujuan di bawah Rp5 jt",
  gus: "Persetujuan Rp5 jt ke atas",
  komang: "Urusan Umum · Pembelian",
  eka: "SPI · Akses baca dan ekspor",
  darma: "Admin · Tidak menyetujui PR",
};

async function DemoAccounts() {
  await connection();
  const db = getDb();
  const now = new Date();
  const ids = Object.keys(ROLE_HINT);
  return (
    <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {ids.map((id) => {
        const viewer = buildViewer(db, id, now);
        if (!viewer) return null;
        const waiting = waitingFor(db, viewer).length;
        const todo = db.prs.filter((p) => p.requesterId === id && (p.status === "dikembalikan" || p.status === "tiba")).length;
        const toBuy = viewer.roles.has("umum") ? db.prs.filter((p) => p.status === "disetujui").length : 0;
        const badge = waiting ? `${waiting} menunggu` : toBuy ? `${toBuy} siap dibeli` : todo ? `${todo} perlu tindakan` : null;
        return (
          <li key={id}>
            <form action={loginAs}>
              <input type="hidden" name="userId" value={id} />
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/70">
                <Avatar name={viewer.user.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{viewer.user.name}</span>
                  <span className="block truncate text-sm text-ink-3">
                    {viewer.title} — {ROLE_HINT[id]}
                  </span>
                </span>
                {badge && (
                  <span className="shrink-0 rounded-md bg-merah-soft px-2 py-0.5 text-sm font-semibold text-merah-strong">{badge}</span>
                )}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
