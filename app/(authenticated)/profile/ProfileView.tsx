"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { SectionCard } from "@/components/SignalRow";
import { Pill } from "@/components/Badges";
import { isElevated, useMembership, useSpaces } from "@/lib/useOrg";
import { labelize } from "@/lib/signals";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextDue(cadence: string, dayOfWeek: number | null, timeOfDay: string | null) {
  const now = new Date();
  const [h, m] = (timeOfDay ?? "09:00").split(":").map(Number);
  const target = new Date(now);
  target.setHours(h ?? 9, m ?? 0, 0, 0);
  if (cadence === "daily") {
    if (target <= now) target.setDate(target.getDate() + 1);
    return `${target <= now ? "" : ""}${target.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}`;
  }
  if (cadence === "weekly" && dayOfWeek !== null) {
    const delta = (dayOfWeek - target.getDay() + 7) % 7 || (target <= now ? 7 : 0);
    target.setDate(target.getDate() + delta);
    return target.toLocaleString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return labelize(cadence);
}

export function ProfileView() {
  const qc = useQueryClient();
  const { data: membership, userId } = useMembership();
  const { data: spaces } = useSpaces(membership?.organization_id);
  const elevated = isElevated(membership?.role);

  const [label, setLabel] = useState("");
  const [cadence, setCadence] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [timeOfDay, setTimeOfDay] = useState("09:00");

  const { data: person } = useQuery({
    queryKey: ["person", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("people").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: expectations } = useQuery({
    queryKey: ["expectations", membership?.id],
    enabled: !!membership?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_expectations")
        .select("*")
        .eq("org_membership_id", membership!.id)
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  async function addExpectation() {
    if (!label.trim() || !membership) return;
    const { error } = await supabase.from("role_expectations").insert({
      org_membership_id: membership.id,
      label: label.trim(),
      cadence,
      day_of_week: cadence === "weekly" ? Number(dayOfWeek) : null,
      time_of_day: timeOfDay,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setLabel("");
    toast.success("Expectation added");
    void qc.invalidateQueries({ queryKey: ["expectations"] });
  }

  const permissions = elevated
    ? [
        "See signals across every space",
        "Manage spaces and people's roles",
        "Set role expectations for the team",
      ]
    : [
        "See signals in your space and org-wide announcements",
        "Capture, comment on and forward signals",
        "Own and resolve signals assigned to you",
      ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{person?.full_name ?? "Profile"}</h1>
        <p className="text-sm text-muted-foreground">{person?.email}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Role</p>
          <p className="mt-1 text-sm font-medium capitalize">{membership?.role ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Primary space</p>
          <p className="mt-1 text-sm font-medium">
            {spaces?.find((s) => s.id === membership?.primary_space_id)?.name ?? "Unassigned"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Organization</p>
          <p className="mt-1 text-sm font-medium">{membership?.organizations?.name ?? "—"}</p>
        </div>
      </div>

      <SectionCard title="Permissions">
        <ul className="space-y-2 px-3 py-3 text-sm">
          {permissions.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-healthy" />
              {p}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Role expectations">
        {(expectations ?? []).length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            No recurring responsibilities set yet.
          </p>
        ) : (
          <ul>
            {expectations!.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <CalendarClock className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.label}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {labelize(e.cadence)}
                    {e.day_of_week !== null ? ` · ${DAYS[e.day_of_week]}` : ""}
                    {e.signal_type ? ` · ${e.signal_type}` : ""}
                  </p>
                </div>
                <Pill tone="progress">
                  next {nextDue(e.cadence, e.day_of_week, e.time_of_day)}
                </Pill>
              </li>
            ))}
          </ul>
        )}

        {elevated && (
          <div className="space-y-2 border-t border-border p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Add an expectation
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Daily branch check-in"
                className="min-w-40 flex-1 rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              />
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
              {cadence === "weekly" && (
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
              />
              <button
                onClick={addExpectation}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
