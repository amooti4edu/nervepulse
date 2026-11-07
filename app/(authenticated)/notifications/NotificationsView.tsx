"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { SectionCard } from "@/components/SignalRow";
import { supabase } from "@/lib/supabase/client";
import { useMembership } from "@/lib/useOrg";
import { useNotificationActions } from "@/lib/useNotificationActions";
import { labelize, timeAgo } from "@/lib/signals";
import { NOTIFICATION_HELP, needsResponse } from "@/lib/workflow";

export function NotificationsView() {
  const { userId } = useMembership();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const actions = useNotificationActions(userId);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["notifications", userId, unreadOnly],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*, signals(id, title)")
        .eq("person_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (unreadOnly) query = query.eq("read", false);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Stay in the loop
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Notifications.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Opening a signal from here marks that notification read. Simply
          visiting this page doesn’t clear anything. You can mark an item unread
          to return to it later.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="size-4 accent-primary"
          />
          Unread only
        </label>
        <button
          disabled={actions.isPending || isPending || isError || !data?.length}
          onClick={() => actions.mutate({ read: true })}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          <CheckCheck className="size-4" />
          Mark all read
        </button>
      </div>
      <SectionCard
        title={unreadOnly ? "Unread notifications" : "Latest notifications"}
      >
        {isPending ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading notifications…
          </p>
        ) : isError ? (
          <p role="alert" className="p-6 text-sm text-critical">
            Couldn’t load notifications.{" "}
            <button onClick={() => void refetch()} className="underline">
              Try again
            </button>
          </p>
        ) : !data?.length ? (
          <div className="p-10 text-center">
            <Bell className="mx-auto mb-3 size-6 text-primary" />
            <p className="text-sm font-medium">You’re all caught up</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Mentions, assignments, forwards, and followed discussions will
              appear here.
            </p>
          </div>
        ) : (
          <ul>
            {data.map((notification) => {
              const signal = notification.signals as {
                id: string;
                title: string;
              } | null;
              return (
                <li
                  key={notification.id}
                  className="flex items-start gap-3 border-b border-border p-5 last:border-b-0"
                >
                  <span
                    aria-label={notification.read ? "Read" : "Unread"}
                    className={`mt-2 size-2 shrink-0 rounded-full ${notification.read ? "bg-muted-foreground/30" : "bg-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    {signal ? (
                      <Link
                        href={`/signals/${signal.id}${notification.comment_id ? "#discussion" : ""}`}
                        onClick={() => {
                          if (!notification.read)
                            actions.mutate({ id: notification.id, read: true });
                        }}
                        className="block rounded-lg hover:text-primary"
                      >
                        <p className="break-words text-sm font-medium">
                          {signal.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {NOTIFICATION_HELP[notification.kind] ??
                            labelize(notification.kind)}
                        </p>
                      </Link>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">
                          Signal no longer available
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          It may have been removed or your access may have
                          changed.
                        </p>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {timeAgo(notification.created_at)}
                      {needsResponse(notification.kind, notification.read) && (
                        <span className="ml-2 font-medium text-primary">
                          Input requested
                        </span>
                      )}
                    </p>
                    <button
                      disabled={actions.isPending}
                      onClick={() =>
                        actions.mutate({
                          id: notification.id,
                          read: !notification.read,
                        })
                      }
                      className="mt-2 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Mark {notification.read ? "unread" : "read"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      {data?.length === 100 && (
        <p className="text-xs text-muted-foreground">
          Showing the latest 100 notifications. Use “Unread only” to find
          outstanding items.
        </p>
      )}
    </div>
  );
}
