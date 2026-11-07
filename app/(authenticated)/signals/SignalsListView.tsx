"use client";

import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
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

const SEARCH_KEYS: (keyof SignalSearch)[] = [
  "q",
  "type",
  "status",
  "priority",
  "space",
  "since",
];

export function SignalsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search: SignalSearch = Object.fromEntries(
    SEARCH_KEYS.filter((k) => searchParams.get(k)).map((k) => [
      k,
      searchParams.get(k) as string,
    ]),
  );

  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);

  const { data, isPending, isError, refetch } = useQuery({
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
    "min-h-10 rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Your shared context
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Signals<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Find the updates, requests, and decisions that move your team
            forward.
          </p>
        </div>
        <Link
          href="/capture"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-primary hover:bg-accent"
        >
          <Plus className="size-4" />
          New signal
        </Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground"
          />
          <input
            aria-label="Search signals"
            value={search.q ?? ""}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search titles and bodies…"
            className="w-full rounded-xl border border-input bg-surface py-3 pl-10 pr-3 text-sm outline-none focus:border-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal
            aria-hidden="true"
            className="mr-1 size-4 text-muted-foreground"
          />
          <select
            aria-label="Filter by type"
            value={search.type ?? ""}
            onChange={(e) => set("type", e.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            {SIGNAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={search.status ?? ""}
            onChange={(e) => set("status", e.target.value)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {SIGNAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "closed"
                  ? "Closed / archived"
                  : s === "open"
                    ? "Open / published"
                    : labelize(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            value={search.priority ?? ""}
            onChange={(e) => set("priority", e.target.value)}
            className={selectClass}
          >
            <option value="">All priorities</option>
            {SIGNAL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by space"
            value={search.space ?? ""}
            onChange={(e) => set("space", e.target.value)}
            className={selectClass}
          >
            <option value="">All spaces</option>
            {(spaces ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Signals created since"
            value={search.since ?? ""}
            onChange={(e) => set("since", e.target.value)}
            className={selectClass}
          />
          {Object.keys(search).length > 0 && (
            <button
              onClick={() => router.replace("/signals")}
              className="px-2 py-2 text-xs font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <SectionCard
        title={
          isPending
            ? "Finding signals…"
            : isError
              ? "Signals unavailable"
              : `${data?.length ?? 0} results`
        }
      >
        {isPending ? (
          <p role="status" className="px-5 py-10 text-sm text-muted-foreground">
            Loading signals…
          </p>
        ) : isError ? (
          <p role="alert" className="px-5 py-10 text-sm text-critical">
            We couldn’t load your signals.{" "}
            <button
              onClick={() => void refetch()}
              className="font-medium underline"
            >
              Try again
            </button>
          </p>
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Search className="mx-auto mb-4 size-7 text-muted-foreground/60" />
            <p className="text-sm font-medium">No signals found</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Try a different search or capture something new.
            </p>
          </div>
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
