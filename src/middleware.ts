import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js middleware for WanderWay auth.
 *
 * - Refreshes the session on every request so cookies stay valid.
 * - Allows unauthenticated users to explore the Google Stitch showcase in Demo Mode.
 * - Protects `/trips/new` so that real generation and DB persistence require authentication.
 * - Sends authenticated users away from `/login` toward `/trips`.
 */
export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect trip creation wizard — requires authenticated account to generate & persist trips
  const isTripCreationRoute = pathname === "/trips/new";

  if (!user && isTripCreationRoute) {
    const url = new URL("/login", request.url);
    const fullTarget = request.nextUrl.pathname + request.nextUrl.search;
    url.searchParams.set("next", fullTarget);
    return NextResponse.redirect(url);
  }

  // Redirect canonical /auth/login and /auth/sign-up entry points to /login
  if (pathname === "/auth/login" || pathname === "/auth/sign-up" || pathname === "/auth/signup") {
    const url = new URL("/login", request.url);
    const nextParam = request.nextUrl.searchParams.get("next");
    if (nextParam) url.searchParams.set("next", nextParam);
    return NextResponse.redirect(url);
  }

  // Keep /login accessible so users can view the Google Stitch login UI or switch accounts
  const isPostAuthCallback = pathname.startsWith("/verify") || pathname.startsWith("/callback");
  if (user && isPostAuthCallback) {
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/trips/:path*", "/login", "/verify", "/auth/:path*", "/callback"],
};
