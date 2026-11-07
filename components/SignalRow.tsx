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
      className="group block border-b border-border/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {signal.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={signal.type} />
            <StatusBadge status={signal.status} type={signal.type} />
            <PriorityBadge priority={signal.priority} />
            {spaceName && (
              <span className="text-[11px] text-muted-foreground">
                {spaceName}
              </span>
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
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
