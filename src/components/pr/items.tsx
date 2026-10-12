import { Link2, Paperclip } from "lucide-react";
import { angka, rupiah } from "@/domain/format";
import { subtotal, totalEstimasi, totalRealisasi } from "@/domain/rules";
import type { PrItem } from "@/domain/types";
import { cn } from "@/lib/cn";

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ukuran(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function lineTotal(item: PrItem, realized: boolean): number {
  return realized && item.realizedUnitPrice !== undefined
    ? Math.round(item.qty * item.realizedUnitPrice)
    : subtotal(item);
}

const CONDITION: Record<string, string> = { baik: "Baik", rusak: "Rusak", kurang: "Kurang" };

function Extras({ item }: { item: PrItem }) {
  const received = item.received;
  const issue = received && (received.condition !== "baik" || received.qty < item.qty);
  return (
    <>
      {item.reason && <p className="mt-1 text-sm text-ink-2">{item.reason}</p>}
      {(item.link || item.attachments.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sunken px-2 text-sm font-medium text-ink-2 hover:text-ink"
            >
              <Link2 className="size-3.5" /> {host(item.link)}
            </a>
          )}
          {item.attachments.map((a) => (
            <span key={a.id} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sunken px-2 text-sm text-ink-2" title={a.name}>
              <Paperclip className="size-3.5" />
              <span className="max-w-40 truncate">{a.name}</span>
              <span className="text-ink-3">{ukuran(a.size)}</span>
            </span>
          ))}
        </div>
      )}
      {received && (
        <p className={cn("mt-2 text-sm font-medium", issue ? "text-merah" : "text-jalan")}>
          Tiba {angka(received.qty)} dari {angka(item.qty)} {item.unit} · {CONDITION[received.condition]}
          {received.note && <span className="font-normal text-ink-2"> — {received.note}</span>}
        </p>
      )}
    </>
  );
}

export function ItemsTable({ items, showRealized }: { items: PrItem[]; showRealized: boolean }) {
  const estimate = totalEstimasi(items);
  const realized = totalRealisasi(items);
  return (
    <section className="rounded-xl border border-line bg-surface" aria-labelledby="rincian">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
        <h2 id="rincian" className="font-bold">
          Rincian <span className="font-semibold text-ink-3">{items.length} item</span>
        </h2>
      </div>

      {/* HP: daftar bertumpuk */}
      <ol className="divide-y divide-line md:hidden">
        {items.map((item, i) => (
          <li key={item.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-semibold">
                <span className="mr-1.5 text-ink-3 tabular">{i + 1}.</span>
                {item.description}
              </p>
              <p className="shrink-0 font-semibold tabular">{rupiah(lineTotal(item, showRealized))}</p>
            </div>
            <p className="mt-0.5 text-sm text-ink-3 tabular">
              {angka(item.qty)} {item.unit} × {rupiah(item.unitPrice)} · {item.kind === "jasa" ? "Jasa" : "Barang"}
              {showRealized && item.realizedUnitPrice !== undefined && (
                <span className="text-ink-2"> · dibeli {rupiah(item.realizedUnitPrice)}</span>
              )}
            </p>
            <Extras item={item} />
          </li>
        ))}
      </ol>

      {/* Laptop: tabel */}
      <table className="hidden w-full text-left md:table">
        <thead>
          <tr className="border-b border-line text-sm text-ink-3">
            <th className="w-10 py-2.5 pl-5 font-medium">No</th>
            <th className="py-2.5 pr-4 font-medium">Barang atau jasa</th>
            <th className="py-2.5 pr-4 text-right font-medium">Jumlah</th>
            <th className="py-2.5 pr-4 text-right font-medium">{showRealized ? "Estimasi" : "Harga satuan"}</th>
            {showRealized && <th className="py-2.5 pr-4 text-right font-medium">Harga beli</th>}
            <th className="py-2.5 pr-5 text-right font-medium">{showRealized ? "Subtotal beli" : "Subtotal"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line align-top">
          {items.map((item, i) => (
            <tr key={item.id}>
              <td className="py-4 pl-5 text-ink-3 tabular">{i + 1}</td>
              <td className="py-4 pr-4">
                <p className="font-semibold">{item.description}</p>
                <p className="text-sm text-ink-3">{item.kind === "jasa" ? "Jasa" : "Barang"}</p>
                <Extras item={item} />
              </td>
              <td className="py-4 pr-4 text-right whitespace-nowrap tabular">
                {angka(item.qty)} {item.unit}
              </td>
              <td className="py-4 pr-4 text-right tabular">{rupiah(item.unitPrice)}</td>
              {showRealized && (
                <td className="py-4 pr-4 text-right tabular">
                  {item.realizedUnitPrice !== undefined ? rupiah(item.realizedUnitPrice) : "—"}
                </td>
              )}
              <td className="py-4 pr-5 text-right font-semibold tabular">{rupiah(lineTotal(item, showRealized))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="space-y-1 border-t border-line px-5 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold">Total estimasi</dt>
          <dd className="text-lg font-bold tabular">{rupiah(estimate)}</dd>
        </div>
        {showRealized && (
          <div className="flex items-baseline justify-between gap-4 text-ink-2">
            <dt>Total harga beli</dt>
            <dd className="font-semibold tabular">
              {rupiah(realized)}
              <span className={cn("ml-2 text-sm", realized > estimate ? "text-merah" : "text-ink-3")}>
                {realized === estimate ? "sama" : `${realized > estimate ? "+" : "−"}${rupiah(Math.abs(realized - estimate))}`}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
