import type { SignalPriority, SignalStatus, SignalType } from "./signals";

export const TYPE_HELP: Record<SignalType, string> = {
  issue:
    "Something is wrong or blocking work. Track it through to a resolution.",
  request: "You need someone to provide help, approval, or resources.",
  task: "A specific piece of work with an owner and a clear finish.",
  question: "You need an answer. Resolve it when the answer is agreed.",
  update:
    "Share progress or context. No task workflow is required; archive it when no longer relevant.",
  announcement:
    "Share information people should know. Archive it when no longer relevant.",
  decision:
    "Record an agreed direction and its context. Archive it when superseded.",
  event: "Share an upcoming activity. Archive it after it has happened.",
};

export const PRIORITY_HELP: Record<SignalPriority, string> = {
  low: "Useful context; no urgency.",
  medium: "Normal priority; handle in the usual flow of work.",
  high: "Needs attention soon; other work may be affected.",
  critical: "Urgent disruption or risk; needs immediate attention.",
};

export function isInformational(type: SignalType) {
  return ["update", "announcement", "decision", "event"].includes(type);
}

export function nextStatuses(
  type: SignalType,
  status: SignalStatus,
): SignalStatus[] {
  if (isInformational(type)) return status === "closed" ? ["open"] : ["closed"];
  switch (status) {
    case "open":
      return ["acknowledged"];
    case "acknowledged":
      return ["in_progress", "resolved"];
    case "in_progress":
      return ["resolved"];
    case "resolved":
      return ["closed", "open"];
    case "closed":
      return ["open"];
  }
}

export function statusAction(type: SignalType, status: SignalStatus) {
  if (status === "open") return "Reopen";
  if (status === "closed") return isInformational(type) ? "Archive" : "Close";
  if (status === "acknowledged") return "Acknowledge";
  if (status === "in_progress") return "Start work";
  return type === "question" ? "Mark answered" : "Mark resolved";
}

export const NOTIFICATION_HELP: Record<string, string> = {
  mention:
    "You were mentioned. Open the discussion to see what input is needed.",
  assigned:
    "You’re now responsible for this signal. Review it and choose the next step.",
  forward:
    "Someone shared this signal for your input. Ownership has not changed.",
  comment: "There’s a new reply on a signal you follow.",
  status_changed: "The status of a signal you follow has changed.",
};

export function needsResponse(kind: string, read: boolean) {
  return !read && (kind === "mention" || kind === "forward");
}
