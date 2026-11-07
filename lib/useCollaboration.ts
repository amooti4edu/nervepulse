"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useNotificationRealtime(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `person_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications", userId] });
          void qc.invalidateQueries({ queryKey: ["unread", userId] });
          void qc.invalidateQueries({ queryKey: ["my-inbox"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

export function useDiscussionRealtime(signalId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`discussion-${signalId}`);
    for (const table of [
      "signal_comments",
      "signal_participants",
      "signal_forwards",
      "signal_followers",
    ] as const) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `signal_id=eq.${signalId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["signal", signalId] });
          void qc.invalidateQueries({ queryKey: ["my-inbox"] });
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [signalId, qc]);
}

export function useFollowing(signalId: string, userId: string | null) {
  return useQuery({
    queryKey: ["signal", signalId, "following", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signal_followers")
        .select("signal_id")
        .eq("signal_id", signalId)
        .eq("person_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}
