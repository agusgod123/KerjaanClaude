"use client";

import { Paperclip, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { persen, rupiah } from "@/domain/format";
import { cekPersetujuanUlang } from "@/domain/rules";
import type { ItemCondition } from "@/domain/types";
import { recordArrival, recordPurchase, takePurchase } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { cn } from "@/lib/cn";
import { Panel } from "./panel";
import { useServerAction } from "./use-action";

export interface BuyItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  realizedUnitPrice?: number;
}

export function TakePanel({ prId, neededBy }: { prId: string; neededBy: string }) {
  const { pending, run } = useServerAction();
  return (
    <Panel turn title="Siap dibeli">
      <p className="text-ink-2">Dibutuhkan {neededBy}. Ambil PR ini supaya pemohon tahu siapa yang membelikan.</p>
      <Button variant="primary" size="lg" icon={<ShoppingBag />} className="mt-4 w-full" disabled={pending} onClick={() => run(() => takePurchase(prId))}>
        Ambil untuk dibeli
      </Button>
    </Panel>
  );
}

export function PurchaseForm({
  prId,
  items,
  estimate,
  ceiling,
  today,
  initial,
}: {
  prId: string;
  items: BuyItem[];
  estimate: number;
  ceiling?: number;
  today: string;
  initial: { vendor?: string; purchasedOn?: string; receiptName?: string };
}) {
  const { pending, run } = useServerAction();
  const [vendor, setVendor] = useState(initial.vendor ?? "");
  const [date, setDate] = useState(initial.purchasedOn ?? today);
  const [receipt, setReceipt] = useState(initial.receiptName ?? "");
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, i.realizedUnitPrice ?? i.unitPrice])),
  );
  const [touched, setTouched] = useState(false);

  const realized = items.reduce((s, i) => s + Math.round(i.qty * (prices[i.id] ?? 0)), 0);
  const check = ceiling !== undefined && realized <= ceiling ? { needed: false } : cekPersetujuanUlang(estimate, realized);
  const diff = realized - estimate;

  function save() {
    setTouched(true);
    if (!vendor.trim() || !date || items.some((i) => !prices[i.id])) return;
    run(() => recordPurchase({ prId, vendor, purchasedOn: date, receiptName: receipt || undefined, prices }));
  }

  return (
    <Panel turn eyebrow="Pembelian Anda" title="Catat pembelian">
      <p className="text-ink-2">Isi harga yang benar-benar dibayar. Harga awal terisi dari estimasi.</p>
      <div className="mt-4 space-y-4">
        <Field label="Toko atau vendor" required error={touched && !vendor.trim() ? "Isi nama toko atau vendor." : undefined}>
          {(p) => <Input {...p} value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="mis. CV Sinar Office, Denpasar" />}
        </Field>
        <Field label="Tanggal beli" required>
          {(p) => <Input {...p} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-semibold">Harga beli per satuan</legend>
          {items.map((i) => (
            <div key={i.id}>
              <label htmlFor={`price-${i.id}`} className="mb-1 block text-sm text-ink-2">
                {i.description} <span className="text-ink-3">· {i.qty} {i.unit}, estimasi {rupiah(i.unitPrice)}</span>
              </label>
              <RupiahInput id={`price-${i.id}`} value={prices[i.id] ?? 0} onValueChange={(v) => setPrices((p) => ({ ...p, [i.id]: v }))} />
            </div>
          ))}
        </fieldset>
        <Field label="Foto nota" optional>
          {(p) => (
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-input px-3 text-ink-2 hover:bg-sunken">
              <Paperclip className="size-4 text-ink-3" />
              <span className="truncate">{receipt || "Pilih foto atau PDF"}</span>
              <input
                {...p}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setReceipt(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          )}
        </Field>

        <div className={cn("rounded-lg px-3 py-2.5", check.needed ? "bg-merah-soft" : "bg-sunken")}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-ink-2">Total harga beli</span>
            <span className="font-bold tabular">{rupiah(realized)}</span>
          </div>
          <p className={cn("mt-0.5 text-sm", check.needed ? "text-merah-strong" : "text-ink-3")}>
            {diff === 0
              ? "Sama dengan estimasi."
              : `${diff > 0 ? "Naik" : "Turun"} ${rupiah(Math.abs(diff))} (${persen(Math.abs(diff) / estimate)}) dari estimasi.`}
            {check.needed && " Perlu persetujuan ulang sebelum dicatat sebagai pembelian."}
          </p>
        </div>
      </div>
      <Button variant="primary" size="lg" className="mt-4 w-full" disabled={pending} onClick={save}>
        {pending ? "Menyimpan…" : check.needed ? "Kirim untuk persetujuan ulang" : "Simpan pembelian"}
      </Button>
    </Panel>
  );
}

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "baik", label: "Baik" },
  { value: "kurang", label: "Kurang" },
  { value: "rusak", label: "Rusak" },
];

export function ArrivalForm({ prId, items }: { prId: string; items: BuyItem[] }) {
  const { pending, run } = useServerAction();
  const [rows, setRows] = useState<Record<string, { qty: number; condition: ItemCondition; note: string }>>(
    Object.fromEntries(items.map((i) => [i.id, { qty: i.qty, condition: "baik" as ItemCondition, note: "" }])),
  );
  const set = (id: string, patch: Partial<(typeof rows)[string]>) => setRows((r) => ({ ...r, [id]: { ...r[id]!, ...patch } }));
  return (
    <Panel turn eyebrow="Pembelian Anda" title="Catat barang tiba">
      <p className="text-ink-2">Catat per item. Pemohon diminta mengonfirmasi setelah ini.</p>
      <ul className="mt-4 space-y-4">
        {items.map((i) => {
          const r = rows[i.id]!;
          return (
            <li key={i.id} className="rounded-lg border border-line p-3">
              <p className="font-semibold">{i.description}</p>
              <p className="text-sm text-ink-3">
                Dipesan {i.qty} {i.unit}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Jumlah tiba">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={r.qty}
                      onChange={(e) => set(i.id, { qty: Number(e.target.value), condition: Number(e.target.value) < i.qty ? "kurang" : r.condition })}
                    />
                  )}
                </Field>
                <Field label="Kondisi">
                  {(p) => (
                    <Select {...p} value={r.condition} onChange={(e) => set(i.id, { condition: e.target.value as ItemCondition })}>
                      {CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              {r.condition !== "baik" && (
                <Field label="Keterangan" className="mt-2">
                  {(p) => <Input {...p} value={r.note} onChange={(e) => set(i.id, { note: e.target.value })} placeholder="mis. 1 unit retak, diganti minggu depan" />}
                </Field>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        variant="primary"
        size="lg"
        icon={<Truck />}
        className="mt-4 w-full"
        disabled={pending}
        onClick={() =>
          run(() =>
            recordArrival({
              prId,
              items: Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, { qty: r.qty, condition: r.condition, note: r.note || undefined }])),
            }),
          )
        }
      >
        {pending ? "Menyimpan…" : "Catat barang tiba"}
      </Button>
    </Panel>
  );
}
