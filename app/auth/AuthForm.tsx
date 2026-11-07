"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BrandIcon } from "@/components/BrandIcon";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/inbox");
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push("/inbox");
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/inbox");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.23_0.025_200)] p-12 text-[oklch(0.96_0.008_180)] lg:flex xl:p-16">
        <div className="relative z-10 flex items-center gap-3">
          <BrandIcon />
          <span className="text-xl font-semibold tracking-tight">
            nerve<span className="font-normal text-white/50">pulse</span>.
          </span>
        </div>
        <div className="relative z-10 max-w-md py-20">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-[oklch(0.80_0.10_175)]">
            Your organization, in sync
          </p>
          <h2 className="text-5xl font-medium leading-[1.15] tracking-tight xl:text-6xl">
            A clearer pulse.
            <br />
            <span className="text-[oklch(0.80_0.10_175)]">
              A stronger team.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/60">
            Turn everyday updates into shared understanding. See what matters,
            know who owns it, and move forward together.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "One place for every signal",
              "Clarity across every team",
              "Less noise. More momentum.",
            ].map((text) => (
              <p
                key={text}
                className="flex items-center gap-3 text-sm text-white/75"
              >
                <CheckCircle2 className="size-4 text-[oklch(0.80_0.10_175)]" />
                {text}
              </p>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs tracking-wide text-white/40">
          The nervous system for your organization.
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-64 -right-64 size-[600px] rounded-full border border-white/10 p-16"
        >
          <div className="size-full rounded-full border border-white/10 p-16">
            <div className="size-full rounded-full border border-white/10" />
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-2 lg:hidden">
            <BrandIcon className="size-9" />
            <span className="text-lg font-semibold tracking-tight">
              Nerve-Pulse
            </span>
          </div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {mode === "signin"
              ? "Good to have you back"
              : "Let’s get connected"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back." : "Find your team’s rhythm."}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {mode === "signin"
              ? "Sign in to see what’s happening with your team."
              : "Create an account and bring your work into focus."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                aria-label="Full name"
                autoComplete="name"
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-critical/5 p-3 text-sm text-critical"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg bg-healthy/5 p-3 text-sm text-healthy"
              >
                {notice}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
              {!busy && <ArrowRight className="size-4" />}
            </button>
          </form>

          <button
            disabled={busy}
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "No account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
