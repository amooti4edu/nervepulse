"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  Forward,
  Link2,
  Loader2,
  Paperclip,
  Send,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  Pill,
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/Badges";
import { SectionCard } from "@/components/SignalRow";
import {
  EntityPicker,
  MentionInput,
  persistMentions,
  type MentionEntity,
} from "@/components/MentionInput";
import { isElevated, useMembership, useSignalsRealtime } from "@/lib/useOrg";
import {
  RELATIONSHIP_LABEL,
  labelize,
  timeAgo,
  type RelationshipKind,
  type Signal,
  type SignalStatus,
} from "@/lib/signals";
import { cn } from "@/lib/utils";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { getAttachmentUrl } from "@/lib/attachments";
import { useDiscussionRealtime, useFollowing } from "@/lib/useCollaboration";
import {
  isInformational,
  nextStatuses,
  statusAction,
  TYPE_HELP,
} from "@/lib/workflow";

type Ref = { id: string; name: string } | null;
type PersonRef = { id: string; full_name: string } | null;
type SignalWithRefs = Signal & {
  space: Ref;
  owner: PersonRef;
  owner_space: Ref;
  creator: PersonRef;
};
type RelatedSignal = {
  id: string;
  title: string;
  status: SignalStatus;
  type: Signal["type"];
} | null;
type Relationship = {
  id: string;
  kind: RelationshipKind;
  created_at: string;
  direction: "out" | "in";
  other: RelatedSignal;
};
type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: PersonRef;
};
type Participant = { id: string; role: string; person: PersonRef; space: Ref };
type ForwardRow = {
  id: string;
  note: string | null;
  created_at: string;
  by: PersonRef;
  to_person: PersonRef;
  to_space: Ref;
};
type Attachment = {
  id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

const RELATIONSHIP_KINDS = Object.keys(
  RELATIONSHIP_LABEL,
) as RelationshipKind[];

const inputClass =
  "w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring";
const primaryBtn =
  "flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50";
const ghostBtn =
  "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50";

export function SignalDetailView({ signalId }: { signalId: string }) {
  const qc = useQueryClient();
  const { data: membership, userId } = useMembership();
  const orgId = membership?.organization_id;
  const elevated = isElevated(membership?.role);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["signal", signalId] });
    void qc.invalidateQueries({ queryKey: ["pulse"] });
    void qc.invalidateQueries({ queryKey: ["my-inbox"] });
    void qc.invalidateQueries({ queryKey: ["signals-search"] });
    void qc.invalidateQueries({ queryKey: ["space-health"] });
    void qc.invalidateQueries({ queryKey: ["recent-signals"] });
  };
  useSignalsRealtime(orgId, refresh);
  useDiscussionRealtime(signalId);
  const following = useFollowing(signalId, userId);

  const {
    data: signal,
    isPending: signalPending,
    isError: signalError,
    refetch: retrySignal,
  } = useQuery({
    queryKey: ["signal", signalId, "core"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select(
          "*, space:spaces!signals_space_id_fkey(id, name), owner:people!signals_owner_id_fkey(id, full_name), owner_space:spaces!signals_owner_space_id_fkey(id, name), creator:people!signals_created_by_fkey(id, full_name)",
        )
        .eq("id", signalId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SignalWithRefs | null;
    },
  });

  const { data: relationships } = useQuery({
    queryKey: ["signal", signalId, "relationships"],
    queryFn: async (): Promise<Relationship[]> => {
      const [out, inc] = await Promise.all([
        supabase
          .from("signal_relationships")
          .select(
            "id, kind, created_at, other:signals!signal_relationships_to_signal_id_fkey(id, title, status, type)",
          )
          .eq("from_signal_id", signalId),
        supabase
          .from("signal_relationships")
          .select(
            "id, kind, created_at, other:signals!signal_relationships_from_signal_id_fkey(id, title, status, type)",
          )
          .eq("to_signal_id", signalId),
      ]);
      const outRows = (out.data ?? []) as unknown as Omit<
        Relationship,
        "direction"
      >[];
      const inRows = (inc.data ?? []) as unknown as Omit<
        Relationship,
        "direction"
      >[];
      return [
        ...outRows.map((r) => ({ ...r, direction: "out" as const })),
        ...inRows.map((r) => ({ ...r, direction: "in" as const })),
      ].sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
  });

  const {
    data: comments,
    isPending: commentsPending,
    isError: commentsError,
    refetch: retryComments,
  } = useQuery({
    queryKey: ["signal", signalId, "comments"],
    enabled: !!signal,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signal_comments")
        .select(
          "id, body, created_at, author:people!signal_comments_author_id_fkey(id, full_name)",
        )
        .eq("signal_id", signalId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Comment[];
    },
  });

  useEffect(() => {
    if (signal?.id && window.location.hash === "#discussion") {
      document.getElementById("discussion")?.scrollIntoView({ block: "start" });
    }
  }, [signal?.id]);

  const { data: participants } = useQuery({
    queryKey: ["signal", signalId, "participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signal_participants")
        .select(
          "id, role, person:people!signal_participants_person_id_fkey(id, full_name), space:spaces!signal_participants_space_id_fkey(id, name)",
        )
        .eq("signal_id", signalId)
        .order("added_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Participant[];
    },
  });

  const { data: forwards } = useQuery({
    queryKey: ["signal", signalId, "forwards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signal_forwards")
        .select(
          "id, note, created_at, by:people!signal_forwards_forwarded_by_fkey(id, full_name), to_person:people!signal_forwards_forwarded_to_person_fkey(id, full_name), to_space:spaces!signal_forwards_forwarded_to_space_fkey(id, name)",
        )
        .eq("signal_id", signalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ForwardRow[];
    },
  });

  const { data: attachments } = useQuery({
    queryKey: ["signal", signalId, "attachments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("signal_attachments")
        .select("id, file_name, storage_path, created_at")
        .eq("signal_id", signalId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Attachment[];
    },
  });

  // ---- local state for actions
  const [busy, setBusy] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState<MentionEntity[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState<MentionEntity | null>(null);
  const [forwardNote, setForwardNote] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [newOwner, setNewOwner] = useState<MentionEntity | null>(null);
  const [relateOpen, setRelateOpen] = useState(false);
  const [relateKind, setRelateKind] = useState<RelationshipKind>("related_to");
  const [relateQuery, setRelateQuery] = useState("");

  const { data: relateMatches } = useQuery({
    queryKey: ["signal-search", orgId, relateQuery],
    enabled: relateOpen && relateQuery.trim().length > 1 && !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("signals")
        .select("id, title, status, type")
        .eq("organization_id", orgId!)
        .neq("id", signalId)
        .ilike("title", `%${relateQuery.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []) as NonNullable<RelatedSignal>[];
    },
  });

  if (signalPending) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading signal…
      </div>
    );
  }
  if (signalError) {
    return (
      <p role="alert" className="p-6 text-sm text-critical">
        We couldn’t load this signal.{" "}
        <button onClick={() => void retrySignal()} className="underline">
          Try again
        </button>
      </p>
    );
  }
  if (!signal) {
    return (
      <div className="mx-auto max-w-lg space-y-2 py-10 text-center">
        <h1 className="text-lg font-semibold">Signal not found</h1>
        <p className="text-sm text-muted-foreground">
          It may have been made restricted, or it does not exist.
        </p>
        <Link href="/signals" className="text-sm text-primary hover:underline">
          Back to signals
        </Link>
      </div>
    );
  }

  const canEdit =
    elevated || signal.created_by === userId || signal.owner_id === userId;
  const transitions = nextStatuses(signal.type, signal.status);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  function toggleFollowing() {
    if (!userId || following.isPending || following.isError) return;
    void run("follow", async () => {
      const result = following.data
        ? await supabase
            .from("signal_followers")
            .delete()
            .eq("signal_id", signalId)
            .eq("person_id", userId)
        : await supabase
            .from("signal_followers")
            .insert({ signal_id: signalId, person_id: userId });
      if (result.error) throw result.error;
      toast.success(
        following.data
          ? "Unfollowed. Direct mentions and assignments will still notify you."
          : "Following. You’ll hear about new replies and status changes.",
      );
      refresh();
    });
  }

  function changeStatus(next: SignalStatus) {
    if (!signal) return;
    void run(`status-${next}`, async () => {
      const patch: Partial<Signal> = { status: next };
      if (next === "resolved") patch.resolved_at = new Date().toISOString();
      if (next === "open") patch.resolved_at = null;
      const { error } = await supabase
        .from("signals")
        .update(patch)
        .eq("id", signal.id);
      if (error) throw error;
      toast.success(
        next === "closed" && isInformational(signal.type)
          ? "Archived. The signal and discussion remain available in search."
          : `Marked ${labelize(next)}`,
      );
      refresh();
    });
  }

  function reassign() {
    if (!signal || !newOwner || !userId) return;
    void run("reassign", async () => {
      const isPerson = newOwner.entity_type === "person";
      const { error } = await supabase
        .from("signals")
        .update(
          isPerson
            ? { owner_id: newOwner.entity_id, owner_space_id: null }
            : { owner_id: null, owner_space_id: newOwner.entity_id },
        )
        .eq("id", signal.id);
      if (error) throw error;
      // Ownership and recipient notifications are written atomically by the
      // signals update + database trigger; no client notification insert.
      const { error: participantError } = await supabase
        .from("signal_participants")
        .insert({
          signal_id: signal.id,
          person_id: isPerson ? newOwner.entity_id : null,
          space_id: isPerson ? null : newOwner.entity_id,
          role: "owner",
        });
      if (participantError && participantError.code !== "23505")
        toast.warning(
          "Owner changed, but the participant list couldn’t be updated.",
        );
      toast.success(`Reassigned to ${newOwner.label}`);
      setNewOwner(null);
      setReassignOpen(false);
      refresh();
    });
  }

  function forward() {
    if (!signal || !forwardTo || !userId) return;
    void run("forward", async () => {
      const isPerson = forwardTo.entity_type === "person";
      const { error } = await supabase.from("signal_forwards").insert({
        signal_id: signal.id,
        forwarded_by: userId,
        forwarded_to_person: isPerson ? forwardTo.entity_id : null,
        forwarded_to_space: isPerson ? null : forwardTo.entity_id,
        note: forwardNote.trim() || null,
      });
      if (error) throw error;
      const { error: participantError } = await supabase
        .from("signal_participants")
        .insert({
          signal_id: signal.id,
          person_id: isPerson ? forwardTo.entity_id : null,
          space_id: isPerson ? null : forwardTo.entity_id,
          role: "forwarded",
        });
      if (participantError && participantError.code !== "23505")
        toast.warning(
          "Forward sent, but the participant list couldn’t be updated.",
        );
      toast.success(`Forwarded to ${forwardTo.label}`);
      setForwardTo(null);
      setForwardNote("");
      setForwardOpen(false);
      refresh();
    });
  }

  function addComment() {
    if (!signal || !userId || !commentText.trim()) return;
    void run("comment", async () => {
      const { data: saved, error } = await supabase
        .from("signal_comments")
        .insert({
          signal_id: signal.id,
          author_id: userId,
          body: commentText.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      try {
        await persistMentions(signal.id, commentMentions, saved.id);
      } catch {
        toast.warning(
          "Reply posted, but mentions couldn’t be sent. Mention those people again in a new reply.",
        );
      }
      setCommentText("");
      setCommentMentions([]);
      refresh();
    });
  }

  function relate(target: NonNullable<RelatedSignal>) {
    if (!signal) return;
    void run("relate", async () => {
      const { error } = await supabase.from("signal_relationships").insert({
        from_signal_id: signal.id,
        to_signal_id: target.id,
        kind: relateKind,
      });
      if (error) throw error;
      toast.success(
        `Linked: ${RELATIONSHIP_LABEL[relateKind]} "${target.title}"`,
      );
      setRelateQuery("");
      setRelateOpen(false);
      refresh();
    });
  }

  const ownerLabel =
    signal.owner?.full_name ?? signal.owner_space?.name ?? "Unassigned";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/signals" className="hover:text-foreground">
          Signals
        </Link>
        <span>/</span>
        {signal.space && (
          <>
            <Link
              href={`/spaces/${signal.space.id}`}
              className="hover:text-foreground"
            >
              {signal.space.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="font-mono">{signal.id.slice(0, 8)}</span>
      </div>

      <header className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={signal.type} />
          <StatusBadge status={signal.status} type={signal.type} />
          <PriorityBadge priority={signal.priority} />
          <Pill tone="muted">{labelize(signal.visibility)}</Pill>
          {signal.ai_suggested !== null && (
            <Pill tone={signal.ai_confirmed ? "healthy" : "attention"}>
              AI {signal.ai_confirmed ? "confirmed" : "edited"}
            </Pill>
          )}
        </div>
        <h1 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
          {signal.title}
        </h1>
        {signal.body && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {signal.body}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="uppercase tracking-widest text-muted-foreground">
              Owner
            </dt>
            <dd className="mt-0.5 font-medium">{ownerLabel}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-muted-foreground">
              Raised by
            </dt>
            <dd className="mt-0.5 font-medium">
              {signal.creator?.full_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-muted-foreground">
              Created
            </dt>
            <dd
              className="tabular mt-0.5 font-medium"
              title={new Date(signal.created_at).toLocaleString()}
            >
              {timeAgo(signal.created_at)}
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-muted-foreground">
              {signal.resolved_at ? "Resolved" : "Updated"}
            </dt>
            <dd className="tabular mt-0.5 font-medium">
              {timeAgo(signal.resolved_at ?? signal.updated_at)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-lg bg-accent/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {TYPE_HELP[signal.type]}{" "}
          {isInformational(signal.type)
            ? "Archive keeps the signal searchable; it does not delete it."
            : "Acknowledge to accept responsibility, start work when underway, and resolve when complete. Questions can be resolved directly after acknowledging."}
        </p>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {transitions.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Closed — no further transitions.
              </span>
            ) : (
              transitions.map((s) => (
                <button
                  key={s}
                  disabled={busy !== null}
                  onClick={() => changeStatus(s)}
                  className={cn(
                    primaryBtn,
                    s === "open" && "bg-secondary text-secondary-foreground",
                  )}
                >
                  {busy === `status-${s}` ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                  {statusAction(signal.type, s)}
                </button>
              ))
            )}
            <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
            <button
              onClick={() => setReassignOpen((v) => !v)}
              className={ghostBtn}
            >
              <UserCog className="mr-1 inline size-3.5" />
              Assign
            </button>
            <button
              onClick={() => setForwardOpen((v) => !v)}
              className={ghostBtn}
            >
              <Forward className="mr-1 inline size-3.5" />
              Forward
            </button>
            <button
              onClick={() => setRelateOpen((v) => !v)}
              className={ghostBtn}
            >
              <Link2 className="mr-1 inline size-3.5" />
              Link signal
            </button>
          </div>
        )}
        {!canEdit && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            <p className="w-full text-xs leading-relaxed text-muted-foreground">
              The owner, creator, or a workspace manager can change status and
              assignments. You can still contribute below. For space-owned work,
              ask a manager to choose a personal owner when someone takes it on.
            </p>
            <button
              onClick={() => setForwardOpen((v) => !v)}
              className={ghostBtn}
            >
              <Forward className="mr-1 inline size-3.5" />
              Forward
            </button>
            <button
              onClick={() => setRelateOpen((v) => !v)}
              className={ghostBtn}
            >
              <Link2 className="mr-1 inline size-3.5" />
              Link signal
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-border pt-4">
          <button
            onClick={toggleFollowing}
            disabled={busy !== null || following.isPending || following.isError}
            aria-pressed={!!following.data}
            className={ghostBtn}
          >
            {following.data ? (
              <BellOff className="mr-1 inline size-3.5" />
            ) : (
              <Bell className="mr-1 inline size-3.5" />
            )}
            {following.isPending
              ? "Loading…"
              : following.data
                ? "Unfollow"
                : "Follow discussion"}
          </button>
          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
            Following sends notifications for new replies and status changes.
            Unfollowing stops those, but not direct mentions or assignments.
            Creating a signal or being personally assigned subscribes you
            automatically.
          </p>
          {following.isError && (
            <p role="alert" className="text-xs text-critical">
              Couldn’t load your follow preference.{" "}
              <button
                onClick={() => void following.refetch()}
                className="underline"
              >
                Try again
              </button>
            </p>
          )}
        </div>
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-primary">
            Mention, forward, or assign—which should I use?
          </summary>
          <ul className="mt-2 list-disc space-y-2 pl-4 leading-relaxed">
            <li>
              <strong>Mention:</strong> ask a person to pay attention in a
              reply. It doesn’t change the owner. Team mentions add participants
              but don’t alert every member.
            </li>
            <li>
              <strong>Forward:</strong> share context or request input, with an
              optional note. The current owner stays responsible. Forwarding to
              a space alerts members whose primary space matches it.
            </li>
            <li>
              <strong>Assign:</strong> hand responsibility to a person or space.
              Assigning to a space alerts members whose primary space matches
              it.
            </li>
            <li>
              These actions do not create private chats or override access
              permissions. Only people allowed to view this signal can read it.
            </li>
          </ul>
        </details>
        {reassignOpen && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              New owner (person or space)
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This changes who is responsible. The new owner receives an
              assignment notification. Use Forward instead if you only need
              input.
            </p>
            <EntityPicker
              {...(orgId ? { organizationId: orgId } : {})}
              value={newOwner}
              onSelect={setNewOwner}
            />
            <div className="flex gap-2">
              <button
                disabled={!newOwner || busy !== null}
                onClick={reassign}
                className={primaryBtn}
              >
                {busy === "reassign" && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Confirm reassignment
              </button>
              <button
                onClick={() => setReassignOpen(false)}
                className={ghostBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {forwardOpen && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Forward to
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Share this signal for input without changing its owner. The note
              is visible in the signal’s forward history—not a private message.
            </p>
            <EntityPicker
              {...(orgId ? { organizationId: orgId } : {})}
              value={forwardTo}
              onSelect={setForwardTo}
            />
            <input
              value={forwardNote}
              onChange={(e) => setForwardNote(e.target.value)}
              placeholder="What input do you need? (optional)"
              aria-label="Forward note"
              className={inputClass}
            />
            <div className="flex gap-2">
              <button
                disabled={!forwardTo || busy !== null}
                onClick={forward}
                className={primaryBtn}
              >
                {busy === "forward" && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Send forward
              </button>
              <button
                onClick={() => setForwardOpen(false)}
                className={ghostBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {relateOpen && (
          <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              This signal…
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={relateKind}
                onChange={(e) =>
                  setRelateKind(e.target.value as RelationshipKind)
                }
                className="rounded-lg border border-input bg-card px-2 py-2 text-sm"
              >
                {RELATIONSHIP_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {RELATIONSHIP_LABEL[k]}
                  </option>
                ))}
              </select>
              <input
                value={relateQuery}
                onChange={(e) => setRelateQuery(e.target.value)}
                placeholder="Search signals by title…"
                className={cn(inputClass, "min-w-48 flex-1")}
              />
            </div>
            {relateQuery.trim().length > 1 && (
              <ul className="rounded-lg border border-border bg-card p-1">
                {(relateMatches ?? []).length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-muted-foreground">
                    No matches.
                  </li>
                ) : (
                  relateMatches!.map((m) => (
                    <li key={m.id}>
                      <button
                        disabled={busy !== null}
                        onClick={() => relate(m)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <TypeBadge type={m.type} />
                        <span className="min-w-0 flex-1 truncate">
                          {m.title}
                        </span>
                        <StatusBadge status={m.status} type={m.type} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            <button onClick={() => setRelateOpen(false)} className={ghostBtn}>
              Cancel
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div id="discussion" className="scroll-mt-24">
            <SectionCard title={`Discussion · ${comments?.length ?? 0}`}>
              <p className="border-b border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                Replies are shared with everyone who can view this signal.
                Followers are notified of new replies; @mention a person to
                request their attention. Replies update automatically, with a
                periodic refresh as backup.
              </p>
              {commentsPending ? (
                <p role="status" className="p-5 text-sm text-muted-foreground">
                  Loading replies…
                </p>
              ) : commentsError ? (
                <p role="alert" className="p-5 text-sm text-critical">
                  Couldn’t load replies.{" "}
                  <button
                    onClick={() => void retryComments()}
                    className="underline"
                  >
                    Try again
                  </button>
                </p>
              ) : (comments ?? []).length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  Start the discussion: ask a question, share context, or
                  suggest a next step.
                </p>
              ) : (
                <ul
                  role="log"
                  aria-label="Signal discussion"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {comments!.map((c) => (
                    <li
                      key={c.id}
                      className="border-b border-border px-3 py-2.5 last:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium">
                          {c.author?.full_name ?? "Unknown"}
                          {c.author?.id === userId ? " (you)" : ""}
                        </span>
                        <span className="tabular text-[11px] text-muted-foreground">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                        {c.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2 border-t border-border p-3">
                <MentionInput
                  value={commentText}
                  onChange={setCommentText}
                  mentions={commentMentions}
                  onMentionsChange={setCommentMentions}
                  {...(orgId ? { organizationId: orgId } : {})}
                  rows={3}
                  disabled={busy === "comment"}
                  aria-label="Your reply"
                  placeholder="Write a reply. Type @ to ask someone for input…"
                />
                <div className="flex justify-end">
                  <button
                    disabled={busy !== null || !commentText.trim()}
                    onClick={addComment}
                    className={primaryBtn}
                  >
                    {busy === "comment" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Post reply
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
          <SectionCard
            title={`Related signals · ${relationships?.length ?? 0}`}
          >
            {(relationships ?? []).length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Not linked to anything yet. Use &quot;Link signal&quot; above to
                connect causes, responses and follow-ups.
              </p>
            ) : (
              <ul>
                {relationships!.map((r) =>
                  r.other ? (
                    <li key={r.id}>
                      <Link
                        href={`/signals/${r.other.id}`}
                        className="flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-accent/50"
                      >
                        <Pill tone="muted">
                          {r.direction === "out"
                            ? RELATIONSHIP_LABEL[r.kind]
                            : `← ${RELATIONSHIP_LABEL[r.kind]}`}
                        </Pill>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {r.other.title}
                        </span>
                        <StatusBadge
                          status={r.other.status}
                          type={r.other.type}
                        />
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={r.id}
                      className="px-3 py-2.5 text-xs text-muted-foreground"
                    >
                      {RELATIONSHIP_LABEL[r.kind]} a signal you cannot see
                    </li>
                  ),
                )}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Participants">
            {(participants ?? []).length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nobody tagged yet.
              </p>
            ) : (
              <ul className="px-3 py-2">
                {participants!.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {p.person?.full_name ?? p.space?.name ?? "—"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.role === "owner" &&
                      p.person?.id !== signal.owner_id &&
                      p.space?.id !== signal.owner_space_id
                        ? "previous owner"
                        : p.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Forwards">
            {(forwards ?? []).length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Not forwarded.
              </p>
            ) : (
              <ul>
                {forwards!.map((f) => (
                  <li
                    key={f.id}
                    className="border-b border-border px-3 py-2 text-sm last:border-b-0"
                  >
                    <p>
                      <span className="font-medium">
                        {f.by?.full_name ?? "Someone"}
                      </span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">
                        {f.to_person?.full_name ?? f.to_space?.name ?? "—"}
                      </span>
                    </p>
                    {f.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        &quot;{f.note}&quot;
                      </p>
                    )}
                    <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
                      {timeAgo(f.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Attachments">
            {(attachments ?? []).length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No files attached.
              </p>
            ) : (
              <ul className="px-3 py-2">
                {attachments!.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <button
                      onClick={async () => {
                        try {
                          const url = await getAttachmentUrl(a.storage_path);
                          window.open(url, "_blank", "noopener,noreferrer");
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Couldn't open file",
                          );
                        }
                      }}
                      className="min-w-0 flex-1 truncate text-left hover:underline"
                    >
                      {a.file_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <div className="border-t border-border p-3">
                <AttachmentPicker
                  signalId={signal.id}
                  {...(userId ? { uploadedBy: userId } : {})}
                  onUploaded={() =>
                    void qc.invalidateQueries({
                      queryKey: ["signal", signalId, "attachments"],
                    })
                  }
                />
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
