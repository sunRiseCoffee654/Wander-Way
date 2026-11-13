export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface TripMemberProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: TripMemberProfile;
}

export interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invite_code: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invited_email?: string | null;
  personal_message?: string | null;
  expires_at: string;
  created_at: string;
  inviter_name?: string | null;
  trip_title?: string | null;
  destination?: string | null;
}

export type MessageType = 'text' | 'system' | 'proposal' | 'call_event' | 'image';

export interface TripMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata?: Record<string, unknown>;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export type ProposalAction = 'add' | 'remove' | 'modify' | 'reorder';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'applied';

export interface ProposalActivityData {
  title: string;
  description?: string;
  estimated_cost_minor?: number;
  currency?: string;
  duration_minutes?: number;
  time_of_day?: string;
  location_name?: string;
  reason?: string;
  activity_order?: number;
}

export interface TripActivityProposal {
  id: string;
  trip_id: string;
  proposer_id: string;
  day_id?: string | null;
  proposed_action: ProposalAction;
  target_activity_id?: string | null;
  proposal_data: ProposalActivityData;
  status: ProposalStatus;
  upvotes: string[];
  downvotes: string[];
  created_at: string;
  updated_at?: string;
  proposer_name?: string;
}

export interface WebRTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'mute-state';
  senderId: string;
  senderName: string;
  targetId?: string; // target peer id or broadcast
  payload?: unknown;
}
