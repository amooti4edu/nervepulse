"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Radio } from "lucide-react";
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

  const { data: counts } = useQuery({
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

  const { data: health } = useQuery({
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

  const { data: recent } = useQuery({
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

  const spaceName = (id: string) => spaces?.find((s) => s.id === id)?.name;

  const tiles = [
    {
      label: "Critical open",
      value: counts?.critical_open ?? 0,
      tone: "critical",
      icon: AlertTriangle,
      search: { status: "open", priority: "critical" },
    },
    {
      label: "Pending requests",
      value: counts?.pending_requests ?? 0,
      tone: "attention",
      icon: Inbox,
      search: { type: "request", status: "open" },
    },
    {
      label: "Recent updates",
      value: counts?.recent_updates ?? 0,
      tone: "progress",
      icon: Radio,
      search: { type: "update" },
    },
    {
      label: "Recently completed",
      value: counts?.recently_completed ?? 0,
      tone: "healthy",
      icon: CheckCircle2,
      search: { status: "resolved" },
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Company Pulse</h1>
          <p className="text-xs text-muted-foreground">
            Live across {membership?.organizations?.name ?? "your organization"}
          </p>
        </div>
        <Link
          href="/capture"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Capture
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={`/signals?${new URLSearchParams(t.search).toString()}`}
            className={cn(
              "rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40",
              t.tone === "critical" && "border-critical/40",
              t.tone === "attention" && "border-attention/40",
              t.tone === "progress" && "border-progress/40",
              t.tone === "healthy" && "border-healthy/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t.label}
              </span>
              <t.icon className={cn("size-4", toneText[t.tone])} />
            </div>
            <p className={cn("tabular mt-2 text-3xl font-semibold", toneText[t.tone])}>
              {t.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Space health">
          {(health ?? []).length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No spaces yet.</p>
          ) : (
            <ul>
              {health!.map((s) => {
                const attention = s.attention_count ?? 0;
                return (
                  <li key={s.space_id}>
                    <Link
                      href={`/spaces/${s.space_id}`}
                      className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-accent/50"
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          attention > 0 ? "bg-critical" : "bg-healthy",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {labelize(s.kind ?? "")}
                        </p>
                      </div>
                      <div className="tabular text-right text-xs">
                        <p className={attention > 0 ? "text-critical" : "text-healthy"}>
                          {attention > 0 ? `${attention} need attention` : "healthy"}
                        </p>
                        <p className="text-muted-foreground">{s.open_count ?? 0} open</p>
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
            <Link href="/signals" className="text-xs text-primary hover:underline">
              View all
            </Link>
          }
        >
          {(recent ?? []).length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No signals yet — capture the first one.
            </p>
          ) : (
            recent!.map((s) => (
              <SignalRow key={s.id} signal={s} spaceName={spaceName(s.space_id)} />
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
