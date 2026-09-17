import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc, type AuthFn } from "eve/channels/auth";
import { createServerClient } from "@supabase/ssr";

function supabaseSession(): AuthFn<Request> {
  return async (request) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;

    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const eq = c.indexOf("=");
        return { name: c.slice(0, eq), value: c.slice(eq + 1) };
      });

    const supabase = createServerClient(url, key, {
      cookies: { getAll: () => cookies, setAll: () => {} },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const attributes: Record<string, string> = {};
    if (user.email) attributes.email = user.email;

    return {
      authenticator: "supabase",
      principalType: "user",
      principalId: user.id,
      subject: user.id,
      attributes,
    };
  };
}

export default eveChannel({
  auth: [supabaseSession(), vercelOidc(), localDev()],
});