import { safeRedirect } from "@/lib/utils/safe-redirect";

/**
 * Dashboard home — redirects to the trips list.
 */
export default async function DashboardPage() {
  safeRedirect("/trips");
}
