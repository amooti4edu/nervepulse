import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Supabase client for use in Client Components.
 * Session is persisted via cookies (not localStorage), so the server
 * (middleware, Server Components, Server Actions) can read the same session.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable(s).",
    );
  }

  return createBrowserClient<Database>(url, key);
}

/**
 * Shared singleton instance for convenience in components that don't need
 * a fresh client per-render. Safe in the browser; do not import this from
 * server-only code.
 */
export const supabase = createClient();
