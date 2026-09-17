"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SectionCard, SignalRow } from "@/components/SignalRow";
import { supabase } from "@/lib/supabase/client";
import { useMembership, useSpaces } from "@/lib/useOrg";
import {
  SIGNAL_PRIORITIES,
  SIGNAL_STATUSES,
  SIGNAL_TYPES,
  labelize,
  type Signal,
} from "@/lib/signals";

type SignalSearch = {
  q?: string;
  type?: string;
  status?: string;
  priority?: string;
  space?: string;
  since?: string;
};

const SEARCH_KEYS: (keyof SignalSearch)[] = ["q", "type", "status", "priority", "space", "since"];

export function SignalsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search: SignalSearch = Object.fromEntries(
    SEARCH_KEYS.filter((k) => searchParams.get(k)).map((k) => [k, searchParams.get(k) as string]),
  );

  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);

  const { data, isLoading } = useQuery({
    queryKey: ["signals-search", orgId, search],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("signals")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (search.q) {
        const term = search.q.replace(/[%,]/g, " ");
        q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
      }
      if (search.type) q = q.eq("type", search.type as never);
      if (search.status) q = q.eq("status", search.status as never);
      if (search.priority) q = q.eq("priority", search.priority as never);
      if (search.space) q = q.eq("space_id", search.space);
      if (search.since) q = q.gte("created_at", search.since);
      const { data, error } = await q;
      if (error) throw error;
      return data as Signal[];
    },
  });

  function set(key: keyof SignalSearch, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/signals${next.toString() ? `?${next.toString()}` : ""}`);
  }

  const selectClass =
    "rounded-lg border border-input bg-surface px-2 py-1.5 text-xs text-foreground";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Signals</h1>

      <input
        value={search.q ?? ""}
        onChange={(e) => set("q", e.target.value)}
        placeholder="Search titles and bodies…"
        className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
      />

      <div className="flex flex-wrap gap-2">
        <select value={search.type ?? ""} onChange={(e) => set("type", e.target.value)} className={selectClass}>
          <option value="">All types</option>
          {SIGNAL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={search.status ?? ""} onChange={(e) => set("status", e.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          {SIGNAL_STATUSES.map((s) => (
            <option key={s} value={s}>{labelize(s)}</option>
          ))}
        </select>
        <select value={search.priority ?? ""} onChange={(e) => set("priority", e.target.value)} className={selectClass}>
          <option value="">All priorities</option>
          {SIGNAL_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={search.space ?? ""} onChange={(e) => set("space", e.target.value)} className={selectClass}>
          <option value="">All spaces</option>
          {(spaces ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={search.since ?? ""}
          onChange={(e) => set("since", e.target.value)}
          className={selectClass}
        />
      </div>

      <SectionCard title={`${data?.length ?? 0} results`}>
        {isLoading ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : (data ?? []).length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">No signals match these filters.</p>
        ) : (
          data!.map((s) => (
            <SignalRow
              key={s.id}
              signal={s}
              spaceName={spaces?.find((x) => x.id === s.space_id)?.name}
            />
          ))
        )}
      </SectionCard>
    </div>
  );
}
