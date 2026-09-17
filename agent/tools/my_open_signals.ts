import { defineTool } from "eve/tools";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client, built inline rather than imported from
 * lib/supabase/admin.ts. That file has `import "server-only"`, which is a
 * Next.js-only guard and fails to load inside eve's own runtime (`eve dev`
 * / the deployed eve service). This tool runs there, not inside Next.js.
 */
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variable(s).",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  description:
    "Look up the signed-in Nerve-Pulse user's own open signals — things they raised or own that aren't resolved or closed yet. Use this when the person asks what's on their plate, what's open, or what they still need to act on.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .default(10)
      .describe("Maximum number of signals to return."),
  }),
  async execute({ limit }, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      return { error: "No signed-in Nerve-Pulse user for this session." };
    }

    const { data, error } = await supabaseAdmin()
      .from("signals")
      .select("id, title, type, status, priority, created_at")
      .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
      .not("status", "in", "(resolved,closed)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { error: error.message };
    }

    return { signals: data ?? [] };
  },
});