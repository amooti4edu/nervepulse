"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { SectionCard } from "@/components/SignalRow";
import { useMembership } from "@/lib/useOrg";
import { labelize, timeAgo } from "@/lib/signals";

export function NotificationsView() {
  const qc = useQueryClient();
  const { userId } = useMembership();

  const { data } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, signals(id, title)")
        .eq("person_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!userId || !data?.some((n) => !n.read)) return;
    void supabase
      .from("notifications")
      .update({ read: true })
      .eq("person_id", userId)
      .eq("read", false)
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["unread"] });
      });
  }, [data, userId, qc]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
      <SectionCard title="Latest">
        {(data ?? []).length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          data!.map((n) => {
            const signal = n.signals as { id: string; title: string } | null;
            const body = (
              <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                <span
                  className={`size-2 rounded-full ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{signal?.title ?? "Signal"}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {labelize(n.kind)}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            );
            return signal ? (
              <Link key={n.id} href={`/signals/${signal.id}`} className="block hover:bg-accent/50">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })
        )}
      </SectionCard>
    </div>
  );
}
