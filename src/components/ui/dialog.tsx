"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * Di HP muncul dari bawah (mudah dijangkau jempol), di laptop di tengah.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade_150ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed z-50 flex max-h-[92dvh] flex-col overflow-hidden bg-surface shadow-overlay focus:outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl pb-safe",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-0",
          className,
        )}
      >
        <div className="flex items-start gap-4 border-b border-line px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <D.Title className="text-lg font-bold text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-base text-ink-2">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="-mr-2 -mt-1 grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Tutup">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
