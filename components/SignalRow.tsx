import Link from "next/link";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/Badges";
import { timeAgo, type Signal } from "@/lib/signals";

export function SignalRow({
  signal,
  spaceName,
}: {
  signal: Signal;
  spaceName?: string | undefined;
}) {
  return (
    <Link
      href={`/signals/${signal.id}`}
      className="block border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-accent/50"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{signal.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={signal.type} />
            <StatusBadge status={signal.status} />
            <PriorityBadge priority={signal.priority} />
            {spaceName && (
              <span className="text-[11px] text-muted-foreground">{spaceName}</span>
            )}
          </div>
        </div>
        <span className="tabular shrink-0 text-[11px] text-muted-foreground">
          {timeAgo(signal.created_at)}
        </span>
      </div>
    </Link>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
