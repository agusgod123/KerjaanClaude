"use client";

import type { ComponentProps } from "react";
import { angka, parseRupiah } from "@/domain/format";
import { cn } from "@/lib/cn";
import { inputClass } from "./field";

/** Isian rupiah: keyboard angka di HP, titik ribuan otomatis, tanpa desimal. */
export function RupiahInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & { value: number; onValueChange: (v: number) => void }) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-md text-ink-3">Rp</span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ? angka(value) : ""}
        onChange={(e) => onValueChange(Math.min(parseRupiah(e.target.value), 999_999_999_999))}
        className={cn(inputClass, "pl-10 text-right tabular")}
      />
    </div>
  );
}
