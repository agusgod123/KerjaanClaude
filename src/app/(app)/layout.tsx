import { Suspense, type ReactNode } from "react";
import { MobileNav, MobileTopBar, Sidebar } from "@/components/shell/nav";
import { Wordmark } from "@/components/shell/logo";
import { getDb } from "@/server/db";
import { canCreate, navFor } from "@/server/nav";
import { getViewer } from "@/server/session";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<ShellFallback />}>
        <Shell />
      </Suspense>
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-9 lg:pb-16">{children}</main>
      </div>
    </>
  );
}

async function Shell() {
  const viewer = await getViewer();
  const db = getDb();
  const entries = navFor(db, viewer);
  const user = { name: viewer.user.name, title: viewer.title };
  const create = canCreate(viewer);
  const unread = entries.find((e) => e.key === "notifikasi")?.count ?? 0;
  return (
    <>
      <Sidebar entries={entries} user={user} canCreate={create} />
      <MobileTopBar unread={unread} />
      <MobileNav entries={entries} user={user} canCreate={create} />
    </>
  );
}

function ShellFallback() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-paper px-5 pt-6 lg:block">
        <Wordmark />
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-paper px-4 lg:hidden">
        <Wordmark compact />
      </header>
    </>
  );
}
