import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — WanderWay",
  description: "Sign in to your WanderWay account to plan and manage your trips.",
};

/**
 * Login page (Server Component).
 *
 * Implements the Google Stitch Material 3 Travel Companion Login screen.
 * Displays Alpine vista panorama, Google OAuth 2.0 button, and passwordless email OTP.
 */
export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string; preview?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <LoginForm
      currentUserEmail={user?.email || null}
      nextPath={searchParams.next || "/"}
    />
  );
}
