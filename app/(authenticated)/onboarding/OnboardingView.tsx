"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useMembership } from "@/lib/useOrg";
import { SPACE_KINDS, labelize, type SpaceKind } from "@/lib/signals";

type Draft = { name: string; kind: SpaceKind };

export function OnboardingView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: membership } = useMembership();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rootSpaceId, setRootSpaceId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([{ name: "", kind: "branch" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createOrg() {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("create_organization", {
        org_name: orgName,
      });
      if (error) throw error;
      setOrgId(data as string);
      const { data: root } = await supabase
        .from("spaces")
        .select("id")
        .eq("organization_id", data as string)
        .eq("kind", "company")
        .limit(1)
        .maybeSingle();
      setRootSpaceId(root?.id ?? null);
      await qc.invalidateQueries({ queryKey: ["membership"] });
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create organization",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createSpaces() {
    setBusy(true);
    setError(null);
    try {
      const rows = drafts
        .filter((d) => d.name.trim())
        .map((d) => ({
          organization_id: orgId!,
          parent_space_id: rootSpaceId,
          name: d.name.trim(),
          kind: d.kind,
        }));
      if (rows.length > 0) {
        const { error } = await supabase.from("spaces").insert(rows);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["spaces"] });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add spaces");
    } finally {
      setBusy(false);
    }
  }

  if (membership && step === 1 && !orgId) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-xl font-semibold">You&apos;re already set up</h1>
        <p className="text-sm text-muted-foreground">
          {membership.organizations?.name} is live. Manage it in Settings.
        </p>
        <button
          onClick={() => router.push("/inbox")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to my inbox
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        Step {step} of 3
      </p>

      {step === 1 && (
        <div className="mt-3 space-y-4">
          <h1 className="text-xl font-semibold">Name your organization</h1>
          <p className="rounded-xl border border-primary/15 bg-accent/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              Joining an existing team?
            </strong>{" "}
            Don’t create a second organization. Ask your administrator to add
            your registered email in Settings, then{" "}
            <button
              onClick={() =>
                void qc.invalidateQueries({ queryKey: ["membership"] })
              }
              className="font-medium text-primary underline"
            >
              check my access again
            </button>
            . Create an organization below only if you’re setting up a new
            workspace.
          </p>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Kampala Retail Group"
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
          />
          {error && <p className="text-sm text-critical">{error}</p>}
          <button
            disabled={!orgName.trim() || busy}
            onClick={createOrg}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-4">
          <h1 className="text-xl font-semibold">
            Add your branches & departments
          </h1>
          <div className="space-y-2">
            {drafts.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={d.name}
                  onChange={(e) =>
                    setDrafts(
                      drafts.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Name"
                  className="flex-1 rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
                />
                <select
                  value={d.kind}
                  onChange={(e) =>
                    setDrafts(
                      drafts.map((x, j) =>
                        j === i
                          ? { ...x, kind: e.target.value as SpaceKind }
                          : x,
                      ),
                    )
                  }
                  className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
                >
                  {SPACE_KINDS.filter((k) => k !== "company").map((k) => (
                    <option key={k} value={k}>
                      {labelize(k)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
                  className="rounded-lg border border-border px-2 text-muted-foreground hover:text-critical"
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDrafts([...drafts, { name: "", kind: "branch" }])}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <Plus className="size-4" /> Add another
          </button>
          {error && <p className="text-sm text-critical">{error}</p>}
          <button
            disabled={busy}
            onClick={createSpaces}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="mt-3 space-y-4">
          <h1 className="text-xl font-semibold">
            Bring your team into the loop
          </h1>
          <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              Email invitations aren’t enabled yet. No invitations have been
              sent.
            </p>
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                Ask teammates to create an account using your app’s sign-up
                page.
              </li>
              <li>
                Open Settings and add each registered person by email, then
                choose their role and primary space.
              </li>
              <li>
                Start with a signal: mention someone for attention, forward for
                input, or assign responsibility.
              </li>
            </ol>
            <Link
              href="/settings"
              className="inline-flex font-medium text-primary underline"
            >
              Open team settings
            </Link>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your inbox shows work assigned to you and requests for input.
            Company Pulse shows the bigger picture. Both stay available in
            navigation.
          </p>
          <button
            onClick={() => router.push("/inbox")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Finish setup &amp; open my inbox
          </button>
        </div>
      )}
    </div>
  );
}
