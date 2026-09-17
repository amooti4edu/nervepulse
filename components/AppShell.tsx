"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  Bell,
  LogOut,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useMembership } from "@/lib/useOrg";
import { cn } from "@/lib/utils";
import { AssistantPanel } from "@/components/AssistantPanel";

const NAV = [
  { to: "/pulse", label: "Pulse", icon: Activity },
  { to: "/capture", label: "Capture", icon: PlusCircle },
  { to: "/signals", label: "Signals", icon: Search },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: membership, userId } = useMembership();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ["unread", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("person_id", userId!)
        .eq("read", false);
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/pulse" className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Nerve-Pulse</span>
          </Link>
          {membership?.organizations?.name && (
            <span className="hidden truncate rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {membership.organizations.name}
            </span>
          )}

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname?.startsWith(item.to) && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button
              onClick={() => setAssistantOpen((v) => !v)}
              className={cn(
                "rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground",
                assistantOpen && "bg-accent text-primary",
              )}
              aria-label="Toggle assistant"
            >
              <Sparkles className="size-4" />
            </button>
            <Link
              href="/notifications"
              className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {!!unread && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-critical text-[9px] font-bold text-critical-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth");
              }}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      {assistantOpen && (
        <div className="fixed inset-x-4 bottom-20 top-20 z-30 md:inset-x-auto md:right-4 md:w-96">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            href={item.to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
              pathname?.startsWith(item.to) && "text-primary",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
