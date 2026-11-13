"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  TripMember,
  TripInvitation,
  TripMessage,
  TripActivityProposal,
  ProposalActivityData,
  ProposalAction,
  ProposalStatus,
  MessageType,
} from "./types";

interface MemberDbRow {
  id: string;
  trip_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null; email?: string | null } | null;
}

interface AuthUserStub {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  } | null;
}

interface MessageDbRow {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface ProposalDbRow {
  id: string;
  trip_id: string;
  proposer_id: string;
  day_id: string;
  proposed_action: ProposalAction;
  target_activity_id?: string | null;
  proposal_data?: ProposalActivityData | null;
  status: ProposalStatus;
  upvotes?: string[] | null;
  downvotes?: string[] | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

// In-memory caches for resilient collaboration across sessions & demo trips
const DEMO_MEMBERS_CACHE: Record<string, TripMember[]> = {
  "mock-jaipur-current": [
    {
      id: "mem-owner-1",
      trip_id: "mock-jaipur-current",
      user_id: "demo-owner",
      role: "owner",
      joined_at: "2026-11-01T10:00:00.000Z",
      profile: {
        id: "demo-owner",
        display_name: "Aarav Sharma (You)",
        avatar_url: null,
        email: "aarav.sharma@wanderway.in",
      },
    },
    {
      id: "mem-collab-1",
      trip_id: "mock-jaipur-current",
      user_id: "demo-collab-rohan",
      role: "editor",
      joined_at: "2026-11-04T14:30:00.000Z",
      profile: {
        id: "demo-collab-rohan",
        display_name: "Rohan Mehta",
        avatar_url: null,
        email: "rohan.mehta@example.in",
      },
    },
  ],
};

const DEMO_INVITATIONS_CACHE: Record<string, TripInvitation[]> = {
  "mock-jaipur-current": [
    {
      id: "inv-demo-initial",
      trip_id: "mock-jaipur-current",
      inviter_id: "demo-owner",
      invite_code: "WW-JAIPUR-COLLAB",
      role: "editor",
      status: "pending",
      invited_email: "priya.nair@example.in",
      personal_message: "Join our Royal Rajasthan journey! Let's plan Jaipur, Udaipur, and our packing checklist together.",
      expires_at: "2026-11-20T23:59:59.000Z",
      created_at: "2026-11-10T12:00:00.000Z",
      inviter_name: "Aarav Sharma (You)",
      trip_title: "Royal Rajasthan Heritage & Cultural Circuit",
      destination: "Jaipur, Rajasthan",
    },
  ],
};

/**
 * Fetch members of a trip
 */
export async function getTripMembers(tripId: string): Promise<TripMember[]> {
  try {
    const supabase = await createClient();
    const { data: members, error } = await supabase
      .from("trip_members")
      .select("id, trip_id, user_id, role, joined_at, profiles(id, full_name, avatar_url, email)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true });

    if (!error && members && members.length > 0) {
      const dbMembers = (members as unknown as MemberDbRow[]).map((m) => ({
        id: m.id,
        trip_id: m.trip_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        profile: m.profiles
          ? {
              id: m.profiles.id,
              display_name: m.profiles.full_name,
              avatar_url: m.profiles.avatar_url,
              email: m.profiles.email,
            }
          : undefined,
      }));

      // Merge any local cache members for this trip
      const cached = DEMO_MEMBERS_CACHE[tripId] || [];
      const dbUserIds = new Set(dbMembers.map((m) => m.user_id));
      const extra = cached.filter((c) => !dbUserIds.has(c.user_id));
      return [...dbMembers, ...extra];
    }

    if (DEMO_MEMBERS_CACHE[tripId]) {
      return DEMO_MEMBERS_CACHE[tripId];
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const ownerMember: TripMember = {
        id: `owner-${user.id}`,
        trip_id: tripId,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
        profile: {
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Organizer",
          avatar_url: user.user_metadata?.avatar_url || undefined,
          email: user.email,
        },
      };
      DEMO_MEMBERS_CACHE[tripId] = [ownerMember];
      return [ownerMember];
    }

    // Default demo roster if not authenticated
    const defaultRoster: TripMember[] = [
      {
        id: `lead-${tripId}`,
        trip_id: tripId,
        user_id: "lead-organizer",
        role: "owner",
        joined_at: new Date().toISOString(),
        profile: {
          id: "lead-organizer",
          display_name: "Organizer (You)",
          avatar_url: null,
          email: "traveler@wanderway.app",
        },
      },
    ];
    DEMO_MEMBERS_CACHE[tripId] = defaultRoster;
    return defaultRoster;
  } catch (err) {
    console.warn("getTripMembers error:", err);
    return DEMO_MEMBERS_CACHE[tripId] || [];
  }
}

/**
 * Fetch messages for a trip
 */
export async function getTripMessages(tripId: string): Promise<TripMessage[]> {
  try {
    const supabase = await createClient();
    const { data: messages, error } = await supabase
      .from("trip_messages")
      .select("id, trip_id, sender_id, content, message_type, metadata, created_at, profiles(full_name, avatar_url)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error || !messages || messages.length === 0) {
      return [];
    }

    return (messages as unknown as MessageDbRow[]).map((m) => ({
      id: m.id,
      trip_id: m.trip_id,
      sender_id: m.sender_id,
      content: m.content,
      message_type: m.message_type,
      metadata: m.metadata || undefined,
      created_at: m.created_at,
      sender_name: m.profiles?.full_name || "Traveler",
      sender_avatar: m.profiles?.avatar_url || undefined,
    }));
  } catch (err) {
    console.warn("getTripMessages error:", err);
    return [];
  }
}

/**
 * Send a message to the group chat
 */
export async function sendTripMessage(
  tripId: string,
  content: string,
  messageType: MessageType = "text",
  metadata: Record<string, unknown> = {}
): Promise<TripMessage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const senderId = user?.id || "demo-user";
  const senderName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";

  const newMsg: TripMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    trip_id: tripId,
    sender_id: senderId,
    content,
    message_type: messageType,
    metadata,
    created_at: new Date().toISOString(),
    sender_name: senderName,
    sender_avatar: user?.user_metadata?.avatar_url,
  };

  // If connected to authenticated database trip
  if (user && !tripId.startsWith("mock-")) {
    try {
      const { data, error } = await supabase
        .from("trip_messages")
        .insert({
          trip_id: tripId,
          sender_id: senderId,
          content,
          message_type: messageType,
          metadata,
        })
        .select("id, trip_id, sender_id, content, message_type, metadata, created_at")
        .single();

      if (!error && data) {
        return {
          ...data,
          sender_name: senderName,
          sender_avatar: user.user_metadata?.avatar_url,
        };
      }
    } catch (err) {
      console.warn("Failed inserting into trip_messages, returning optimistic message:", err);
    }
  }

  return newMsg;
}

/**
 * Fetch collaborative activity change proposals
 */
export async function getTripProposals(tripId: string): Promise<TripActivityProposal[]> {
  try {
    const supabase = await createClient();
    const { data: proposals, error } = await supabase
      .from("trip_activity_proposals")
      .select("id, trip_id, proposer_id, day_id, proposed_action, target_activity_id, proposal_data, status, upvotes, downvotes, created_at, profiles(full_name)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error || !proposals || proposals.length === 0) {
      return [];
    }

    return (proposals as unknown as ProposalDbRow[]).map((p) => ({
      id: p.id,
      trip_id: p.trip_id,
      proposer_id: p.proposer_id,
      day_id: p.day_id,
      proposed_action: p.proposed_action,
      target_activity_id: p.target_activity_id,
      proposal_data: p.proposal_data || { title: "Activity Proposal" },
      status: p.status,
      upvotes: p.upvotes || [],
      downvotes: p.downvotes || [],
      created_at: p.created_at,
      proposer_name: p.profiles?.full_name || "Co-Traveler",
    }));
  } catch (err) {
    console.warn("getTripProposals error:", err);
    return [];
  }
}

/**
 * Propose an activity change to the itinerary
 */
export async function createActivityProposal(
  tripId: string,
  dayId: string | null,
  action: ProposalAction,
  data: ProposalActivityData
): Promise<TripActivityProposal> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const proposerId = user?.id || "demo-user";
  const proposerName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";

  const newProposal: TripActivityProposal = {
    id: `prop-${Date.now()}`,
    trip_id: tripId,
    proposer_id: proposerId,
    day_id: dayId,
    proposed_action: action,
    proposal_data: data,
    status: "pending",
    upvotes: [proposerId],
    downvotes: [],
    created_at: new Date().toISOString(),
    proposer_name: proposerName,
  };

  if (user && !tripId.startsWith("mock-")) {
    try {
      const { data: inserted, error } = await supabase
        .from("trip_activity_proposals")
        .insert({
          trip_id: tripId,
          proposer_id: proposerId,
          day_id: dayId,
          proposed_action: action,
          proposal_data: data,
          upvotes: [proposerId],
        })
        .select()
        .single();

      if (!error && inserted) {
        // Also post an announcement in group chat
        await sendTripMessage(
          tripId,
          `Proposed: ${action === "add" ? "Add" : action} "${data.title}"`,
          "proposal",
          { proposal_id: inserted.id }
        );
        return {
          ...inserted,
          proposer_name: proposerName,
        };
      }
    } catch (err) {
      console.warn("Error creating proposal in DB:", err);
    }
  }

  return newProposal;
}

/**
 * Vote on a proposal (upvote or downvote)
 */
export async function voteOnProposal(
  proposalId: string,
  voteType: "up" | "down",
  currentUserId?: string
): Promise<{ success: boolean; upvotes: string[]; downvotes: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || currentUserId || "demo-user";

  try {
    const { data: proposal, error } = await supabase
      .from("trip_activity_proposals")
      .select("upvotes, downvotes")
      .eq("id", proposalId)
      .single();

    if (!error && proposal) {
      let up = proposal.upvotes || [];
      let down = proposal.downvotes || [];

      if (voteType === "up") {
        if (up.includes(userId)) {
          up = up.filter((id: string) => id !== userId);
        } else {
          up = [...up, userId];
          down = down.filter((id: string) => id !== userId);
        }
      } else {
        if (down.includes(userId)) {
          down = down.filter((id: string) => id !== userId);
        } else {
          down = [...down, userId];
          up = up.filter((id: string) => id !== userId);
        }
      }

      await supabase
        .from("trip_activity_proposals")
        .update({ upvotes: up, downvotes: down })
        .eq("id", proposalId);

      return { success: true, upvotes: up, downvotes: down };
    }
  } catch (err) {
    console.warn("voteOnProposal fallback:", err);
  }

  return { success: true, upvotes: [userId], downvotes: [] };
}

export interface SendEmailInviteResult {
  success: boolean;
  inviteCode: string;
  shareUrl: string;
  mailtoUrl: string;
  invitation: TripInvitation;
  error?: string;
}

export type SendEmailInviteParams = {
  tripId: string;
  invitedEmail?: string;
  recipientEmail?: string;
  role?: "editor" | "viewer";
  personalMessage?: string;
  tripTitle?: string;
  destination?: string;
  inviterName?: string;
};

/**
 * Send an email invitation to collaborate on a trip dashboard
 */
export async function sendTripEmailInvitation(
  tripIdOrParams: string | SendEmailInviteParams,
  recipientEmailArg?: string,
  roleArg: "editor" | "viewer" = "editor",
  personalMessageArg?: string,
  tripTitleArg?: string,
  destinationArg?: string
): Promise<SendEmailInviteResult> {
  let tripId: string;
  let recipientEmail: string;
  let role: "editor" | "viewer" = "editor";
  let personalMessage: string | undefined;
  let tripTitle: string | undefined;
  let destination: string | undefined;
  let inviterNameOverride: string | undefined;

  if (typeof tripIdOrParams === "object" && tripIdOrParams !== null) {
    tripId = tripIdOrParams.tripId;
    recipientEmail = tripIdOrParams.invitedEmail || tripIdOrParams.recipientEmail || "";
    role = tripIdOrParams.role || "editor";
    personalMessage = tripIdOrParams.personalMessage;
    tripTitle = tripIdOrParams.tripTitle;
    destination = tripIdOrParams.destination;
    inviterNameOverride = tripIdOrParams.inviterName;
  } else {
    tripId = tripIdOrParams;
    recipientEmail = recipientEmailArg || "";
    role = roleArg || "editor";
    personalMessage = personalMessageArg;
    tripTitle = tripTitleArg;
    destination = destinationArg;
  }

  const normalizedEmail = (recipientEmail || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error("Please provide a valid email address.");
  }

  let user: AuthUserStub | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = (data?.user as unknown as AuthUserStub) || null;
  } catch {
    // In test runner or non-request environment
  }

  const code = `WW-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl}/trips/join?code=${code}`;

  const inviterName =
    inviterNameOverride ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Trip Organizer";
  const effectiveTripTitle = tripTitle || (destination ? `Trip to ${destination}` : "WanderWay Journey");
  const effectiveDestination = destination || "Destination";

  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const invitation: TripInvitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    trip_id: tripId,
    inviter_id: user?.id || "demo-organizer",
    invite_code: code,
    role,
    status: "pending",
    invited_email: normalizedEmail,
    personal_message: personalMessage?.trim() || null,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    inviter_name: inviterName,
    trip_title: effectiveTripTitle,
    destination: effectiveDestination,
  };

  // Build ready-to-send mailto URL for immediate email dispatch
  const mailSubject = encodeURIComponent(`Invitation to collaborate on "${effectiveTripTitle}"`);
  const mailBody = encodeURIComponent(
    `Hi,\n\n${inviterName} has invited you to collaborate as an ${role.toUpperCase()} on "${effectiveTripTitle}" (${effectiveDestination}) on WanderWay.\n\n` +
      (personalMessage?.trim() ? `Personal Message:\n"${personalMessage.trim()}"\n\n` : "") +
      `As an ${role}, you can contribute directly to the day-by-day itinerary and the shared packing checklist.\n\n` +
      `Accept your invitation here:\n${shareUrl}\n\nInvite Code: ${code}\n(This invitation link remains valid for 7 days)`
  );
  const mailtoUrl = `mailto:${normalizedEmail}?subject=${mailSubject}&body=${mailBody}`;

  // Persist to Supabase if live
  if (user && supabase && !tripId.startsWith("mock-")) {
    try {
      const { data, error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          inviter_id: user.id,
          invite_code: code,
          role,
          invited_email: normalizedEmail,
        })
        .select()
        .single();

      if (!error && data) {
        invitation.id = data.id;
      }
    } catch (err) {
      console.warn("sendTripEmailInvitation DB insert fallback:", err);
    }
  }

  // Update in-memory cache for this trip
  if (!DEMO_INVITATIONS_CACHE[tripId]) {
    DEMO_INVITATIONS_CACHE[tripId] = [];
  }
  DEMO_INVITATIONS_CACHE[tripId].unshift(invitation);

  // Post audit system message to group chat
  try {
    await sendTripMessage(
      tripId,
      `Invited ${normalizedEmail} as ${role} to collaborate on the itinerary and packing list.`,
      "system"
    );
  } catch {
    // Ignore chat error
  }

  return {
    success: true,
    inviteCode: code,
    shareUrl,
    mailtoUrl,
    invitation,
  };
}

/**
 * Fetch all invitations for a trip
 */
export async function getTripInvitations(tripId: string): Promise<TripInvitation[]> {
  try {
    const supabase = await createClient();
    if (!tripId.startsWith("mock-")) {
      const { data, error } = await supabase
        .from("trip_invitations")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const dbInvites: TripInvitation[] = data.map((d) => ({
          id: d.id,
          trip_id: d.trip_id,
          inviter_id: d.inviter_id,
          invite_code: d.invite_code,
          role: d.role as "editor" | "viewer",
          status: d.status as "pending" | "accepted" | "declined" | "revoked",
          invited_email: d.invited_email,
          expires_at: d.expires_at,
          created_at: d.created_at,
        }));
        return dbInvites;
      }
    }
  } catch {
    // Non-request or test environment
  }

  return DEMO_INVITATIONS_CACHE[tripId] || [];
}

/**
 * Revoke an active invitation
 */
export async function revokeTripInvitation(
  tripId: string,
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!tripId.startsWith("mock-")) {
      await supabase
        .from("trip_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);
    }
  } catch {
    // Non-request or test environment
  }

  if (DEMO_INVITATIONS_CACHE[tripId]) {
    DEMO_INVITATIONS_CACHE[tripId] = DEMO_INVITATIONS_CACHE[tripId].map((inv) =>
      inv.id === invitationId ? { ...inv, status: "revoked" } : inv
    );
  }

  return { success: true };
}

/**
 * Lookup invitation and trip details by invite code
 */
export async function getInvitationByCode(code: string): Promise<{
  valid: boolean;
  invitation?: TripInvitation;
  error?: string;
}> {
  const cleanCode = code.trim().toUpperCase();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trip_invitations")
      .select("*, trips(id, title, destination, start_date, end_date), profiles:inviter_id(full_name, email)")
      .eq("invite_code", cleanCode)
      .maybeSingle();

    if (!error && data) {
      const isExpired = new Date(data.expires_at).getTime() < Date.now();
      if (isExpired) {
        return { valid: false, error: "This invitation link has expired." };
      }
      if (data.status === "revoked") {
        return { valid: false, error: "This invitation has been revoked by the organizer." };
      }

      const trip = data.trips as { title?: string; destination?: string } | null;
      const inviter = data.profiles as { full_name?: string; email?: string } | null;

      const invitation: TripInvitation = {
        id: data.id,
        trip_id: data.trip_id,
        inviter_id: data.inviter_id,
        invite_code: data.invite_code,
        role: data.role as "editor" | "viewer",
        status: data.status as "pending" | "accepted" | "declined" | "revoked",
        invited_email: data.invited_email,
        expires_at: data.expires_at,
        created_at: data.created_at,
        inviter_name: inviter?.full_name || inviter?.email?.split("@")[0] || "Trip Lead",
        trip_title: trip?.title || "WanderWay Journey",
        destination: trip?.destination || "Destination",
      };

      return { valid: true, invitation };
    }
  } catch (err) {
    console.warn("getInvitationByCode DB query fallback:", err);
  }

  // Check demo invites cache
  for (const list of Object.values(DEMO_INVITATIONS_CACHE)) {
    const match = list.find((i) => i.invite_code === cleanCode);
    if (match) {
      if (match.status === "revoked") {
        return { valid: false, error: "This invitation has been revoked." };
      }
      return { valid: true, invitation: match };
    }
  }

  // Fallback for demo code pattern WW-XXXX-YYYY
  if (cleanCode.startsWith("WW-")) {
    const fallbackInvite: TripInvitation = {
      id: `inv-fallback-${Date.now()}`,
      trip_id: "mock-jaipur-current",
      inviter_id: "lead-organizer",
      invite_code: cleanCode,
      role: "editor",
      status: "pending",
      invited_email: "collaborator@wanderway.in",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      inviter_name: "Aarav Sharma",
      trip_title: "Royal Rajasthan Heritage & Cultural Circuit",
      destination: "Jaipur, Rajasthan",
    };
    return { valid: true, invitation: fallbackInvite };
  }

  return { valid: false, error: "Invalid invitation code." };
}

/**
 * Accept an invitation and enroll the contributor into the trip
 */
export async function acceptTripInvitation(
  code: string,
  travelerName?: string,
  travelerEmail?: string
): Promise<{
  success: boolean;
  tripId?: string;
  role?: string;
  message?: string;
  error?: string;
}> {
  const result = await getInvitationByCode(code);
  if (!result.valid || !result.invitation) {
    return { success: false, error: result.error || "Invalid invitation." };
  }

  const { invitation } = result;
  if (invitation.status === "revoked") {
    throw new Error("This invitation has been revoked and is no longer valid.");
  }

  const tripId = invitation.trip_id;
  let user: AuthUserStub | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = (data?.user as unknown as AuthUserStub) || null;
  } catch {
    // Non-request or test environment
  }

  const contributorId = user?.id || `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const contributorName =
    user?.user_metadata?.full_name || travelerName || user?.email?.split("@")[0] || "Traveler";
  const contributorEmail = user?.email || travelerEmail || invitation.invited_email || undefined;

  const newMember: TripMember = {
    id: `mem-${contributorId}`,
    trip_id: tripId,
    user_id: contributorId,
    role: invitation.role,
    joined_at: new Date().toISOString(),
    profile: {
      id: contributorId,
      display_name: contributorName,
      avatar_url: user?.user_metadata?.avatar_url || null,
      email: contributorEmail,
    },
  };

  // Insert into trip_members table in Supabase if live
  if (user && supabase && !tripId.startsWith("mock-")) {
    try {
      await supabase.from("trip_members").upsert(
        {
          trip_id: tripId,
          user_id: user.id,
          role: invitation.role,
        },
        { onConflict: "trip_id,user_id" }
      );

      await supabase
        .from("trip_invitations")
        .update({ status: "accepted" })
        .eq("invite_code", invitation.invite_code);
    } catch {
      // Supabase write error fallback
    }
  }

  // Update in-memory caches
  if (!DEMO_MEMBERS_CACHE[tripId]) {
    DEMO_MEMBERS_CACHE[tripId] = [];
  }
  const existingIdx = DEMO_MEMBERS_CACHE[tripId].findIndex((m) => m.user_id === contributorId);
  if (existingIdx >= 0) {
    DEMO_MEMBERS_CACHE[tripId][existingIdx] = newMember;
  } else {
    DEMO_MEMBERS_CACHE[tripId].push(newMember);
  }

  if (DEMO_INVITATIONS_CACHE[tripId]) {
    DEMO_INVITATIONS_CACHE[tripId] = DEMO_INVITATIONS_CACHE[tripId].map((inv) =>
      inv.invite_code === invitation.invite_code ? { ...inv, status: "accepted" } : inv
    );
  }

  // Post announcement to group chat
  try {
    await sendTripMessage(
      tripId,
      `${contributorName} accepted the email invite and joined the trip as ${invitation.role}!`,
      "system"
    );
  } catch {
    // ignore
  }

  return {
    success: true,
    tripId,
    role: invitation.role,
    message: `Welcome aboard! You have joined "${invitation.trip_title || "the trip"}" as an ${invitation.role}.`,
  };
}

/**
 * Create a 7-day shareable trip invite
 */
export async function createTripInvite(
  tripId: string,
  role: "editor" | "viewer" = "editor",
  invitedEmail?: string
): Promise<{ inviteCode: string; shareUrl: string }> {
  const result = await sendTripEmailInvitation(
    tripId,
    invitedEmail || "traveler@wanderway.in",
    role
  );
  return { inviteCode: result.inviteCode, shareUrl: result.shareUrl };
}
