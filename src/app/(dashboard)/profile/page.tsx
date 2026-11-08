import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/auth/profile-settings";

export const metadata: Metadata = {
  title: "Profile & Account Settings — WanderWay",
  description:
    "Manage your traveler identity, default planning currency, travel pace, security vaults, and offline synchronizations.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProfileSettings
      userEmail={user?.email || "elena.rostova@wanderway.app"}
      userId={user?.id || "demo-traveler"}
    />
  );
}
