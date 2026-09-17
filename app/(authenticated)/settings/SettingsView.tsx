"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Check, Loader2, Pencil, Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { SectionCard } from "@/components/SignalRow";
import { Pill } from "@/components/Badges";
import { isElevated, useMembership, useSpaces } from "@/lib/useOrg";
import { ORG_ROLES, SPACE_KINDS, labelize, type OrgRole, type SpaceKind } from "@/lib/signals";
import { addMemberByEmail } from "@/lib/actions/members";

type MemberRow = {
  id: string;
  role: OrgRole;
  person_id: string;
  primary_space_id: string | null;
  people: { id: string; full_name: string; email: string } | null;
};

const inputClass =
  "rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring";
const selectClass = "rounded-lg border border-input bg-surface px-2 py-2 text-sm";
const primaryBtn =
  "flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";

export function SettingsView() {
  const qc = useQueryClient();
  const { data: membership, userId } = useMembership();
  const orgId = membership?.organization_id;
  const { data: spaces } = useSpaces(orgId);
  const elevated = isElevated(membership?.role);
  const isOwner = membership?.role === "owner";

  const { data: members } = useQuery({
    queryKey: ["members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_memberships")
        .select("id, role, person_id, primary_space_id, people(id, full_name, email)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as MemberRow[];
    },
  });

  // ---- spaces
  const [newSpace, setNewSpace] = useState("");
  const [newKind, setNewKind] = useState<SpaceKind>("branch");
  const [newParent, setNewParent] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const root = spaces?.find((s) => s.kind === "company");

  async function addSpace() {
    if (!orgId || !newSpace.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("spaces").insert({
      organization_id: orgId,
      name: newSpace.trim(),
      kind: newKind,
      parent_space_id: newParent || root?.id || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewSpace("");
    toast.success("Space added");
    void qc.invalidateQueries({ queryKey: ["spaces"] });
  }

  async function saveSpaceName(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase.from("spaces").update({ name: editName.trim() }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    void qc.invalidateQueries({ queryKey: ["spaces"] });
  }

  async function changeSpaceKind(id: string, kind: SpaceKind) {
    const { error } = await supabase.from("spaces").update({ kind }).eq("id", id);
    if (error) toast.error(error.message);
    else void qc.invalidateQueries({ queryKey: ["spaces"] });
  }

  // ---- members
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "employee">("employee");
  const [inviteSpace, setInviteSpace] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  async function updateMember(id: string, patch: { role?: OrgRole; primary_space_id?: string | null }) {
    const { error } = await supabase.from("org_memberships").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["members"] });
    void qc.invalidateQueries({ queryKey: ["membership"] });
  }

  async function invite() {
    if (!orgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await addMemberByEmail({
        organizationId: orgId,
        email: inviteEmail.trim(),
        role: inviteRole,
        primarySpaceId: inviteSpace || null,
      });
      if (result.status === "added") {
        toast.success(`${result.name} added to the organization`);
        setInviteEmail("");
        void qc.invalidateQueries({ queryKey: ["members"] });
      } else if (result.status === "already_member") {
        toast.info(`${result.name} is already a member`);
      } else {
        toast.error("No account with that email yet. Ask them to sign up first, then add them.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setInviting(false);
    }
  }

  const assignableRoles: OrgRole[] = isOwner ? ORG_ROLES : ORG_ROLES.filter((r) => r !== "owner");

  if (membership === null) {
    return (
      <div className="mx-auto max-w-lg space-y-2 py-10 text-center">
        <h1 className="text-lg font-semibold">No organization yet</h1>
        <Link href="/onboarding" className="text-sm text-primary hover:underline">
          Set one up
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {elevated
            ? "You can manage spaces, people and roles."
            : "Read-only. Ask an owner, admin or manager to make changes."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Organization</p>
          <p className="mt-1 truncate text-sm font-medium">{membership?.organizations?.name ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spaces</p>
          <p className="tabular mt-1 text-sm font-medium">{spaces?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">People</p>
          <p className="tabular mt-1 text-sm font-medium">{members?.length ?? 0}</p>
        </div>
      </div>

      <SectionCard title="Spaces">
        <ul>
          {(spaces ?? []).map((s) => {
            const parent = spaces?.find((p) => p.id === s.parent_space_id);
            const isRoot = s.kind === "company";
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                {editingId === s.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveSpaceName(s.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={`${inputClass} min-w-40 flex-1`}
                    />
                    <button
                      onClick={() => saveSpaceName(s.id)}
                      className="rounded-md p-1.5 text-healthy hover:bg-accent"
                      aria-label="Save"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                      aria-label="Cancel"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/spaces/${s.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    {parent && !isRoot && (
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        in {parent.name}
                      </span>
                    )}
                    {elevated && !isRoot ? (
                      <select
                        value={s.kind}
                        onChange={(e) => changeSpaceKind(s.id, e.target.value as SpaceKind)}
                        className="rounded-md border border-input bg-surface px-1.5 py-1 text-[11px] uppercase tracking-wide"
                      >
                        {SPACE_KINDS.filter((k) => k !== "company").map((k) => (
                          <option key={k} value={k}>
                            {labelize(k)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Pill tone="muted">{labelize(s.kind)}</Pill>
                    )}
                    {elevated && (
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Rename ${s.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {elevated && (
          <div className="flex flex-wrap gap-2 border-t border-border p-3">
            <input
              value={newSpace}
              onChange={(e) => setNewSpace(e.target.value)}
              placeholder="New space name"
              className={`${inputClass} min-w-40 flex-1`}
            />
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as SpaceKind)}
              className={selectClass}
            >
              {SPACE_KINDS.filter((k) => k !== "company").map((k) => (
                <option key={k} value={k}>
                  {labelize(k)}
                </option>
              ))}
            </select>
            <select
              value={newParent}
              onChange={(e) => setNewParent(e.target.value)}
              className={selectClass}
            >
              <option value="">Under {root?.name ?? "company"}</option>
              {(spaces ?? [])
                .filter((s) => s.kind !== "company")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    Under {s.name}
                  </option>
                ))}
            </select>
            <button disabled={busy || !newSpace.trim()} onClick={addSpace} className={primaryBtn}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="People & roles">
        <ul>
          {(members ?? []).map((m) => {
            const self = m.person_id === userId;
            const canEditRow = elevated && !self && (isOwner || m.role !== "owner");
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.people?.full_name ?? "Unknown"}
                    {self && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.people?.email}</p>
                </div>
                {canEditRow ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => updateMember(m.id, { role: e.target.value as OrgRole })}
                      className={selectClass}
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m.primary_space_id ?? ""}
                      onChange={(e) =>
                        updateMember(m.id, { primary_space_id: e.target.value || null })
                      }
                      className={selectClass}
                    >
                      <option value="">No primary space</option>
                      {(spaces ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <Pill tone={m.role === "employee" ? "muted" : "progress"}>{m.role}</Pill>
                    <span className="text-xs text-muted-foreground">
                      {spaces?.find((s) => s.id === m.primary_space_id)?.name ?? "No primary space"}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {elevated && (
          <div className="space-y-2 border-t border-border p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Add a person who has already signed up
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
                className={`${inputClass} min-w-48 flex-1`}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                className={selectClass}
              >
                <option value="employee">employee</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
              <select
                value={inviteSpace}
                onChange={(e) => setInviteSpace(e.target.value)}
                className={selectClass}
              >
                <option value="">No primary space</option>
                {(spaces ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button disabled={inviting || !inviteEmail.trim()} onClick={invite} className={primaryBtn}>
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Add member
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
