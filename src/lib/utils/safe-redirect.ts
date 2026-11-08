import { redirect } from "next/navigation";

/**
 * Next.js 16 with `typedRoutes: true` restricts `redirect()` to known route
 * segments. This helper bypasses the type restriction so we can redirect to
 * any string path (e.g. `/login`, `/trips`, dynamic URLs).
 */
export function safeRedirect(url: string): never {
  return (redirect as (url: string) => never)(url);
}
