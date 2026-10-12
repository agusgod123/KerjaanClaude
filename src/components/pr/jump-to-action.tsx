"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Di HP, panel aksi ada di bawah rincian item. Bilah kecil ini memberi tahu
 * bahwa giliran ada di pengguna, dan hilang begitu panelnya terlihat.
 */
export function JumpToAction({ label }: { label: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.getElementById("aksi");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(Boolean(e && (e.isIntersecting || e.boundingClientRect.top < 0))), {
      threshold: 0.15,
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  if (hidden) return null;
  return (
    <a
      href="#aksi"
      className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-surface shadow-overlay lg:hidden"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="size-1.5 rounded-full bg-merah ring-2 ring-merah/30" aria-hidden />
        Giliran Anda: {label}
      </span>
      <ArrowDown className="size-4 opacity-80" />
    </a>
  );
}
