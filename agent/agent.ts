import { openrouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";

export default defineAgent({
  model: openrouter("z-ai/glm-5.3-flash"),
  modelContextWindowTokens: 131072,
});