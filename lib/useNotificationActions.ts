"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export function useNotificationActions(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, read }: { id?: string; read: boolean }) => {
      if (!userId) throw new Error("Please sign in again.");
      let query = supabase
        .from("notifications")
        .update({ read })
        .eq("person_id", userId);
      if (id) query = query.eq("id", id);
      else query = query.eq("read", false);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
      void qc.invalidateQueries({ queryKey: ["unread", userId] });
      void qc.invalidateQueries({ queryKey: ["my-inbox"] });
    },
    onError: () =>
      toast.error("Couldn’t update the notification. Please try again."),
  });
}
