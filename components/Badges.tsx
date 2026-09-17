import { cn } from "@/lib/utils";
import {
  labelize,
  priorityTone,
  statusTone,
  toneClasses,
  toneDot,
  type SignalPriority,
  type SignalStatus,
  type SignalType,
} from "@/lib/signals";

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  const tone = statusTone(status);
  return (
    <Pill tone={tone}>
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} />
      {labelize(status)}
    </Pill>
  );
}

export function PriorityBadge({ priority }: { priority: SignalPriority }) {
  return <Pill tone={priorityTone(priority)}>{priority}</Pill>;
}

export function TypeBadge({ type }: { type: SignalType }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
      {type}
    </span>
  );
}
