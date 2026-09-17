"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { OrgRole } from "./signals";

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

export type Membership = {
  id: string;
  role: OrgRole;
  organization_id: string;
  primary_space_id: string | null;
  organizations: { id: string; name: string } | null;
  spaces: { id: string; name: string } | null;
};

export function useMembership() {
  const { userId, ready } = useSession();

  const query = useQuery({
    queryKey: ["membership", userId],
    enabled: ready && !!userId,
    queryFn: async (): Promise<Membership | null> => {
      const { data, error } = await supabase
        .from("org_memberships")
        .select(
          "id, role, organization_id, primary_space_id, organizations(id, name), spaces:primary_space_id(id, name)",
        )
        .eq("person_id", userId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Membership) ?? null;
    },
  });

  return { ...query, userId, sessionReady: ready };
}

export function isElevated(role?: OrgRole | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function useSpaces(organizationId?: string) {
  return useQuery({
    queryKey: ["spaces", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Live invalidation of signal-derived queries. */
export function useSignalsRealtime(organizationId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`signals-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);
}
