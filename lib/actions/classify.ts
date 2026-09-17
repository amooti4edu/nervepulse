"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";

/** Swap the model here — one line. */
const MODEL = "anthropic/claude-sonnet-4.6";

const Input = z.object({
  text: z.string().min(1).max(8000),
  organizationId: z.string().uuid(),
});

const Classification = z.object({
  type: z.enum([
    "issue",
    "update",
    "request",
    "task",
    "announcement",
    "decision",
    "question",
    "event",
  ]),
  title: z.string().min(1),
  body: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  space_id: z.string().uuid().nullable(),
});

export async function classifySignal(input: z.infer<typeof Input>) {
  const data = Input.parse(input);
  const { supabase } = await requireUser();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const { data: spaces, error } = await supabase
    .from("spaces")
    .select("id, name, kind")
    .eq("organization_id", data.organizationId);
  if (error) throw new Error(error.message);

  const systemPrompt = [
    "You classify raw organizational messages into a single structured signal.",
    "Return ONLY a JSON object, no prose, no markdown fences, with exactly these keys:",
    '{"type":"issue|update|request|task|announcement|decision|question|event","title":"string","body":"string","priority":"low|medium|high|critical","space_id":"uuid or null"}',
    "Be decisive. Never include a confidence score or any extra key.",
    "space_id MUST be one of the following real space ids, or null if none clearly matches:",
    JSON.stringify(spaces ?? []),
  ].join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Classification failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let raw: Record<string, string | number | boolean | null>;
  try {
    raw = JSON.parse(cleaned) as Record<string, string | number | boolean | null>;
  } catch {
    throw new Error("The model did not return valid JSON");
  }

  const parsed = Classification.parse(raw);
  const validSpace = (spaces ?? []).some((s) => s.id === parsed.space_id);
  return {
    raw,
    parsed: { ...parsed, space_id: validSpace ? parsed.space_id : null },
  };
}
