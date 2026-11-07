import { test } from "node:test";
import assert from "node:assert/strict";
import { getOpenRouterModel } from "../lib/ai-config.ts";

test("OpenRouter model selection uses the shared environment setting", (t) => {
  const original = process.env.OPENROUTER_MODEL;
  t.after(() => {
    if (original === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = original;
  });

  delete process.env.OPENROUTER_MODEL;
  assert.equal(getOpenRouterModel(), "z-ai/glm-5.3-flash");

  process.env.OPENROUTER_MODEL = "";
  assert.equal(getOpenRouterModel(), "z-ai/glm-5.3-flash");

  process.env.OPENROUTER_MODEL = "   ";
  assert.equal(getOpenRouterModel(), "z-ai/glm-5.3-flash");

  process.env.OPENROUTER_MODEL = "  provider/custom-model  ";
  assert.equal(getOpenRouterModel(), "provider/custom-model");
});
