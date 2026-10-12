"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Link2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { angka, rupiah, tanggal } from "@/domain/format";
import { penyetujuAkhir } from "@/domain/rules";
import { saveDraft, submitPr, type DraftPayload } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { useToast } from "@/components/ui/toast";
import { compressImage } from "@/lib/compress";
import { cn } from "@/lib/cn";

import { blankItem, type Attachment, type FormValues, type ItemDraft, type PrFormProps } from "./form-model";

const SATUAN = ["unit", "buah", "set", "paket", "rim", "roll", "meter", "batang", "botol", "keping", "lembar", "dus", "kali", "bulan", "orang"];

const qtyOf = (q: string) => {
  const n = Number.parseFloat(q.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function ukuran(bytes: number) {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

type ItemErrors = Partial<Record<"description" | "qty" | "unit" | "unitPrice" | "reason", string>>;

function validateItems(items: ItemDraft[]): ItemErrors[] {
  return items.map((it) => {
    const e: ItemErrors = {};
    if (!it.description.trim()) e.description = "Isi nama barang atau jasa.";
    if (!(qtyOf(it.qty) > 0)) e.qty = "Lebih dari 0.";
    if (!it.unit.trim()) e.unit = "Isi satuan.";
    if (!(it.unitPrice > 0)) e.unitPrice = "Isi harga perkiraan.";
    if (!it.reason.trim()) e.reason = "Tulis singkat untuk apa.";
    return e;
  });
}

const STEPS = ["Barang dan jasa", "Keterangan", "Periksa dan ajukan"] as const;
const LOCAL_KEY = "pengadaan:pr-baru";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Isian tersimpan yang layak ditawarkan untuk dilanjutkan, atau null. */
function readSaved(): string | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormValues;
    return parsed.items?.some((i) => i.description || i.unitPrice) ? raw : null;
  } catch {
    return null;
  }
}

/* ---------- komponen ---------- */

export function PrForm({ prId, mode, initial, today, lines, route, recent, returnNote }: PrFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(initial);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // PR baru: isian disimpan di perangkat supaya tidak hilang bila halaman tertutup.
  const saved = useSyncExternalStore(subscribeStorage, readSaved, () => null);
  const pristine = values === initial;
  const offerRestore = mode === "baru" && !dismissed && pristine && saved !== null;
  useEffect(() => {
    if (mode !== "baru" || pristine) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(values));
      } catch {
        /* penyimpanan tidak tersedia: lanjut tanpa autosimpan */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [values, mode, pristine]);

  const total = values.items.reduce((s, it) => s + Math.round(qtyOf(it.qty) * it.unitPrice), 0);
  const itemErrors = useMemo(() => validateItems(values.items), [values.items]);
  const itemsValid = itemErrors.every((e) => Object.keys(e).length === 0);
  const neededError = !values.neededBy ? "Pilih tanggal." : values.neededBy < today ? "Tanggal sudah lewat." : undefined;

  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    setValues((v) => ({ ...v, items: v.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }));

  function go(to: number) {
    if (to > step) {
      if (step === 0 && !itemsValid) {
        setShowErrors(true);
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
        return;
      }
      if (step === 1 && neededError) {
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    setStep(to);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function payload(): DraftPayload {
    return {
      prId,
      neededBy: values.neededBy,
      budgetLineId: values.budgetLineId || undefined,
      note: values.note || undefined,
      items: values.items.map((it) => ({
        id: it.id,
        description: it.description,
        kind: it.kind,
        qty: qtyOf(it.qty),
        unit: it.unit,
        unitPrice: it.unitPrice,
        reason: it.reason,
        link: it.link || undefined,
        attachments: it.attachments.map(({ name, size, type }) => ({ name, size, type })),
      })),
    };
  }

  async function send(kind: "draft" | "submit") {
    setPending(true);
    const r = kind === "submit" ? await submitPr(payload()) : await saveDraft(payload());
    setPending(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    if (mode === "baru") {
      try {
        window.localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* abaikan */
      }
    }
    toast(r.message ?? "Tersimpan.");
    router.push(`/pr/${r.prId}`);
  }

  const final = penyetujuAkhir(total, false);

  return (
    <div data-focus-mode className="max-w-3xl pb-28" ref={topRef}>
      {/* Langkah */}
      <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Langkah">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "now" : "next";
          return (
            <li key={label} className={cn("flex min-w-0 items-center gap-2", i < STEPS.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => i < step && go(i)}
                disabled={i >= step}
                aria-current={state === "now" ? "step" : undefined}
                className={cn("flex min-w-0 items-center gap-2 rounded-md", i < step && "hover:text-ink")}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    state === "done" && "bg-ink text-surface",
                    state === "now" && "bg-merah text-white",
                    state === "next" && "bg-sunken text-ink-3 ring-1 ring-line-strong ring-inset",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("truncate font-semibold", state === "next" ? "text-ink-3" : "text-ink", state !== "now" && "hidden sm:inline")}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px min-w-4 flex-1 bg-line-strong" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {returnNote && step === 0 && (
        <div className="mb-5 rounded-xl bg-revisi-soft px-4 py-3 text-revisi">
          <p className="text-sm font-semibold">Dikembalikan oleh {returnNote.by}</p>
          <p className="mt-0.5">“{returnNote.note}”</p>
        </div>
      )}

      {offerRestore && step === 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-ink-2">Ada isian PR yang belum diajukan di perangkat ini.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDismissed(true);
                try {
                  window.localStorage.removeItem(LOCAL_KEY);
                } catch {
                  /* abaikan */
                }
              }}
            >
              Abaikan
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setValues(JSON.parse(saved!) as FormValues);
                setDismissed(true);
              }}
            >
              Lanjutkan isian
            </Button>
          </div>
        </div>
      )}

      {/* Langkah 1 */}
      {step === 0 && (
        <section aria-labelledby="judul-item">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="judul-item" className="text-lg font-bold">
                Apa yang dibutuhkan?
              </h2>
              <p className="text-ink-2">Satu baris per barang atau jasa. Subtotal dan total dihitung otomatis.</p>
            </div>
            {mode === "baru" && recent.length > 0 && (
              <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => setCopyOpen(true)}>
                Salin dari PR sebelumnya
              </Button>
            )}
          </div>

          <ol className="space-y-4">
            {values.items.map((it, idx) => (
              <ItemCard
                key={it.key}
                index={idx}
                item={it}
                errors={showErrors ? itemErrors[idx]! : {}}
                canRemove={values.items.length > 1}
                onChange={(patch) => setItem(it.key, patch)}
                onRemove={() => setValues((v) => ({ ...v, items: v.items.filter((x) => x.key !== it.key) }))}
              />
            ))}
          </ol>
          <Button
            variant="secondary"
            icon={<Plus />}
            className="mt-4 w-full border-dashed"
            onClick={() => {
              setValues((v) => ({ ...v, items: [...v.items, blankItem()] }));
              setTimeout(() => document.querySelector<HTMLInputElement>("ol > li:last-child input")?.focus(), 50);
            }}
          >
            Tambah item
          </Button>
        </section>
      )}

      {/* Langkah 2 */}
      {step === 1 && (
        <section aria-labelledby="judul-ket" className="rounded-xl border border-line bg-surface p-5">
          <h2 id="judul-ket" className="text-lg font-bold">
            Kapan dan untuk apa
          </h2>
          <div className="mt-4 space-y-5">
            <Field label="Tanggal dibutuhkan" required error={showErrors ? neededError : undefined} hint="Beri waktu untuk persetujuan dan pembelian.">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  min={today}
                  value={values.neededBy}
                  onChange={(e) => setValues((v) => ({ ...v, neededBy: e.target.value }))}
                  className="sm:max-w-60"
                />
              )}
            </Field>
            <Field label="Pos RKA" optional hint="Kalau tidak tahu, biarkan kosong. Urusan Keuangan yang menetapkan saat verifikasi.">
              {(p) => (
                <Select {...p} value={values.budgetLineId} onChange={(e) => setValues((v) => ({ ...v, budgetLineId: e.target.value }))}>
                  <option value="">Belum tahu</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Catatan untuk pembeli" optional hint="mis. merek yang cocok dengan perangkat lama, atau toko yang pernah dipakai.">
              {(p) => <Textarea {...p} rows={3} value={values.note} onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))} />}
            </Field>
          </div>
        </section>
      )}

      {/* Langkah 3 */}
      {step === 2 && (
        <section aria-labelledby="judul-periksa" className="space-y-5">
          <div className="rounded-xl border border-line bg-surface">
            <h2 id="judul-periksa" className="border-b border-line px-5 py-3.5 font-bold">
              Ringkasan
            </h2>
            <ul className="divide-y divide-line">
              {values.items.map((it, i) => (
                <li key={it.key} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className="mr-1.5 text-ink-3 tabular">{i + 1}.</span>
                      {it.description}
                    </p>
                    <p className="text-sm text-ink-3 tabular">
                      {it.qty} {it.unit} × {rupiah(it.unitPrice)}
                      {it.attachments.length > 0 && ` · ${it.attachments.length} lampiran`}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular">{rupiah(Math.round(qtyOf(it.qty) * it.unitPrice))}</p>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-sm">
              <dt className="text-ink-3">Dibutuhkan</dt>
              <dd>{values.neededBy ? tanggal(values.neededBy) : "—"}</dd>
              <dt className="text-ink-3">Pos RKA</dt>
              <dd>{lines.find((l) => l.id === values.budgetLineId)?.label ?? "Ditetapkan Urusan Keuangan"}</dd>
              {values.note && (
                <>
                  <dt className="text-ink-3">Catatan</dt>
                  <dd>{values.note}</dd>
                </>
              )}
              <dt className="pt-2 text-base font-semibold text-ink">Total</dt>
              <dd className="pt-2 text-right text-lg font-bold tabular">{rupiah(total)}</dd>
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-bold">Alur persetujuan</h3>
            <p className="text-sm text-ink-3">Ditentukan otomatis dari unit Anda dan total nilai.</p>
            <ol className="mt-4 space-y-3">
              <RouteStep n={1} title="Diketahui" who={route.diketahui.skipped ? "Dilewati, Anda kepala unit" : `${route.diketahui.names} · ${route.diketahui.title}`} />
              <RouteStep n={2} title="Verifikasi" who={`${route.verifikasi.names} · ${route.verifikasi.title}`} />
              <RouteStep
                n={3}
                title="Disetujui"
                who={`${final.kind === "kepala_badan" ? route.kepala_badan : route.sekretaris} · ${final.kind === "kepala_badan" ? "Kepala Badan" : "Sekretaris Badan"}`}
                note={`${final.basis}. Bila Keuangan menandai anggaran khusus, naik ke Kepala Badan.`}
              />
            </ol>
          </div>
        </section>
      )}

      {/* Bilah aksi */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur lg:left-64">
        <div className="mx-auto max-w-[1120px] px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-3">
              Total · {values.items.length} item
            </p>
            <p className="truncate text-lg leading-tight font-bold tabular">{rupiah(total)}</p>
          </div>
          {step > 0 ? (
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => go(step - 1)} aria-label="Kembali">
              <span className="hidden sm:inline">Kembali</span>
            </Button>
          ) : (
            mode !== "revisi" && (
              <Button variant="ghost" onClick={() => send("draft")} disabled={pending}>
                Simpan draf
              </Button>
            )
          )}
          {step < 2 ? (
            <Button variant="primary" size="lg" onClick={() => go(step + 1)}>
              Lanjut
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={() => send("submit")} disabled={pending}>
              {pending ? "Mengajukan…" : mode === "revisi" ? "Ajukan ulang" : "Ajukan PR"}
            </Button>
          )}
          </div>
        </div>
      </div>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent title="Salin dari PR sebelumnya" description="Item disalin, lalu Anda bisa mengubah jumlah dan harganya.">
          <ul className="-mx-2">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start rounded-lg px-2 py-2.5 text-left hover:bg-sunken"
                  onClick={() => {
                    setCopyOpen(false);
                    router.push(`/pr/baru?salin=${r.id}`);
                  }}
                >
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-sm text-ink-3 tabular">{r.number}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RouteStep({ n, title, who, note }: { n: number; title: string; who: string; note?: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-bold text-ink-2">{n}</span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-ink-2">{who}</p>
        {note && <p className="text-sm text-ink-3">{note}</p>}
      </div>
    </li>
  );
}

function ItemCard({
  index,
  item,
  errors,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  item: ItemDraft;
  errors: ItemErrors;
  canRemove: boolean;
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const sub = Math.round(qtyOf(item.qty) * item.unitPrice);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const out: Attachment[] = [];
    for (const f of Array.from(files).slice(0, 5)) {
      const c = await compressImage(f);
      out.push({ name: c.name, size: c.size, type: c.type, original: c.size < f.size ? f.size : undefined });
    }
    onChange({ attachments: [...item.attachments, ...out].slice(0, 10) });
    setBusy(false);
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink-2">Item {index + 1}</p>
        {canRemove && (
          <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={onRemove} className="-mr-2 text-ink-3">
            Hapus
          </Button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-4">
        <Field label="Nama barang atau jasa" required error={errors.description} className="col-span-6 sm:col-span-4">
          {(p) => (
            <Input {...p} value={item.description} placeholder="mis. Toner printer HP 107A" onChange={(e) => onChange({ description: e.target.value })} />
          )}
        </Field>
        <div className="col-span-6 flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold">Jenis</span>
          <div className="grid h-11 grid-cols-2 gap-1 rounded-lg bg-sunken p-1" role="radiogroup" aria-label="Jenis">
            {(["barang", "jasa"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={item.kind === k}
                onClick={() => onChange({ kind: k })}
                className={cn(
                  "rounded-md text-sm font-semibold capitalize transition-colors",
                  item.kind === k ? "bg-surface text-ink ring-1 ring-line" : "text-ink-3 hover:text-ink",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <Field label="Jumlah" required error={errors.qty} className="col-span-2 sm:col-span-1">
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              value={item.qty}
              onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d.,]/g, "") })}
              className="text-right tabular"
            />
          )}
        </Field>
        <Field label="Satuan" required error={errors.unit} className="col-span-4 sm:col-span-2">
          {(p) => (
            <>
              <Input {...p} list="satuan" value={item.unit} placeholder="unit, rim, paket" onChange={(e) => onChange({ unit: e.target.value })} />
              <datalist id="satuan">
                {SATUAN.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Harga satuan" required error={errors.unitPrice} hint="Perkiraan, boleh dibulatkan." className="col-span-6 sm:col-span-3">
          {(p) => <RupiahInput {...p} value={item.unitPrice} onValueChange={(v) => onChange({ unitPrice: v })} />}
        </Field>
        <p className="col-span-6 -mt-2 flex items-baseline justify-between text-sm">
          <span className="text-ink-3">
            {item.qty || 0} {item.unit || "satuan"} × {rupiah(item.unitPrice)}
          </span>
          <span className="font-semibold tabular">Subtotal {rupiah(sub)}</span>
        </p>
        <Field label="Alasan kebutuhan" required error={errors.reason} className="col-span-6">
          {(p) => (
            <Textarea {...p} rows={2} value={item.reason} placeholder="mis. Stok toner ruang administrasi habis" onChange={(e) => onChange({ reason: e.target.value })} />
          )}
        </Field>
        <Field label="Tautan referensi harga" optional className="col-span-6">
          {(p) => (
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <Input {...p} type="url" inputMode="url" value={item.link} placeholder="https://" onChange={(e) => onChange({ link: e.target.value })} className="pl-9" />
            </div>
          )}
        </Field>
        <div className="col-span-6">
          <p className="mb-1.5 text-sm font-semibold">
            Lampiran <span className="font-normal text-ink-3">opsional · foto, screenshot harga, PDF</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {item.attachments.map((a, i) => (
              <span key={`${a.name}-${i}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sunken pr-1 pl-3 text-sm text-ink-2">
                <Paperclip className="size-3.5 text-ink-3" />
                <span className="max-w-44 truncate">{a.name}</span>
                <span className="text-ink-3">
                  {a.original ? `${ukuran(a.original)} → ${ukuran(a.size)}` : ukuran(a.size)}
                </span>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-line hover:text-ink"
                  aria-label={`Hapus lampiran ${a.name}`}
                  onClick={() => onChange({ attachments: item.attachments.filter((_, j) => j !== i) })}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-input px-3 text-sm font-semibold text-ink-2 hover:bg-sunken focus-within:outline-2 focus-within:outline-merah">
              <Plus className="size-4" />
              {busy ? "Mengecilkan foto…" : "Tambah lampiran"}
              <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Subtotal item {index + 1}: {angka(sub)} rupiah
      </p>
    </li>
  );
}
