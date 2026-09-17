"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { SectionCard, SignalRow } from "@/components/SignalRow";
import { useMembership, useSignalsRealtime } from "@/lib/useOrg";
import { labelize, toneText, type Signal } from "@/lib/signals";
import { cn } from "@/lib/utils";

export function SpaceDetailView({ spaceId }: { spaceId: string }) {
  const qc = useQueryClient();
  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;

  useSignalsRealtime(orgId, () => {
    void qc.invalidateQueries({ queryKey: ["space-view", spaceId] });
  });

  const { data: space } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("spaces").select("*").eq("id", spaceId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["space-view", spaceId, "health"],
    queryFn: async () => {
      const { data } = await supabase.from("space_health").select("*").eq("space_id", spaceId).maybeSingle();
      return data;
    },
  });

  const { data: signals } = useQuery({
    queryKey: ["space-view", spaceId, "signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Signal[];
    },
  });

  const attention = health?.attention_count ?? 0;
  const stats = [
    { label: "Open", value: health?.open_count ?? 0, tone: "progress" },
    { label: "Need attention", value: attention, tone: attention > 0 ? "critical" : "healthy" },
    {
      label: "Resolved",
      value: (signals ?? []).filter((s) => s.status === "resolved" || s.status === "closed").length,
      tone: "healthy",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/pulse" className="text-xs text-muted-foreground hover:text-foreground">
          ← Company Pulse
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{space?.name ?? "Space"}</h1>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {labelize(space?.kind ?? "")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className={cn("tabular mt-1 text-2xl font-semibold", toneText[s.tone])}>{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Signals in this space">
        {(signals ?? []).length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          signals!.map((s) => <SignalRow key={s.id} signal={s} />)
        )}
      </SectionCard>
    </div>
  );
}
