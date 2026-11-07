/** Shared server-side model selection for every OpenRouter-powered feature. */
export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "z-ai/glm-5.3-flash";
}
