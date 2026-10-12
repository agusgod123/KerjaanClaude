"use client";

import { CornerUpLeft, X } from "lucide-react";
import { useMemo, useState } from "react";
import { persen, rupiah } from "@/domain/format";
import { penyetujuAkhir } from "@/domain/rules";
import { STEP_VERB } from "@/domain/status";
import type { StepKind } from "@/domain/types";
import { actOnPr } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { BudgetMeter, type MeterData } from "./budget-meter";
import { Panel } from "./panel";
import { ReasonDialog } from "./reason-dialog";
import { useServerAction } from "./use-action";

export interface LineOption extends MeterData {
  id: string;
  code: string;
  name: string;
  unitName: string;
  mine: boolean;
}

export interface ApprovalPanelProps {
  prId: string;
  kind: StepKind;
  total: number;
  basis?: string;
  /** Persetujuan ulang setelah harga beli naik */
  reapproval?: { estimate: number; realized: number; reason: string };
  /** Pemegang tahap berikutnya juga pengguna ini (rangkap jabatan) */
  nextAlsoYou?: string;
  /** Untuk verifikasi */
  lines?: LineOption[];
  proposedLineId?: string;
  approverNames?: { sekretaris: string; kepala_badan: string };
  /** Untuk persetujuan akhir: pos yang sudah ditetapkan */
  budget?: { label: string; data: MeterData } | { special: true };
}

const INTRO: Record<StepKind, string> = {
  diketahui: "Periksa apakah kebutuhan ini sesuai untuk unit Anda. Setelah itu, PR diteruskan ke Urusan Keuangan.",
  verifikasi: "Tetapkan sumber dana, lalu teruskan ke penyetuju akhir.",
  persetujuan: "Setelah disetujui, Urusan Umum memproses pembelian dan PDF PR terbit.",
};

const SUGGEST_RETURN = ["Lampirkan penawaran harga.", "Perjelas spesifikasi barang.", "Pisahkan item jasa dan barang.", "Periksa kembali jumlahnya."];
const SUGGEST_REJECT = ["Belum menjadi prioritas tahun ini.", "Anggaran tidak tersedia.", "Sudah ada barang serupa."];

export function ApprovalPanel(props: ApprovalPanelProps) {
  const { prId, kind, total, reapproval } = props;
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  const [dialog, setDialog] = useState<"kembalikan" | "tolak" | null>(null);

  // Verifikasi
  const initialLine = props.proposedLineId ?? props.lines?.find((l) => l.mine)?.id ?? props.lines?.[0]?.id ?? "";
  const [source, setSource] = useState<"rka" | "khusus">("rka");
  const [lineId, setLineId] = useState(initialLine);
  const line = props.lines?.find((l) => l.id === lineId);
  const sisa = line ? line.pagu - line.realisasi - line.terikat : 0;
  const over = kind === "verifikasi" && source === "rka" && line ? total > sisa : false;
  const final = useMemo(() => penyetujuAkhir(total, source === "khusus"), [total, source]);

  const verb = reapproval ? "Setujui harga baru" : kind === "verifikasi" ? "Verifikasi dan teruskan" : STEP_VERB[kind];

  function approve() {
    run(() =>
      actOnPr({
        prId,
        action: "setuju",
        note: note.trim() || undefined,
        budgetLineId: kind === "verifikasi" && source === "rka" ? lineId : undefined,
        specialBudget: kind === "verifikasi" ? source === "khusus" : undefined,
      }),
      { onOk: () => setNote("") },
    );
  }

  return (
    <Panel turn title={reapproval ? "Persetujuan ulang" : { diketahui: "Diketahui", verifikasi: "Verifikasi", persetujuan: "Persetujuan" }[kind]}>
      {reapproval ? (
        <div className="space-y-3">
          <p className="text-ink-2">Harga berubah saat pembelian. Setujui harga baru, atau tolak bila tidak sepadan.</p>
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-sunken p-3 text-sm">
            <div>
              <dt className="text-ink-3">Disetujui sebelumnya</dt>
              <dd className="font-semibold tabular">{rupiah(reapproval.estimate)}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Harga beli</dt>
              <dd className="font-semibold text-merah tabular">
                {rupiah(reapproval.realized)}{" "}
                <span className="font-medium">(+{persen(reapproval.realized / reapproval.estimate - 1)})</span>
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-ink-2">{INTRO[kind]}</p>
      )}

      {kind === "verifikasi" && props.lines && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Sumber dana</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1" role="radiogroup">
              {(
                [
                  ["rka", "Pos RKA"],
                  ["khusus", "Anggaran khusus"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={source === value}
                  onClick={() => setSource(value)}
                  className={cn(
                    "h-9 rounded-md text-sm font-semibold transition-colors",
                    source === value ? "bg-surface text-ink shadow-[0_1px_2px_rgb(31_27_23/0.08)] ring-1 ring-line" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {source === "rka" ? (
            <>
              <Field label="Pos RKA" hint={props.proposedLineId ? "Diusulkan pemohon. Ubah bila perlu." : undefined}>
                {(p) => (
                  <Select {...p} value={lineId} onChange={(e) => setLineId(e.target.value)}>
                    {groupByUnit(props.lines!).map(([unit, list]) => (
                      <optgroup key={unit} label={unit}>
                        {list.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code} · {l.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                )}
              </Field>
              {line && <BudgetMeter data={line} thisPr={total} />}
              {over && (
                <p className="rounded-lg bg-merah-soft px-3 py-2 text-sm text-merah-strong">
                  Melebihi sisa pagu {rupiah(total - sisa)}. Pilih pos lain, tandai sebagai anggaran khusus, atau kembalikan ke pemohon.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-lg bg-sunken px-3 py-2.5 text-sm text-ink-2">
              Untuk kebutuhan di luar RKA. Persetujuan naik ke Kepala Badan berapa pun nilainya.
            </p>
          )}

          <div className="rounded-lg border border-line px-3 py-2.5">
            <p className="text-sm text-ink-3">Diteruskan ke</p>
            <p className="font-semibold">
              {final.kind === "kepala_badan" ? "Kepala Badan" : "Sekretaris Badan"}
              {props.approverNames && <span className="font-normal text-ink-2"> · {props.approverNames[final.kind]}</span>}
            </p>
            <p className="text-sm text-ink-3">
              {final.basis} ({rupiah(total)})
            </p>
          </div>
        </div>
      )}

      {kind === "persetujuan" && !reapproval && (
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-sunken px-3 py-2.5">
            <span className="text-sm text-ink-2">{props.basis}</span>
            <span className="font-bold tabular">{rupiah(total)}</span>
          </div>
          {props.budget && "special" in props.budget ? (
            <p className="text-sm text-ink-2">Sumber dana: anggaran khusus, di luar RKA.</p>
          ) : props.budget ? (
            <div>
              <p className="mb-2 text-sm font-semibold">{props.budget.label}</p>
              <BudgetMeter data={props.budget.data} thisPr={total} />
            </div>
          ) : null}
        </div>
      )}

      <Field label="Catatan" optional className="mt-4" hint="Terlihat oleh pemohon dan tercetak di PDF.">
        {(p) => <Textarea {...p} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>

      {props.nextAlsoYou && (
        <p className="mt-3 text-sm text-ink-3">
          Anda juga memegang tahap {props.nextAlsoYou}. Setelah ini, PR langsung kembali ke Anda. Kedua persetujuan tercatat terpisah.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full" onClick={approve} disabled={pending || over}>
          {pending ? "Menyimpan…" : verb}
        </Button>
        <div className={cn("grid gap-2", reapproval ? "grid-cols-1" : "grid-cols-2")}>
          {!reapproval && (
            <Button variant="secondary" icon={<CornerUpLeft />} onClick={() => setDialog("kembalikan")} disabled={pending}>
              Kembalikan
            </Button>
          )}
          <Button variant="danger" icon={<X />} onClick={() => setDialog("tolak")} disabled={pending}>
            Tolak
          </Button>
        </div>
      </div>

      <ReasonDialog
        open={dialog === "kembalikan"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Kembalikan ke pemohon"
        description="Pemohon merevisi PR, lalu alur mulai lagi dari tahap Diketahui."
        confirmLabel="Kembalikan"
        suggestions={SUGGEST_RETURN}
        pending={pending}
        onConfirm={(reason) => run(() => actOnPr({ prId, action: "kembalikan", note: reason }), { onOk: () => setDialog(null) })}
      />
      <ReasonDialog
        open={dialog === "tolak"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Tolak PR ini?"
        description="PR ditutup dan tidak bisa diajukan ulang. Pemohon menerima alasan Anda."
        confirmLabel="Tolak PR"
        danger
        suggestions={SUGGEST_REJECT}
        pending={pending}
        onConfirm={(reason) => run(() => actOnPr({ prId, action: "tolak", note: reason }), { onOk: () => setDialog(null) })}
      />
    </Panel>
  );
}

function groupByUnit(lines: LineOption[]): [string, LineOption[]][] {
  const map = new Map<string, LineOption[]>();
  // Pos milik unit pemohon tampil paling atas.
  for (const l of [...lines].sort((a, b) => Number(b.mine) - Number(a.mine))) {
    map.set(l.unitName, [...(map.get(l.unitName) ?? []), l]);
  }
  return [...map.entries()];
}
