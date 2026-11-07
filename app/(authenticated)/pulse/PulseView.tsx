"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Layers3,
  Plus,
  Radio,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { SectionCard, SignalRow } from "@/components/SignalRow";
import { useMembership, useSignalsRealtime, useSpaces } from "@/lib/useOrg";
import { cn } from "@/lib/utils";
import { labelize, toneText, type Signal } from "@/lib/signals";

export function PulseView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: membership, isLoading } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);

  useEffect(() => {
    if (!isLoading && membership === null) router.push("/onboarding");
  }, [isLoading, membership, router]);

  useSignalsRealtime(orgId, () => {
    void qc.invalidateQueries({ queryKey: ["pulse"] });
    void qc.invalidateQueries({ queryKey: ["space-health"] });
    void qc.invalidateQueries({ queryKey: ["recent-signals"] });
  });

  const counts = useQuery({
    queryKey: ["pulse", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_pulse_counts")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const health = useQuery({
    queryKey: ["space-health", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_health")
        .select("*")
        .eq("organization_id", orgId!)
        .order("attention_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const recent = useQuery({
    queryKey: ["recent-signals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as Signal[];
    },
  });

  const tiles = [
    {
      label: "Critical open",
      value: counts.data?.critical_open ?? 0,
      tone: "critical",
      icon: AlertTriangle,
      search: { status: "open", priority: "critical" },
    },
    {
      label: "Pending requests",
      value: counts.data?.pending_requests ?? 0,
      tone: "attention",
      icon: Inbox,
      search: { type: "request", status: "open" },
    },
    {
      label: "Recent updates",
      value: counts.data?.recent_updates ?? 0,
      tone: "progress",
      icon: Radio,
      search: { type: "update" },
    },
    {
      label: "Recently completed",
      value: counts.data?.recently_completed ?? 0,
      tone: "healthy",
      icon: CheckCircle2,
      search: { status: "resolved" },
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            The big picture
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Company pulse<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Less noise. More clarity. Here’s what’s happening across{" "}
            {membership?.organizations?.name ?? "your organization"}.
          </p>
        </div>
        <Link
          href="/signals"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Explore signals <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-accent/60 p-6 sm:p-8">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 180"
          fill="none"
          className="pointer-events-none absolute -right-12 top-0 hidden h-full w-96 text-primary/15 lg:block"
        >
          <circle cx="240" cy="90" r="55" stroke="currentColor" />
          <circle cx="240" cy="90" r="90" stroke="currentColor" />
          <circle cx="240" cy="90" r="125" stroke="currentColor" />
          <path
            d="M0 95h110l20-22 24 52 27-87 28 104 25-47h166"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="234" cy="95" r="5" fill="currentColor" />
        </svg>
        <div className="relative max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Connected teams. Clearer decisions.
          </p>
          <h2 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">
            Every signal tells a story.
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Surface what matters, keep work moving, and give your team the
            context to act.
          </p>
          <Link
            href="/capture"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="size-4" />
            Capture a signal
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
      </div>

      {counts.isError && (
        <DashboardError onRetry={() => void counts.refetch()} />
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={`/signals?${new URLSearchParams(tile.search).toString()}`}
            className={cn(
              "group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md motion-reduce:transform-none sm:p-5",
              toneText[tile.tone],
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted/70">
                <tile.icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </div>
            <p
              className="tabular mt-5 text-4xl font-semibold tracking-tight text-foreground"
              aria-label={
                counts.isPending
                  ? "Loading"
                  : counts.isError
                    ? "Unavailable"
                    : undefined
              }
            >
              {counts.isPending || counts.isError ? "—" : tile.value}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {tile.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard
          title="Space health"
          action={<Layers3 className="size-4 text-muted-foreground" />}
        >
          {health.isPending ? (
            <DashboardLoading />
          ) : health.isError ? (
            <DashboardError onRetry={() => void health.refetch()} />
          ) : !health.data?.length ? (
            <div className="px-6 py-10 text-center">
              <Layers3 className="mx-auto mb-3 size-7 text-primary/60" />
              <p className="text-sm font-medium">Make room for your teams</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Spaces bring signals from each branch and department together.
              </p>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
              >
                Set up a space <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <ul>
              {health.data.map((space) => {
                const attention = space.attention_count ?? 0;
                return (
                  <li
                    key={space.space_id}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <Link
                      href={`/spaces/${space.space_id}`}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
                    >
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          attention > 0 ? "bg-critical" : "bg-healthy",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {space.name}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {labelize(space.kind ?? "")}
                        </p>
                      </div>
                      <div className="tabular text-right text-xs">
                        <p
                          className={
                            attention > 0 ? "text-critical" : "text-healthy"
                          }
                        >
                          {attention > 0
                            ? `${attention} need attention`
                            : "Healthy"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {space.open_count ?? 0} open
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Recent activity"
          action={
            <Link
              href="/signals"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {recent.isPending ? (
            <DashboardLoading />
          ) : recent.isError ? (
            <DashboardError onRetry={() => void recent.refetch()} />
          ) : !recent.data?.length ? (
            <div className="px-6 py-10 text-center">
              <Radio className="mx-auto mb-3 size-7 text-primary/60" />
              <p className="text-sm font-medium">
                Your next update starts here
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Capture an issue, request, or win to get the conversation going.
              </p>
              <Link
                href="/capture"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
              >
                Capture your first signal <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            recent.data.map((signal) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                spaceName={
                  spaces?.find((space) => space.id === signal.space_id)?.name
                }
              />
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div role="status" className="space-y-4 p-6">
      <span className="sr-only">Loading dashboard data</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 motion-reduce:animate-none"
        >
          <div className="size-9 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-2 w-1/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-critical/5 p-5 text-sm text-critical"
    >
      <span>We couldn’t load this data.</span>
      <button
        onClick={onRetry}
        className="font-medium underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
