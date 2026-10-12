import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { jam, lalu, selisihHari, tanggal, tanggalWita } from "@/domain/format";
import { Empty, PageHeader } from "@/components/ui/page";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getDb } from "@/server/db";
import { getViewer } from "@/server/session";
import { cn } from "@/lib/cn";
import { MarkAllRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotifikasiPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Notifikasi />
    </Suspense>
  );
}

async function Notifikasi() {
  const viewer = await getViewer();
  const db = getDb();
  const now = new Date();
  const mine = db.notifications
    .filter((n) => n.userId === viewer.user.id && db.prs.some((p) => p.id === n.prId))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 100);
  const unread = mine.filter((n) => !n.read).length;

  const groups = new Map<string, typeof mine>();
  for (const n of mine) {
    const d = selisihHari(tanggalWita(n.at), now);
    const key = d === 0 ? "Hari ini" : d === -1 ? "Kemarin" : "Sebelumnya";
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  return (
    <>
      <PageHeader
        title="Notifikasi"
        description={unread ? `${unread} belum dibaca. Salinan juga dikirim ke email Anda.` : "Semua sudah dibaca. Salinan juga dikirim ke email Anda."}
        actions={<MarkAllRead disabled={unread === 0} />}
      />
      {mine.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <Empty title="Belum ada notifikasi">Anda diberi tahu setiap kali PR Anda berpindah tahap, atau ada PR yang menunggu Anda.</Empty>
        </div>
      ) : (
        [...groups.entries()].map(([label, list]) => (
          <section key={label} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-ink-3">{label}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {list.map((n) => (
                <li key={n.id}>
                  <Link href={`/pr/${n.prId}`} className="flex gap-3 px-5 py-3.5 hover:bg-paper/70">
                    <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-merah")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block", n.read ? "text-ink-2" : "font-semibold text-ink")}>
                        {!n.read && <span className="sr-only">Belum dibaca: </span>}
                        {n.text}
                      </span>
                      <span className="text-sm text-ink-3">
                        {label === "Sebelumnya" ? `${tanggal(n.at)}, ${jam(n.at)}` : `${jam(n.at)} · ${lalu(n.at, now)}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
