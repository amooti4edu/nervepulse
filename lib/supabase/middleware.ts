import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PUBLIC_PATHS = new Set(["/auth"]);

/**
 * Refreshes the Supabase auth cookie on every request (required for
 * server-rendered auth to keep working) and redirects signed-out users
 * away from everything except the public paths above.
 *
 * Mirrors what src/routes/_authenticated/route.tsx's `beforeLoad` did in
 * the TanStack app, but runs as edge middleware instead of a route guard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run any logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.has(pathname) || pathname === "/";

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/auth", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
