"use client";

import Link from "next/link";
import { PackageCheck, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { cancelPr, confirmReceipt, deleteDraft, submitExisting } from "@/server/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Panel } from "./panel";
import { ReasonDialog } from "./reason-dialog";
import { useServerAction } from "./use-action";

export function ReturnedPanel({ prId, by, note }: { prId: string; by: string; note?: string }) {
  return (
    <Panel turn title="Perlu revisi">
      <p className="text-ink-2">Dikembalikan oleh {by}:</p>
      {note && <p className="mt-2 rounded-lg bg-revisi-soft px-3 py-2 text-revisi">“{note}”</p>}
      <p className="mt-3 text-sm text-ink-3">Setelah direvisi, PR diajukan ulang dengan nomor yang sama dan mulai lagi dari tahap Diketahui.</p>
      <Link href={`/pr/${prId}/ubah`} className={buttonClass("primary", "lg", "mt-4 w-full")}>
        <Pencil /> Revisi PR
      </Link>
    </Panel>
  );
}

export function DraftPanel({ prId, ready }: { prId: string; ready: boolean }) {
  const { pending, run } = useServerAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Panel eyebrow="Draf" title="Belum diajukan">
      <p className="text-ink-2">Draf hanya terlihat oleh Anda. Nomor PR terbit saat diajukan.</p>
      <div className="mt-4 flex flex-col gap-2">
        {ready ? (
          <Button variant="primary" size="lg" className="w-full" disabled={pending} onClick={() => run(() => submitExisting(prId))}>
            Ajukan sekarang
          </Button>
        ) : null}
        <Link href={`/pr/${prId}/ubah`} className={buttonClass(ready ? "secondary" : "primary", ready ? "md" : "lg", "w-full")}>
          <Pencil /> Lanjutkan mengisi
        </Link>
        <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
          Hapus draf
        </Button>
      </div>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="Hapus draf ini?" description="Draf yang dihapus tidak bisa dikembalikan.">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button variant="danger-solid" disabled={pending} onClick={() => run(() => deleteDraft(prId), { goTo: () => "/pr?tab=draf" })}>
              Hapus draf
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

export interface ArrivedItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  received?: { qty: number; condition: string; note?: string };
}

export function ReceivePanel({ prId, items, arrivedLabel }: { prId: string; items: ArrivedItem[]; arrivedLabel: string }) {
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  const issues = items.filter((i) => i.received && (i.received.condition !== "baik" || i.received.qty < i.qty));
  return (
    <Panel turn title="Barang sudah tiba">
      <p className="text-ink-2">Dicatat Urusan Umum {arrivedLabel}. Periksa barangnya, lalu konfirmasi supaya PR selesai.</p>
      {issues.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-merah-soft px-3 py-2 text-sm text-merah-strong">
          {issues.map((i) => (
            <li key={i.id}>
              {i.description}: tiba {i.received!.qty} dari {i.qty} {i.unit}, kondisi {i.received!.condition}
            </li>
          ))}
        </ul>
      )}
      <Field label="Catatan penerimaan" optional className="mt-4">
        {(p) => <Textarea {...p} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <Button
        variant="primary"
        size="lg"
        icon={<PackageCheck />}
        className="mt-4 w-full"
        disabled={pending}
        onClick={() => run(() => confirmReceipt(prId, note.trim() || undefined))}
      >
        {pending ? "Menyimpan…" : "Konfirmasi sudah diterima"}
      </Button>
    </Panel>
  );
}

export function CancelButton({ prId }: { prId: string }) {
  const { pending, run } = useServerAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Batalkan PR
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Batalkan PR ini?"
        description="Penyetuju yang sedang memegang PR akan diberi tahu. PR yang dibatalkan tidak bisa diajukan ulang."
        confirmLabel="Batalkan PR"
        danger
        suggestions={["Sudah tidak dibutuhkan.", "Salah input, akan dibuat ulang."]}
        pending={pending}
        onConfirm={(reason) => run(() => cancelPr(prId, reason), { onOk: () => setOpen(false) })}
      />
    </>
  );
}
