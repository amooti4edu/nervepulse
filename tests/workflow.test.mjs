import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Compile this pure TypeScript module in memory; no application or credentials needed.
const source = await readFile(
  new URL("../lib/workflow.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const {
  nextStatuses,
  statusAction,
  isInformational,
  TYPE_HELP,
  PRIORITY_HELP,
  needsResponse,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("informational signals archive without forcing a task workflow", () => {
  for (const type of ["update", "announcement", "decision", "event"]) {
    assert.equal(isInformational(type), true);
    for (const status of ["open", "acknowledged", "in_progress", "resolved"])
      assert.deepEqual(nextStatuses(type, status), ["closed"]);
    assert.equal(statusAction(type, "closed"), "Archive");
    assert.deepEqual(nextStatuses(type, "closed"), ["open"]);
  }
});
test("actionable signals acknowledge, work, resolve, close, and reopen", () => {
  for (const type of ["issue", "task", "request", "question"]) {
    assert.equal(isInformational(type), false);
    assert.deepEqual(nextStatuses(type, "open"), ["acknowledged"]);
    assert.deepEqual(nextStatuses(type, "acknowledged"), [
      "in_progress",
      "resolved",
    ]);
    assert.deepEqual(nextStatuses(type, "in_progress"), ["resolved"]);
    assert.deepEqual(nextStatuses(type, "resolved"), ["closed", "open"]);
    assert.deepEqual(nextStatuses(type, "closed"), ["open"]);
  }
  assert.equal(statusAction("question", "resolved"), "Mark answered");
});
test("every capture choice has onboarding help", () => {
  assert.equal(Object.keys(TYPE_HELP).length, 8);
  assert.equal(Object.keys(PRIORITY_HELP).length, 4);
  assert.ok(Object.values(TYPE_HELP).every((help) => help.length > 25));
  assert.ok(Object.values(PRIORITY_HELP).every((help) => help.length > 20));
});
test("needs-response semantics are explicit unread mentions or forwards, not assignments", () => {
  assert.equal(needsResponse("mention", false), true);
  assert.equal(needsResponse("forward", false), true);
  for (const kind of [
    "mention",
    "forward",
    "comment",
    "assigned",
    "status_changed",
  ])
    assert.equal(needsResponse(kind, true), false);
  for (const kind of ["comment", "assigned", "status_changed"])
    assert.equal(needsResponse(kind, false), false);
});
