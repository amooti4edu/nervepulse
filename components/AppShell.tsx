"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronRight,
  Inbox,
  LogOut,
  Plus,
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
import { BrandIcon } from "@/components/BrandIcon";
import { useNotificationRealtime } from "@/lib/useCollaboration";

const NAV = [
  { to: "/inbox", label: "My inbox", icon: Inbox },
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
  useNotificationRealtime(userId);
  const activeLabel =
    NAV.find((item) => pathname?.startsWith(item.to))?.label ??
    (pathname?.startsWith("/spaces")
      ? "Spaces"
      : pathname?.startsWith("/settings")
        ? "Settings"
        : pathname?.startsWith("/notifications")
          ? "Notifications"
          : "Workspace");

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
    <div className="min-h-dvh bg-background pb-24 md:pb-0 md:pl-60">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card p-3 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[oklch(0.23_0.025_200)] px-5 py-7 text-[oklch(0.96_0.008_180)] md:flex">
        <Link href="/pulse" className="flex items-center gap-3 px-1">
          <BrandIcon />
          <span className="text-lg font-semibold tracking-tight">
            nerve<span className="font-normal text-white/50">pulse</span>
            <span className="text-[oklch(0.76_0.11_175)]">.</span>
          </span>
        </Link>

        <div className="mt-9 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <Building2 className="size-4 shrink-0 text-white/60" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">
              Your workspace
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {membership?.organizations?.name ?? "Nerve-Pulse"}
            </p>
          </div>
        </div>
        <p className="mb-3 mt-8 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
          Overview
        </p>
        <nav aria-label="Main navigation" className="space-y-1.5">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors",
                  active
                    ? "bg-white/10 font-medium text-[oklch(0.80_0.10_175)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-current" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-10">
          <button
            onClick={() => setAssistantOpen(true)}
            aria-expanded={assistantOpen}
            className="group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-between text-[oklch(0.80_0.10_175)]">
              <Sparkles className="size-5" />
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-3 text-sm font-medium">A little more clarity.</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              Ask your assistant about your open signals.
            </p>
          </button>
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            <Settings className="size-[18px]" />
            Workspace settings
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/auth");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link
              href="/pulse"
              aria-label="Nerve-Pulse home"
              className="mr-1 text-primary md:hidden"
            >
              <BrandIcon className="size-8" />
            </Link>
            <span className="hidden text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="truncate font-medium">{activeLabel}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setAssistantOpen((v) => !v)}
              aria-expanded={assistantOpen}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary",
                assistantOpen && "bg-accent text-primary",
              )}
              aria-label="Toggle assistant"
            >
              <Sparkles className="size-[18px]" />
            </button>
            <Link
              href="/notifications"
              className="relative flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-primary"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <Bell className="size-[18px]" />
              {!!unread && (
                <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-critical text-[9px] font-bold text-critical-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Settings"
            >
              <Settings className="size-[18px]" />
            </Link>
            <Link
              href="/capture"
              className="ml-2 hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:flex"
            >
              <Plus className="size-4" />
              New signal
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth");
              }}
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-7 outline-none sm:px-8 sm:py-10 lg:px-10"
      >
        {children}
      </main>
      {assistantOpen && (
        <div className="fixed inset-x-4 bottom-24 top-24 z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </div>
      )}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            href={item.to}
            aria-current={pathname?.startsWith(item.to) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1.5 py-3 text-[11px] font-medium transition-colors",
              pathname?.startsWith(item.to)
                ? "bg-accent/60 text-primary"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
