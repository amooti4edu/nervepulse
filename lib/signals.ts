import type { Database } from "@/lib/supabase/types";

export type SignalType = Database["public"]["Enums"]["signal_type"];
export type SignalStatus = Database["public"]["Enums"]["signal_status"];
export type SignalPriority = Database["public"]["Enums"]["signal_priority"];
export type SignalVisibility = Database["public"]["Enums"]["signal_visibility"];
export type SpaceKind = Database["public"]["Enums"]["space_kind"];
export type OrgRole = Database["public"]["Enums"]["org_role"];
export type RelationshipKind = Database["public"]["Enums"]["relationship_kind"];
export type Signal = Database["public"]["Tables"]["signals"]["Row"];
export type Space = Database["public"]["Tables"]["spaces"]["Row"];

export const SIGNAL_TYPES: SignalType[] = [
  "issue",
  "update",
  "request",
  "task",
  "announcement",
  "decision",
  "question",
  "event",
];

export const SIGNAL_STATUSES: SignalStatus[] = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
];

export const SIGNAL_PRIORITIES: SignalPriority[] = ["low", "medium", "high", "critical"];

export const SPACE_KINDS: SpaceKind[] = [
  "division",
  "department",
  "branch",
  "office",
  "company",
];

export const ORG_ROLES: OrgRole[] = ["owner", "admin", "manager", "employee"];

/** open -> acknowledged -> in_progress -> resolved -> closed, resolved -> open reopens. */
export const STATUS_TRANSITIONS: Record<SignalStatus, SignalStatus[]> = {
  open: ["acknowledged"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed", "open"],
  closed: [],
};

export const RELATIONSHIP_LABEL: Record<RelationshipKind, string> = {
  caused_by: "caused by",
  responds_to: "responds to",
  assigned_from: "assigned from",
  resolves: "resolves",
  follows: "follows",
  related_to: "related to",
};

export function statusTone(status: SignalStatus) {
  switch (status) {
    case "open":
      return "critical";
    case "acknowledged":
      return "attention";
    case "in_progress":
      return "progress";
    case "resolved":
      return "healthy";
    default:
      return "muted";
  }
}

export function priorityTone(priority: SignalPriority) {
  switch (priority) {
    case "critical":
      return "critical";
    case "high":
      return "attention";
    case "medium":
      return "progress";
    default:
      return "muted";
  }
}

export const toneClasses: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  attention: "bg-attention/15 text-attention border-attention/30",
  progress: "bg-progress/15 text-progress border-progress/30",
  healthy: "bg-healthy/15 text-healthy border-healthy/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export const toneDot: Record<string, string> = {
  critical: "bg-critical",
  attention: "bg-attention",
  progress: "bg-progress",
  healthy: "bg-healthy",
  muted: "bg-muted-foreground",
};

export const toneText: Record<string, string> = {
  critical: "text-critical",
  attention: "text-attention",
  progress: "text-progress",
  healthy: "text-healthy",
  muted: "text-muted-foreground",
};

export function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
