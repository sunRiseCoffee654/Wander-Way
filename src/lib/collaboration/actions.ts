"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  TripMember,
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
  profiles?: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

interface MessageDbRow {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata?: Record<string, unknown>;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

interface ProposalDbRow {
  id: string;
  trip_id: string;
  proposer_id: string;
  day_id: string | null;
  proposed_action: ProposalAction;
  target_activity_id: string | null;
  proposal_data: ProposalActivityData;
  status: ProposalStatus;
  upvotes: string[] | null;
  downvotes: string[] | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

// Demo mock members for showcase / offline mode
const DEMO_MEMBERS: Record<string, TripMember[]> = {
  default: [
    {
      id: "mem-1",
      trip_id: "mock-kyoto-autumn-2026",
      user_id: "user-alex",
      role: "owner",
      joined_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      profile: {
        id: "user-alex",
        display_name: "Alex Rivera",
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        email: "alex@wanderway.app",
      },
    },
    {
      id: "mem-2",
      trip_id: "mock-kyoto-autumn-2026",
      user_id: "user-elena",
      role: "editor",
      joined_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      profile: {
        id: "user-elena",
        display_name: "Elena Rostova",
        avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
        email: "elena@travel.org",
      },
    },
    {
      id: "mem-3",
      trip_id: "mock-kyoto-autumn-2026",
      user_id: "user-marcus",
      role: "editor",
      joined_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      profile: {
        id: "user-marcus",
        display_name: "Marcus Vance",
        avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        email: "marcus.v@adventure.net",
      },
    },
  ],
};

const DEMO_MESSAGES: Record<string, TripMessage[]> = {
  default: [
    {
      id: "msg-1",
      trip_id: "mock-kyoto-autumn-2026",
      sender_id: "user-alex",
      content: "Welcome everyone to Kyoto & Tokyo Autumn Odyssey! Let's lock in our key stops and rail bookings.",
      message_type: "text",
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      sender_name: "Alex Rivera",
      sender_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "msg-2",
      trip_id: "mock-kyoto-autumn-2026",
      sender_id: "user-elena",
      content: "I checked the Shinkansen Nozomi reservation times. We should target the 09:15 AM departure from Shinagawa.",
      message_type: "text",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      sender_name: "Elena Rostova",
      sender_avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "msg-3",
      trip_id: "mock-kyoto-autumn-2026",
      sender_id: "user-marcus",
      content: "Also, weather forecast shows a 40% chance of showers on Day 2 in Arashiyama. We should pack compact umbrellas and water-resistant boots!",
      message_type: "text",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      sender_name: "Marcus Vance",
      sender_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    },
  ],
};

const DEMO_PROPOSALS: Record<string, TripActivityProposal[]> = {
  default: [
    {
      id: "prop-1",
      trip_id: "mock-kyoto-autumn-2026",
      proposer_id: "user-elena",
      day_id: "day-2",
      proposed_action: "add",
      proposal_data: {
        title: "Tenryu-ji Sogenchi Garden Morning Tea",
        description: "Arrive right at 8:30 AM before tour buses to enjoy peaceful matcha overlooking the pond reflection.",
        estimated_cost_minor: 120000, // 1,200 JPY
        currency: "JPY",
        duration_minutes: 60,
        time_of_day: "08:30",
        location_name: "Tenryu-ji Temple, Arashiyama",
        reason: "Much quieter than afternoon, UNESCO World Heritage site",
      },
      status: "pending",
      upvotes: ["user-elena", "user-marcus"],
      downvotes: [],
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      proposer_name: "Elena Rostova",
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
      .select("id, trip_id, user_id, role, joined_at, profiles(id, display_name, avatar_url)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true });

    if (error || !members || members.length === 0) {
      return DEMO_MEMBERS[tripId] || DEMO_MEMBERS.default;
    }

    return (members as unknown as MemberDbRow[]).map((m) => ({
      id: m.id,
      trip_id: m.trip_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: m.profiles ? {
        id: m.profiles.id,
        display_name: m.profiles.display_name,
        avatar_url: m.profiles.avatar_url,
      } : undefined,
    }));
  } catch (err) {
    console.warn("getTripMembers fallback to demo:", err);
    return DEMO_MEMBERS[tripId] || DEMO_MEMBERS.default;
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
      .select("id, trip_id, sender_id, content, message_type, metadata, created_at, profiles(display_name, avatar_url)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error || !messages || messages.length === 0) {
      return DEMO_MESSAGES[tripId] || DEMO_MESSAGES.default;
    }

    return (messages as unknown as MessageDbRow[]).map((m) => ({
      id: m.id,
      trip_id: m.trip_id,
      sender_id: m.sender_id,
      content: m.content,
      message_type: m.message_type,
      metadata: m.metadata,
      created_at: m.created_at,
      sender_name: m.profiles?.display_name || "Traveler",
      sender_avatar: m.profiles?.avatar_url || undefined,
    }));
  } catch (err) {
    console.warn("getTripMessages fallback to demo:", err);
    return DEMO_MESSAGES[tripId] || DEMO_MESSAGES.default;
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
      .select("id, trip_id, proposer_id, day_id, proposed_action, target_activity_id, proposal_data, status, upvotes, downvotes, created_at, profiles(display_name)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error || !proposals || proposals.length === 0) {
      return DEMO_PROPOSALS[tripId] || DEMO_PROPOSALS.default;
    }

    return (proposals as unknown as ProposalDbRow[]).map((p) => ({
      id: p.id,
      trip_id: p.trip_id,
      proposer_id: p.proposer_id,
      day_id: p.day_id,
      proposed_action: p.proposed_action,
      target_activity_id: p.target_activity_id,
      proposal_data: p.proposal_data || {},
      status: p.status,
      upvotes: p.upvotes || [],
      downvotes: p.downvotes || [],
      created_at: p.created_at,
      proposer_name: p.profiles?.display_name || "Co-Traveler",
    }));
  } catch (err) {
    console.warn("getTripProposals fallback:", err);
    return DEMO_PROPOSALS[tripId] || DEMO_PROPOSALS.default;
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

/**
 * Create a 7-day shareable trip invite
 */
export async function createTripInvite(
  tripId: string,
  role: "editor" | "viewer" = "editor",
  invitedEmail?: string
): Promise<{ inviteCode: string; shareUrl: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const code = `WW-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl}/trips/join?code=${code}`;

  if (user && !tripId.startsWith("mock-")) {
    try {
      await supabase.from("trip_invitations").insert({
        trip_id: tripId,
        inviter_id: user.id,
        invite_code: code,
        role,
        invited_email: invitedEmail || null,
      });
    } catch (err) {
      console.warn("createTripInvite DB insert error:", err);
    }
  }

  return { inviteCode: code, shareUrl };
}
