import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads/writes auth cookies via Next.js `cookies()`.
 *
 * Notes:
 *  - `cookies()` is async in Next.js 15/16; we await it once, then the cookie
 *    callbacks run synchronously inside `createServerClient`.
 *  - `set`/`remove` are wrapped in try/catch because they throw outside of
 *    a mutation context (e.g. during static rendering or read-only requests).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // `set` outside a mutation context is a no-op.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", options);
          } catch {
            // `remove` outside a mutation context is a no-op.
          }
        },
      },
    }
  );
}
