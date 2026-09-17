import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth session via Next.js cookies so it stays
 * in sync with the browser client (see lib/supabase/client.ts) and with
 * middleware.ts, which is responsible for refreshing the session cookie.
 *
 * NOTE: Server Components cannot write cookies to the response, so the
 * `set`/`remove` calls will throw a benign, ignorable error there. This is
 * expected and fine as long as middleware.ts is refreshing the session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable(s).",
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — safe to ignore because
          // middleware.ts refreshes the session on every request.
        }
      },
    },
  });
}
