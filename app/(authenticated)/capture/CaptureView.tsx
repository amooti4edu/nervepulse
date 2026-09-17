"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { MentionInput, persistMentions, type MentionEntity } from "@/components/MentionInput";
import { useMembership, useSpaces } from "@/lib/useOrg";
import {
  SIGNAL_PRIORITIES,
  SIGNAL_TYPES,
  labelize,
  type SignalPriority,
  type SignalType,
} from "@/lib/signals";
import { classifySignal } from "@/lib/actions/classify";
import { cn } from "@/lib/utils";

type Draft = {
  type: SignalType;
  title: string;
  body: string;
  priority: SignalPriority;
  space_id: string | null;
};

export function CaptureView() {
  const router = useRouter();
  const { data: membership, userId } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);

  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<MentionEntity[]>([]);
  const [aiMode, setAiMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [edited, setEdited] = useState(false);

  const defaultSpace = membership?.primary_space_id ?? spaces?.[0]?.id ?? null;

  async function insertSignal(values: Draft, aiPayload: unknown, confirmed: boolean) {
    if (!orgId || !userId) return;
    const spaceId = values.space_id ?? defaultSpace;
    if (!spaceId) {
      toast.error("Add a space in Settings first.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("signals")
      .insert({
        organization_id: orgId,
        space_id: spaceId,
        type: values.type,
        priority: values.priority,
        title: values.title.slice(0, 140),
        body: values.body,
        created_by: userId,
        owner_id: userId,
        ...(aiPayload ? { ai_suggested: aiPayload as never, ai_confirmed: confirmed } : {}),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await persistMentions(data.id, mentions);
    toast.success("Signal captured");
    router.push(`/signals/${data.id}`);
  }

  async function submitPlain() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const firstLine = trimmed.split("\n")[0] ?? trimmed;
    await insertSignal(
      {
        type: "update",
        title: firstLine.slice(0, 120),
        body: trimmed,
        priority: "medium",
        space_id: defaultSpace,
      },
      null,
      false,
    );
  }

  async function runAi() {
    const trimmed = text.trim();
    if (!trimmed || !orgId) return;
    setBusy(true);
    try {
      const result = await classifySignal({ text: trimmed, organizationId: orgId });
      setRaw(result.raw);
      setDraft({
        type: result.parsed.type,
        title: result.parsed.title,
        body: result.parsed.body,
        priority: result.parsed.priority,
        space_id: result.parsed.space_id ?? defaultSpace,
      });
      setEdited(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setBusy(false);
    }
  }

  function patch(next: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...next } : d));
    setEdited(true);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Capture</h1>
        <button
          onClick={() => setAiMode(!aiMode)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
            aiMode
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          <Sparkles className="size-3.5" />
          AI classify {aiMode ? "on" : "off"}
        </button>
      </div>

      <MentionInput
        value={text}
        onChange={setText}
        mentions={mentions}
        onMentionsChange={setMentions}
        {...(orgId ? { organizationId: orgId } : {})}
        rows={6}
        placeholder="What happened? Type @ to tag a person, branch or department…"
      />

      <div className="flex gap-2">
        {aiMode ? (
          <button
            disabled={busy || !text.trim()}
            onClick={runAi}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Draft with AI
          </button>
        ) : (
          <button
            disabled={busy || !text.trim()}
            onClick={submitPlain}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Capture signal
          </button>
        )}
      </div>

      {draft && (
        <div className="rounded-xl border border-primary/40 bg-card p-3">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Sparkles className="size-3.5" /> Confirm draft
          </div>
          <div className="space-y-3">
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm font-medium outline-none focus:border-ring"
            />
            <textarea
              rows={4}
              value={draft.body}
              onChange={(e) => patch({ body: e.target.value })}
              className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={draft.type}
                onChange={(e) => patch({ type: e.target.value as SignalType })}
                className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
              >
                {SIGNAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={draft.priority}
                onChange={(e) => patch({ priority: e.target.value as SignalPriority })}
                className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
              >
                {SIGNAL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={draft.space_id ?? ""}
                onChange={(e) => patch({ space_id: e.target.value || null })}
                className="rounded-lg border border-input bg-surface px-2 py-2 text-sm"
              >
                <option value="">No space</option>
                {(spaces ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {labelize(s.kind)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => insertSignal(draft, raw, !edited)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {edited ? "Confirm edited signal" : "Confirm as-is"}
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setRaw(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Discard & tag manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
