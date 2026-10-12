"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useTransition } from "react";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export interface FilterOptions {
  units: { id: string; name: string }[];
  lines: { id: string; label: string }[];
  statuses: { key: string; label: string }[];
}

/** Satu baris saringan di atas semua isi laporan; berlaku langsung tanpa tombol. */
export function ReportFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }
  const active = ["status", "unit", "pos", "dari", "sampai"].some((k) => params.get(k));
  const label = "mb-1 block text-xs font-semibold text-ink-3";

  return (
    <div className={cn("mb-6 grid grid-cols-2 gap-3 transition-opacity md:grid-cols-[repeat(5,minmax(0,1fr))_auto] md:items-end", pending && "opacity-60")}>
      <div className="col-span-2 md:col-span-1">
        <label className={label} htmlFor="f-status">Status</label>
        <Select id="f-status" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">Semua status</option>
          {options.statuses.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={label} htmlFor="f-unit">Unit</label>
        <Select id="f-unit" value={params.get("unit") ?? ""} onChange={(e) => set("unit", e.target.value)}>
          <option value="">Semua unit</option>
          {options.units.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={label} htmlFor="f-pos">Pos RKA</label>
        <Select id="f-pos" value={params.get("pos") ?? ""} onChange={(e) => set("pos", e.target.value)}>
          <option value="">Semua pos</option>
          <option value="khusus">Anggaran khusus</option>
          {options.lines.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={label} htmlFor="f-dari">Diajukan dari</label>
        <Input id="f-dari" type="date" value={params.get("dari") ?? ""} onChange={(e) => set("dari", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="f-sampai">sampai</label>
        <Input id="f-sampai" type="date" value={params.get("sampai") ?? ""} onChange={(e) => set("sampai", e.target.value)} />
      </div>
      <button
        type="button"
        onClick={() => start(() => router.replace(pathname, { scroll: false }))}
        disabled={!active}
        className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-sunken disabled:invisible md:col-span-1"
      >
        <X className="size-4" /> Hapus saringan
      </button>
    </div>
  );
}
