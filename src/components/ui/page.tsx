import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 lg:mb-8">
      {back && (
        <Link href={back.href} className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-medium text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-sm text-ink-3">{eyebrow}</p>}
          <h1 className="text-xl font-bold tracking-tight text-balance text-ink sm:text-2xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-base text-pretty text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  count,
  action,
  children,
  className,
  flush,
}: {
  title: ReactNode;
  count?: number;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  /** Tanpa padding: untuk daftar yang barisnya sudah berpadding */
  flush?: boolean;
}) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-md font-bold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 font-semibold text-ink-3 tabular">{count}</span>}
        </h2>
        {action && (
          <Link href={action.href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-ink-2 hover:text-ink">
            {action.label} <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      <div className={cn("rounded-xl border border-line bg-surface", !flush && "p-5")}>{children}</div>
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-base text-ink-3">{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, current }: { tabs: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Saring">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative -mb-px flex h-10 items-center gap-2 px-3 text-base font-medium whitespace-nowrap",
                  active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn("text-sm tabular", active ? "font-semibold text-ink-2" : "text-ink-3")}>{t.count}</span>
                )}
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ink" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
