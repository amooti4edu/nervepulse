"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useMembership, useSignalsRealtime, useSpaces } from "@/lib/useOrg";
import { useNotificationActions } from "@/lib/useNotificationActions";
import { SignalRow, SectionCard } from "@/components/SignalRow";
import { NOTIFICATION_HELP } from "@/lib/workflow";
import { timeAgo, type Signal } from "@/lib/signals";
import { cn } from "@/lib/utils";

const TABS = [
  {
    key: "assigned",
    label: "Assigned to me",
    help: "Active issues, tasks, requests, and questions owned by you or your primary space. Sharing an update doesn’t automatically create a task.",
  },
  {
    key: "mentions",
    label: "Mentioned me",
    help: "Unread mentions asking for your attention. Open an item to mark that notification read; this doesn’t change ownership or resolve the signal.",
  },
  {
    key: "response",
    label: "Needs a response",
    help: "Unread mentions and forwards are prompts to review or reply—not an automatic claim that a reply is overdue. Opening one clears that notification; mark it unread in Notifications if you want to return later.",
  },
  {
    key: "following",
    label: "Following",
    help: "Discussions you’ve chosen to follow, including signals you create or are personally assigned after this feature is enabled. Following sends reply and status notifications; it doesn’t make you the owner.",
  },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function InboxView() {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    data: membership,
    userId,
    isPending: membershipPending,
  } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);
  const [tab, setTab] = useState<Tab>("assigned");
  const actions = useNotificationActions(userId);
  useEffect(() => {
    if (!membershipPending && membership === null)
      router.replace("/onboarding");
  }, [membershipPending, membership, router]);
  useSignalsRealtime(
    orgId,
    () => void qc.invalidateQueries({ queryKey: ["my-inbox"] }),
  );

  const query = useQuery({
    queryKey: ["my-inbox", orgId, userId, membership?.primary_space_id, tab],
    enabled: !!orgId && !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      if (tab === "assigned") {
        let q = supabase
          .from("signals")
          .select("*")
          .eq("organization_id", orgId!)
          .in("type", ["issue", "task", "request", "question"])
          .in("status", ["open", "acknowledged", "in_progress"])
          .order("updated_at", { ascending: false })
          .limit(100);
        q = membership?.primary_space_id
          ? q.or(
              `owner_id.eq.${userId},owner_space_id.eq.${membership.primary_space_id}`,
            )
          : q.eq("owner_id", userId!);
        const { data, error } = await q;
        if (error) throw error;
        return { signals: data as Signal[], notifications: [] };
      }
      if (tab === "following") {
        const { data, error } = await supabase
          .from("signal_followers")
          .select("signals!inner(*)")
          .eq("person_id", userId!)
          .eq("signals.organization_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return {
          signals: data.map((row) => row.signals as Signal),
          notifications: [],
        };
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, comment_id, created_at, signals!inner(*)")
        .eq("person_id", userId!)
        .eq("read", false)
        .eq("signals.organization_id", orgId!)
        .in("kind", tab === "mentions" ? ["mention"] : ["mention", "forward"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return { signals: [], notifications: data };
    },
  });
  const count =
    (query.data?.signals.length ?? 0) + (query.data?.notifications.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Your next move
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            My inbox.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Start with what needs you. Use Company Pulse for the
            organization-wide picture.
          </p>
        </div>
        <Link
          href="/pulse"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          Company Pulse <ArrowRight className="size-4" />
        </Link>
      </div>
      <details className="rounded-2xl border border-primary/15 bg-accent/40 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          New here? How Nerve-Pulse works
        </summary>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Capture</strong> an issue,
            request, question, or update. Each becomes a signal with one place
            for its context and discussion.
          </p>
          <p>
            <strong className="text-foreground">Mention</strong> someone for
            attention. <strong className="text-foreground">Forward</strong> for
            input without handing off ownership.{" "}
            <strong className="text-foreground">Assign</strong> to change who is
            responsible.
          </p>
          <p>
            <strong className="text-foreground">Follow</strong> a signal for new
            replies and status changes. Discussions are shared with people who
            can access the signal—they are not private direct messages.
          </p>
          <Link
            href="/capture"
            className="inline-flex items-center gap-2 font-medium text-primary"
          >
            Capture your first signal <ArrowRight className="size-4" />
          </Link>
        </div>
      </details>
      <div
        role="group"
        aria-label="Inbox views"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
              tab === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {TABS.find((item) => item.key === tab)!.help}
      </p>
      <SectionCard
        title={TABS.find((item) => item.key === tab)!.label}
        action={
          <span className="text-xs text-muted-foreground">
            {query.isPending
              ? "Loading…"
              : query.isError
                ? "Unavailable"
                : `${count} items`}
          </span>
        }
      >
        {query.isPending ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Finding your signals…
          </p>
        ) : query.isError ? (
          <p role="alert" className="p-6 text-sm text-critical">
            Couldn’t load your inbox.{" "}
            <button onClick={() => void query.refetch()} className="underline">
              Try again
            </button>
          </p>
        ) : !count ? (
          <div className="p-10 text-center">
            <Inbox className="mx-auto mb-3 size-7 text-primary/60" />
            <p className="text-sm font-medium">Nothing waiting here</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Try another view, or explore your team’s signals.
            </p>
            <Link
              href="/signals"
              className="mt-4 inline-flex text-sm font-medium text-primary"
            >
              Explore signals
            </Link>
          </div>
        ) : (
          <>
            {query.data?.signals.map((signal) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                spaceName={
                  spaces?.find((space) => space.id === signal.space_id)?.name
                }
              />
            ))}
            {query.data?.notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/signals/${notification.signals.id}${notification.comment_id ? "#discussion" : ""}`}
                onClick={() =>
                  actions.mutate({ id: notification.id, read: true })
                }
                className="block border-b border-border p-5 last:border-b-0 hover:bg-accent/40"
              >
                <p className="text-sm font-medium">
                  {notification.signals.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {NOTIFICATION_HELP[notification.kind]}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {timeAgo(notification.created_at)}
                </p>
              </Link>
            ))}
          </>
        )}
      </SectionCard>
      {count === 100 && (
        <p className="text-xs text-muted-foreground">
          Showing the latest 100 items in this view. Search Signals for older
          work.
        </p>
      )}
    </div>
  );
}
