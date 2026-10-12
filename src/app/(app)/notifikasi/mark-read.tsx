"use client";

import { CheckCheck } from "lucide-react";
import { markAllRead } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/components/pr/use-action";

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="secondary" icon={<CheckCheck />} disabled={disabled || pending} onClick={() => run(() => markAllRead())}>
      Tandai semua dibaca
    </Button>
  );
}
