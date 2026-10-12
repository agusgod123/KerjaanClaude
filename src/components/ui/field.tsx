import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line-input bg-surface px-3 text-md text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-merah disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-merah";

export const inputClass = cn(control, "h-11");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "min-h-20 py-2.5 leading-6", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        inputClass,
        "appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%234a443e' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'><path d='m4 6 4 4 4-4'/></svg>\")] bg-[position:right_12px_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

/** Label di atas, petunjuk singkat, pesan galat di bawah. Satu pola untuk semua isian. */
export function Field({ label, hint, error, required, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-merah" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="ml-1.5 font-normal text-ink-3">opsional</span>}
      </label>
      {children({
        id,
        "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm font-medium text-merah">
          {error}
        </p>
      )}
    </div>
  );
}
