"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Loader2,
  MessageSquareText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  MentionInput,
  persistMentions,
  type MentionEntity,
} from "@/components/MentionInput";
import { useMembership, useSpaces } from "@/lib/useOrg";
import {
  SIGNAL_PRIORITIES,
  SIGNAL_TYPES,
  labelize,
  type SignalPriority,
  type SignalType,
} from "@/lib/signals";
import { classifySignal } from "@/lib/actions/classify";
import {
  AttachmentPicker,
  uploadPendingFiles,
  type PendingFile,
} from "@/components/AttachmentPicker";
import { cn } from "@/lib/utils";
import { TYPE_HELP, PRIORITY_HELP } from "@/lib/workflow";

type Draft = {
  type: SignalType;
  title: string;
  body: string;
  priority: SignalPriority;
  space_id: string | null;
};

export function CaptureView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: membership, userId } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);

  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<MentionEntity[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [aiMode, setAiMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [edited, setEdited] = useState(false);
  const [manualType, setManualType] = useState<SignalType>("update");
  const [manualPriority, setManualPriority] =
    useState<SignalPriority>("medium");
  const [manualSpace, setManualSpace] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");

  const defaultSpace = membership?.primary_space_id ?? spaces?.[0]?.id ?? null;

  async function insertSignal(
    values: Draft,
    aiPayload: unknown,
    confirmed: boolean,
  ) {
    if (
      busy ||
      !orgId ||
      !userId ||
      !values.title.trim() ||
      !values.body.trim()
    )
      return;
    const spaceId = values.space_id ?? defaultSpace;
    if (!spaceId) {
      toast.error("Add a space in Settings first.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("signals")
        .insert({
          organization_id: orgId,
          space_id: spaceId,
          type: values.type,
          priority: values.priority,
          title: values.title.trim().slice(0, 140),
          body: values.body,
          created_by: userId,
          owner_id: userId,
          ...(aiPayload
            ? { ai_suggested: aiPayload as never, ai_confirmed: confirmed }
            : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      try {
        await persistMentions(data.id, mentions);
      } catch {
        toast.error(
          "Signal saved, but mentions couldn’t be sent. Mention people again in the discussion.",
        );
      }
      if (pendingFiles.length > 0) {
        try {
          await uploadPendingFiles(pendingFiles, data.id, userId);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Signal saved, but an attachment failed: ${err.message}`
              : "Signal saved, but an attachment failed to upload.",
          );
        }
      }
      toast.success(
        "Signal captured. You’re the owner and are following its discussion.",
      );
      void qc.invalidateQueries({ queryKey: ["my-inbox"] });
      void qc.invalidateQueries({ queryKey: ["pulse"] });
      void qc.invalidateQueries({ queryKey: ["signals-search"] });
      router.push(`/signals/${data.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn’t save the signal. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitPlain() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const firstLine = trimmed.split("\n")[0] ?? trimmed;
    await insertSignal(
      {
        type: manualType,
        title: manualTitle.trim() || firstLine.slice(0, 120),
        body: trimmed,
        priority: manualPriority,
        space_id: manualSpace ?? defaultSpace,
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
      const result = await classifySignal({
        text: trimmed,
        organizationId: orgId,
      });
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Make it a signal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What’s happening<span className="text-primary">?</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A blocker, a question, a little progress. Give your team the context
          to move forward.
        </p>
      </div>
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="size-4 text-primary" />
            New signal
          </div>
          <button
            onClick={() => {
              setAiMode(!aiMode);
              setDraft(null);
              setRaw(null);
            }}
            disabled={busy}
            aria-pressed={aiMode}
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

        {!aiMode && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-xs font-medium">
                Type
                <select
                  value={manualType}
                  disabled={busy}
                  onChange={(e) => setManualType(e.target.value as SignalType)}
                  aria-describedby="capture-type-help"
                  className="w-full rounded-lg border border-input bg-surface p-2.5 text-sm"
                >
                  {SIGNAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelize(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-medium">
                Priority
                <select
                  value={manualPriority}
                  disabled={busy}
                  onChange={(e) =>
                    setManualPriority(e.target.value as SignalPriority)
                  }
                  aria-describedby="capture-priority-help"
                  className="w-full rounded-lg border border-input bg-surface p-2.5 text-sm"
                >
                  {SIGNAL_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {labelize(priority)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-medium">
                Space
                <select
                  value={manualSpace ?? defaultSpace ?? ""}
                  disabled={busy}
                  onChange={(e) => setManualSpace(e.target.value || null)}
                  aria-describedby="capture-space-help"
                  className="w-full rounded-lg border border-input bg-surface p-2.5 text-sm"
                >
                  <option value="" disabled>
                    Choose a space
                  </option>
                  {(spaces ?? []).map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              <p id="capture-type-help">
                <strong>Type:</strong> {TYPE_HELP[manualType]}
              </p>
              <p id="capture-priority-help">
                <strong>Priority:</strong> {PRIORITY_HELP[manualPriority]}
              </p>
              <p id="capture-space-help">
                <strong>Space:</strong> The branch or department this signal
                belongs to. A mention or forward is not a private message.
              </p>
            </div>
            <label className="block space-y-2 text-xs font-medium">
              Title{" "}
              <span className="font-normal text-muted-foreground">
                (optional; otherwise we use your first line)
              </span>
              <input
                value={manualTitle}
                maxLength={140}
                disabled={busy}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
                placeholder="A short, clear summary"
              />
            </label>
          </div>
        )}
        {!defaultSpace && !spaces?.length && (
          <p className="text-xs text-attention">
            You need a space before capturing a signal.{" "}
            <Link href="/settings" className="underline">
              Set up a space in Settings
            </Link>
            .
          </p>
        )}
        <MentionInput
          value={text}
          onChange={(value) => {
            setText(value);
            setDraft(null);
            setRaw(null);
          }}
          mentions={mentions}
          onMentionsChange={setMentions}
          {...(orgId ? { organizationId: orgId } : {})}
          rows={8}
          disabled={busy}
          aria-label="Signal description"
          placeholder="Start with what matters. What happened, who’s involved, and what’s next? Type @ to mention a person or team…"
        />

        <p className="text-xs leading-relaxed text-muted-foreground">
          You’ll be the owner initially. Use Assign on the saved signal to hand
          off responsibility. @mention a person for attention; mentioning a team
          adds context but doesn’t send individual alerts.
        </p>
        <fieldset disabled={busy}>
          <legend className="sr-only">Attachments</legend>
          <AttachmentPicker onPendingChange={setPendingFiles} />
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {aiMode
              ? "AI helps organize your thoughts. You review before anything is shared."
              : `Save as ${manualType}. You can discuss, assign, and track it after capturing.`}
          </p>
          {aiMode ? (
            <button
              disabled={busy || !text.trim() || !orgId || !defaultSpace}
              onClick={runAi}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Draft with AI
            </button>
          ) : (
            <button
              disabled={busy || !text.trim() || !orgId || !defaultSpace}
              onClick={submitPlain}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Capture signal <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-primary/10 bg-accent/40 p-4 text-sm">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            Clarity over perfection.
          </span>{" "}
          Write naturally. Turn on AI classify to suggest a title, type,
          priority, and space for your signal.
        </p>
      </div>

      {draft && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Sparkles className="size-3.5" /> Confirm draft
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Nothing has been shared yet. Review the suggested title, message,
            type, priority, and space below. You can change any suggestion
            before confirming.
          </p>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            {TYPE_HELP[draft.type]} {PRIORITY_HELP[draft.priority]}
          </p>
          <div className="space-y-3">
            <input
              value={draft.title}
              aria-label="Signal title"
              onChange={(e) => patch({ title: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm font-medium outline-none focus:border-ring"
            />
            <textarea
              rows={4}
              value={draft.body}
              aria-label="Signal body"
              onChange={(e) => patch({ body: e.target.value })}
              className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={draft.type}
                aria-label="Signal type"
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
                aria-label="Signal priority"
                onChange={(e) =>
                  patch({ priority: e.target.value as SignalPriority })
                }
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
                aria-label="Signal space"
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
                disabled={
                  busy ||
                  !draft.title.trim() ||
                  !draft.body.trim() ||
                  !draft.space_id ||
                  !orgId
                }
                onClick={() => insertSignal(draft, raw, !edited)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {edited ? "Confirm edited signal" : "Confirm as-is"}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setManualType(draft.type);
                  setManualPriority(draft.priority);
                  setManualSpace(draft.space_id);
                  setManualTitle(draft.title);
                  setText(draft.body);
                  setAiMode(false);
                  setDraft(null);
                  setRaw(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Continue manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
