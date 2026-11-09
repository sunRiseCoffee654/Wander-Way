import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * OAuth callback route for Google sign-in.
 *
 * Supabase redirects here after the provider authenticates the user.
 * We exchange the `code` query param for a session, then redirect to /trips.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    console.error("[OAuth callback error]", oauthError, requestUrl.searchParams.get("error_description"));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, requestUrl.origin));
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, "", options);
            } catch {}
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[OAuth exchange error]", error);
      return NextResponse.redirect(new URL("/login?error=auth_exchange_failed", requestUrl.origin));
    }
  }

  let safeNext = "/trips";
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\") && !rawNext.includes("@")) {
    try {
      const parsed = new URL(rawNext, requestUrl.origin);
      if (parsed.origin === requestUrl.origin) {
        safeNext = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {}
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
