import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Reads the caller's session from cookies and throws if unauthenticated.
 * Returns an RLS-scoped Supabase client plus the user id — the Next.js
 * equivalent of the old requireSupabaseAuth bearer-token middleware, just
 * backed by the cookie session instead of a manually attached header.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: no active session");
  }

  return { supabase, userId: user.id };
}
