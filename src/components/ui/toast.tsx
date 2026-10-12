"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "ok" | "error";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast harus di dalam <Toaster>");
  return show;
}

let seq = 0;

/** Pesan singkat setelah aksi. Bertahan saat pindah halaman karena ada di layout akar. */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (text: string, tone: Tone = "ok") => {
      const id = ++seq;
      setToasts((all) => [...all.slice(-2), { id, text, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 5000);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-base shadow-overlay",
              t.tone === "ok" ? "bg-ink text-surface" : "bg-merah text-white",
            )}
          >
            {t.tone === "ok" ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 opacity-80" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0" />
            )}
            <p className="min-w-0 flex-1">{t.text}</p>
            <button onClick={() => dismiss(t.id)} className="-mr-1 opacity-70 hover:opacity-100" aria-label="Tutup pesan">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
