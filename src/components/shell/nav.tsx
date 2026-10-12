"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, MoreHorizontal, Plus, Repeat2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { logout } from "@/server/actions";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { NAV, isActive, type NavEntry } from "./nav-items";
import { Wordmark } from "./logo";

interface ShellUser {
  name: string;
  title: string;
}

function Count({ value, urgent, className }: { value?: number; urgent?: boolean; className?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold tabular",
        urgent ? "bg-merah text-white" : "bg-sunken text-ink-2 ring-1 ring-line ring-inset",
        className,
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

/* ---------------- desktop ---------------- */

export function Sidebar({ entries, user, canCreate }: { entries: NavEntry[]; user: ShellUser; canCreate: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="inline-flex rounded-lg" aria-label="Pengadaan, ke beranda">
          <Wordmark />
        </Link>
      </div>
      {canCreate && (
        <div className="px-4 pb-4">
          <Link href="/pr/baru" className={buttonClass("primary", "md", "w-full")}>
            <Plus /> Buat PR
          </Link>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Menu utama">
        <ul className="flex flex-col gap-0.5">
          {entries.map((e) => {
            const item = NAV[e.key];
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <li key={e.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-base font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink",
                    active && "bg-surface font-semibold text-ink ring-1 ring-line hover:bg-surface",
                  )}
                >
                  {active && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-merah" aria-hidden />}
                  <Icon className={cn("size-[18px]", active ? "text-ink" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.9} />
                  <span className="flex-1">{item.label}</span>
                  <Count value={e.count} urgent={e.urgent} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line p-3">
        <UserMenu user={user} />
        <p className="mt-2 px-2 text-xs text-ink-3">Mode uji coba · data contoh</p>
      </div>
    </aside>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sunken data-[state=open]:bg-sunken">
        <Avatar name={user.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-xs text-ink-3">{user.title}</span>
        </span>
        <MoreHorizontal className="size-4 text-ink-3" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-xl border border-line bg-surface p-1 shadow-overlay"
        >
          <DropdownMenu.Item asChild>
            <Link href="/masuk" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-ink outline-none data-[highlighted]:bg-sunken">
              <Repeat2 className="size-4 text-ink-3" /> Ganti akun uji coba
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => void logout()}
            className="flex h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-ink outline-none data-[highlighted]:bg-sunken"
          >
            <LogOut className="size-4 text-ink-3" /> Keluar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ---------------- HP ---------------- */

export function MobileTopBar({ unread }: { unread: number }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
      <Link href="/" aria-label="Pengadaan, ke beranda" className="rounded-lg">
        <Wordmark compact />
      </Link>
      <Link
        href="/notifikasi"
        className="relative grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-sunken"
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      >
        <Bell className="size-5" strokeWidth={1.9} />
        {unread > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-merah ring-2 ring-paper" />}
      </Link>
    </header>
  );
}

export function MobileNav({ entries, user, canCreate }: { entries: NavEntry[]; user: ShellUser; canCreate: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Dua menu teratas sesuai peran tampil langsung; sisanya di "Lainnya".
  const main = entries.filter((e) => e.key !== "notifikasi");
  const shown = main.slice(0, canCreate ? 3 : 4);
  const rest = entries.filter((e) => !shown.includes(e));
  const left = shown.slice(0, 2);
  const right = shown.slice(2);

  const tab = (e: NavEntry) => {
    const item = NAV[e.key];
    const Icon = item.icon;
    const active = isActive(item.href, pathname);
    return (
      <Link
        key={e.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn("relative flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-xs font-medium", active ? "text-ink" : "text-ink-3")}
      >
        {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-merah" aria-hidden />}
        <span className="relative">
          <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
          {e.count ? <Count value={e.count} urgent={e.urgent} className="absolute -top-1.5 left-3.5 h-4 min-w-4 px-1 text-[10px]" /> : null}
        </span>
        {item.label.replace(" saya", "")}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-surface pb-safe lg:hidden [body:has([data-focus-mode])_&]:hidden"
      >
        {left.map(tab)}
        {canCreate && (
          <Link href="/pr/baru" className="flex flex-1 flex-col items-center gap-1 pt-1.5 pb-1.5 text-xs font-semibold text-ink">
            <span className="grid h-8 w-12 place-items-center rounded-lg bg-ink text-surface">
              <Plus className="size-5" strokeWidth={2.4} />
            </span>
            Buat PR
          </Link>
        )}
        {right.map(tab)}
        <button
          onClick={() => setOpen(true)}
          className={cn("flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-xs font-medium", open ? "text-ink" : "text-ink-3")}
        >
          <MoreHorizontal className="size-[22px]" strokeWidth={1.8} />
          Lainnya
        </button>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Menu">
          <div className="-mx-2 flex items-center gap-3 rounded-lg px-2 pb-4">
            <Avatar name={user.name} className="size-10" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-ink-3">{user.title}</p>
            </div>
          </div>
          <ul className="-mx-2 flex flex-col border-t border-line pt-2">
            {rest.map((e) => {
              const item = NAV[e.key];
              const Icon = item.icon;
              return (
                <li key={e.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center gap-3 rounded-lg px-2 font-medium hover:bg-sunken"
                  >
                    <Icon className="size-5 text-ink-3" strokeWidth={1.9} />
                    <span className="flex-1">{item.label}</span>
                    <Count value={e.count} urgent={e.urgent} />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/masuk" onClick={() => setOpen(false)} className="flex h-12 items-center gap-3 rounded-lg px-2 font-medium hover:bg-sunken">
                <Repeat2 className="size-5 text-ink-3" /> Ganti akun uji coba
              </Link>
            </li>
            <li>
              <form action={logout}>
                <button className="flex h-12 w-full items-center gap-3 rounded-lg px-2 font-medium hover:bg-sunken">
                  <LogOut className="size-5 text-ink-3" /> Keluar
                </button>
              </form>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
