import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";
import { getOpenRouterModel } from "../lib/ai-config";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default defineAgent({
  model: openrouter(getOpenRouterModel()),
  modelContextWindowTokens: 131072,
});