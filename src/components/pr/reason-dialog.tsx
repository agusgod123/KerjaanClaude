"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";

export interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  suggestions?: string[];
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/** Kembalikan, tolak, dan batal selalu wajib alasan. Saran singkat mempercepat di HP. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  suggestions = [],
  pending,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  function confirm() {
    if (reason.trim().length < 5) {
      setError("Tulis alasannya, minimal satu kalimat pendek.");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(undefined);
      }}
    >
      <DialogContent title={title} description={description}>
        <Field label="Alasan" required error={error}>
          {(p) => (
            <Textarea
              {...p}
              autoFocus
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(undefined);
              }}
            />
          )}
        </Field>
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setReason((r) => (r ? `${r.trim()} ${s}` : s))}
                className="h-8 rounded-full border border-line-strong px-3 text-sm text-ink-2 hover:border-ink-3 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant={danger ? "danger-solid" : "primary"} onClick={confirm} disabled={pending}>
            {pending ? "Menyimpan…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
