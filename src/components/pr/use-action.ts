"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/server/actions";

/** Jalankan server action: tampilkan pesan, lalu opsional pindah halaman. */
export function useServerAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function run(
    fn: () => Promise<ActionResult>,
    opts: { onOk?: (r: Extract<ActionResult, { ok: true }>) => void; goTo?: (r: Extract<ActionResult, { ok: true }>) => string } = {},
  ) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      if (r.message) toast(r.message);
      opts.onOk?.(r);
      if (opts.goTo) router.push(opts.goTo(r));
    });
  }

  return { pending, run };
}
