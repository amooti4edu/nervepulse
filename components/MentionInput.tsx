"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Building2, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type MentionEntity = {
  entity_id: string;
  entity_type: string; // "person" | "space"
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  mentions: MentionEntity[];
  onMentionsChange: (mentions: MentionEntity[]) => void;
  organizationId?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function useMentionables(organizationId?: string) {
  const [items, setItems] = useState<MentionEntity[]>([]);
  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    void supabase
      .from("mentionable_entities")
      .select("entity_id, entity_type, label")
      .eq("organization_id", organizationId)
      .then(({ data }) => {
        if (active && data) setItems(data as MentionEntity[]);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);
  return items;
}

export function MentionInput({
  value,
  onChange,
  mentions,
  onMentionsChange,
  organizationId,
  placeholder,
  rows = 4,
  className,
}: Props) {
  const entities = useMentionables(organizationId);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return entities.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, entities]);

  function handleChange(next: string, position: number) {
    onChange(next);
    setCaret(position);
    const before = next.slice(0, position);
    const match = /@([\w'-]*)$/.exec(before);
    setQuery(match?.[1] ?? null);
  }

  function select(entity: MentionEntity) {
    const before = value.slice(0, caret).replace(/@([\w'-]*)$/, `@${entity.label} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    if (!mentions.some((m) => m.entity_id === entity.entity_id)) {
      onMentionsChange([...mentions, entity]);
    }
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery(null);
        }}
        className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
      />
      {query !== null && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
          {matches.map((m) => (
            <li key={`${m.entity_type}-${m.entity_id}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(m);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {m.entity_type === "space" ? (
                  <Building2 className="size-3.5 text-muted-foreground" />
                ) : (
                  <User className="size-3.5 text-muted-foreground" />
                )}
                <span>{m.label}</span>
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  {m.entity_type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {mentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mentions.map((m) => (
            <span
              key={`${m.entity_type}-${m.entity_id}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs text-primary"
            >
              <AtSign className="size-3" />
              {m.label}
              <button
                type="button"
                onClick={() =>
                  onMentionsChange(mentions.filter((x) => x.entity_id !== m.entity_id))
                }
                className="opacity-70 hover:opacity-100"
                aria-label={`Remove ${m.label}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Writes @-mentions into signal_participants for a signal. */
export async function persistMentions(signalId: string, mentions: MentionEntity[]) {
  if (mentions.length === 0) return;
  const rows = mentions.map((m) => ({
    signal_id: signalId,
    person_id: m.entity_type === "person" ? m.entity_id : null,
    space_id: m.entity_type === "space" ? m.entity_id : null,
    role: "participant",
  }));
  await supabase.from("signal_participants").insert(rows);
  const people = mentions.filter((m) => m.entity_type === "person");
  if (people.length > 0) {
    await supabase.from("notifications").insert(
      people.map((p) => ({ person_id: p.entity_id, signal_id: signalId, kind: "mention" })),
    );
  }
}

/** Single-entity picker (used for Forward). */
export function EntityPicker({
  organizationId,
  value,
  onSelect,
}: {
  organizationId?: string;
  value: MentionEntity | null;
  onSelect: (entity: MentionEntity | null) => void;
}) {
  const entities = useMentionables(organizationId);
  const [q, setQ] = useState("");
  const matches = entities
    .filter((e) => e.label.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs text-primary">
          <AtSign className="size-3" />
          {value.label}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="@ person or space"
        className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring"
      />
      {q && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover p-1">
          {matches.map((m) => (
            <li key={`${m.entity_type}-${m.entity_id}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(m);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {m.entity_type === "space" ? (
                  <Building2 className="size-3.5" />
                ) : (
                  <User className="size-3.5" />
                )}
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
