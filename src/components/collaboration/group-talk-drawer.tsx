"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import {
  getTripMembers,
  getTripMessages,
  sendTripMessage,
  getTripProposals,
  createActivityProposal,
  voteOnProposal,
  createTripInvite,
} from "@/lib/collaboration/actions";
import type {
  TripMember,
  TripMessage,
  TripActivityProposal,
  ProposalAction,
} from "@/lib/collaboration/types";
import { WebRTCCallRoom } from "./webrtc-call-room";

interface GroupTalkDrawerProps {
  tripId: string;
  tripTitle?: string;
  currentUser?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "chat" | "proposals" | "members" | "call";

export function GroupTalkDrawer({
  tripId,
  tripTitle = "Trip",
  currentUser,
  isOpen,
  onClose,
}: GroupTalkDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [proposals, setProposals] = useState<TripActivityProposal[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // New proposal form state
  const [isProposing, setIsProposing] = useState(false);
  const [propTitle, setPropTitle] = useState("");
  const [propAction, setPropAction] = useState<ProposalAction>("add");
  const [propReason, setPropReason] = useState("");
  const [propCost, setPropCost] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const userName = currentUser?.name || "You";
  const userAvatar = currentUser?.avatarUrl;
  const userId = currentUser?.id || "demo-user";

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [msgs, props, mems] = await Promise.all([
          getTripMessages(tripId),
          getTripProposals(tripId),
          getTripMembers(tripId),
        ]);
        if (isMounted) {
          setMessages(msgs);
          setProposals(props);
          setMembers(mems);
        }
      } catch (e) {
        console.warn("Failed loading group talk data:", e);
      }
    }

    if (isOpen) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [tripId, isOpen]);

  // Supabase Realtime subscription for live messages & proposals
  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`group_talk:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as TripMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                trip_id: newMsg.trip_id,
                sender_id: newMsg.sender_id,
                content: newMsg.content,
                message_type: newMsg.message_type,
                metadata: newMsg.metadata,
                created_at: newMsg.created_at,
                sender_name: "Co-Traveler",
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_activity_proposals",
          filter: `trip_id=eq.${tripId}`,
        },
        async () => {
          const updated = await getTripProposals(tripId);
          setProposals(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isOpen]);

  // Scroll to bottom on message change
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const msg = await sendTripMessage(tripId, text, "text");
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      console.warn("Failed sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Submit proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propTitle.trim()) return;

    try {
      const costNumber = propCost ? Math.round(parseFloat(propCost) * 100) : 0;
      const newProp = await createActivityProposal(tripId, null, propAction, {
        title: propTitle.trim(),
        reason: propReason.trim() || undefined,
        estimated_cost_minor: costNumber,
      });

      setProposals((prev) => [newProp, ...prev]);
      setIsProposing(false);
      setPropTitle("");
      setPropReason("");
      setPropCost("");
    } catch (err) {
      console.warn("Error creating proposal:", err);
    }
  };

  // Vote on proposal
  const handleVote = async (proposalId: string, type: "up" | "down") => {
    try {
      const res = await voteOnProposal(proposalId, type, userId);
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id === proposalId) {
            return {
              ...p,
              upvotes: res.upvotes,
              downvotes: res.downvotes,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.warn("Vote failed:", err);
    }
  };

  // Generate Invite
  const handleGenerateInvite = async () => {
    try {
      const res = await createTripInvite(tripId, "editor");
      setInviteLink(res.shareUrl);
    } catch (err) {
      console.warn("Invite failed:", err);
    }
  };

  const copyInviteToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full max-w-md h-full bg-surface-container-lowest text-on-surface shadow-2xl flex flex-col border-l border-outline-variant/30"
          >
            {/* Top Header */}
        <div className="p-4 border-b border-outline-variant/20 bg-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-lg">forum</span>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-on-surface">Group Talk & Hub</h2>
              <p className="text-xs text-on-surface-variant truncate max-w-[200px]">{tripTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {members.length} {members.length === 1 ? "Traveler" : "Travelers"}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Strip */}
        <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant/20 flex gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "chat"
                ? "bg-white text-primary shadow-sm border border-outline-variant/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            Chat
          </button>
          <button
            onClick={() => setActiveTab("proposals")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === "proposals"
                ? "bg-white text-primary shadow-sm border border-outline-variant/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
            Proposals
            {proposals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center font-bold">
                {proposals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "members"
                ? "bg-white text-primary shadow-sm border border-outline-variant/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            Friends
          </button>
          <button
            onClick={() => setActiveTab("call")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "call"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            Live Call
          </button>
        </div>

        {/* Tab 1: Live Chat */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 text-primary/40">forum</span>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-xs">
                    Start a conversation with your co-travelers about flight times, hotel preferences, or packing items!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === userId;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {isMe ? "You" : m.sender_name || "Traveler"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] leading-relaxed ${
                          m.message_type === "proposal"
                            ? "bg-amber-50 border border-amber-200 text-amber-950 font-medium"
                            : isMe
                            ? "bg-primary text-white rounded-tr-xs shadow-sm"
                            : "bg-surface-container-high text-on-surface rounded-tl-xs shadow-xs border border-outline-variant/30"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-outline-variant/15 bg-surface-container-lowest scrollbar-none">
              {["Check rail passes", "Rain forecasted, pack umbrellas", "Meet at lobby at 8 AM"].map(
                (quick) => (
                  <button
                    key={quick}
                    onClick={() => {
                      setInputText(quick);
                    }}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    {quick}
                  </button>
                )
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message your co-travelers..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-9 h-9 rounded-xl bg-primary disabled:opacity-40 text-white flex items-center justify-center hover:bg-primary-container transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Activity Proposals & Voting */}
        {activeTab === "proposals" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Collaborative Itinerary Changes
                </h3>
                <p className="text-[11px] text-on-surface-variant/70">
                  Friends propose changes; group votes decide!
                </p>
              </div>
              <button
                onClick={() => setIsProposing(!isProposing)}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1 shadow-sm hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Propose
              </button>
            </div>

            {/* Proposal Form modal / inline */}
            {isProposing && (
              <form
                onSubmit={handleCreateProposal}
                className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/40 mb-3 space-y-2.5 animate-in fade-in"
              >
                <div className="text-xs font-bold text-on-surface">Propose Activity Change</div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-on-surface-variant block mb-1">
                    Activity Title
                  </label>
                  <input
                    type="text"
                    required
                    value={propTitle}
                    onChange={(e) => setPropTitle(e.target.value)}
                    placeholder="e.g. Tenryu-ji Sogenchi Garden Tea"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-on-surface-variant block mb-1">
                      Action
                    </label>
                    <select
                      value={propAction}
                      onChange={(e) => setPropAction(e.target.value as ProposalAction)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-outline-variant/30 text-on-surface focus:outline-none"
                    >
                      <option value="add">Add New Activity</option>
                      <option value="remove">Remove Activity</option>
                      <option value="modify">Modify Time/Stop</option>
                      <option value="reorder">Reorder Stops</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-on-surface-variant block mb-1">
                      Est. Cost ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={propCost}
                      onChange={(e) => setPropCost(e.target.value)}
                      placeholder="e.g. 15.00"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-outline-variant/30 focus:outline-none text-on-surface"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-on-surface-variant block mb-1">
                    Reason / Pitch
                  </label>
                  <textarea
                    rows={2}
                    value={propReason}
                    onChange={(e) => setPropReason(e.target.value)}
                    placeholder="Why should the group add this stop?"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-outline-variant/30 focus:outline-none text-on-surface"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsProposing(false)}
                    className="px-3 py-1 text-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded-lg bg-primary text-white font-semibold hover:bg-primary-container transition-colors"
                  >
                    Submit Proposal
                  </button>
                </div>
              </form>
            )}

            {/* List of Proposals */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl mb-1 text-primary/40">ballot</span>
                  <p className="text-xs font-medium">No active proposals</p>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1">
                    Click &quot;Propose&quot; above to suggest a new stop or schedule change!
                  </p>
                </div>
              ) : (
                proposals.map((p) => {
                  const hasUpvoted = p.upvotes.includes(userId);
                  const hasDownvoted = p.downvotes.includes(userId);
                  const netVotes = p.upvotes.length - p.downvotes.length;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                p.proposed_action === "add"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.proposed_action === "remove"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {p.proposed_action}
                            </span>
                            <span className="text-[11px] font-medium text-on-surface-variant">
                              by {p.proposer_name || "Traveler"}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-on-surface">
                            {p.proposal_data.title}
                          </h4>
                          {p.proposal_data.reason && (
                            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed italic">
                              &ldquo;{p.proposal_data.reason}&rdquo;
                            </p>
                          )}
                          {p.proposal_data.estimated_cost_minor ? (
                            <div className="text-[10px] font-mono text-primary font-semibold mt-1.5">
                              Est: ${(p.proposal_data.estimated_cost_minor / 100).toFixed(2)}
                            </div>
                          ) : null}
                        </div>

                        {/* Voting Buttons */}
                        <div className="flex flex-col items-center gap-1 bg-surface-container px-2 py-1.5 rounded-xl border border-outline-variant/30">
                          <button
                            onClick={() => handleVote(p.id, "up")}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              hasUpvoted
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title="Vote for this proposal"
                          >
                            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                          </button>
                          <span className="text-xs font-bold font-mono text-on-surface">
                            {netVotes > 0 ? `+${netVotes}` : netVotes}
                          </span>
                          <button
                            onClick={() => handleVote(p.id, "down")}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              hasDownvoted
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-on-surface-variant hover:text-rose-600 hover:bg-rose-50"
                            }`}
                            title="Vote against this proposal"
                          >
                            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                          </button>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                        <span className="text-on-surface-variant">
                          {p.upvotes.length} approved • {p.downvotes.length} objected
                        </span>
                        {p.upvotes.length >= 2 ? (
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Consensus Reached
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/70">Needs 2 votes to pass</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Friends & Member Invites */}
        {activeTab === "members" && (
          <div className="flex-1 flex flex-col h-full overflow-y-auto bg-surface p-4 space-y-4">
            {/* Shareable Invite Card */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">share_location</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Invite Friends to Trip</h4>
                  <p className="text-[11px] text-on-surface-variant">
                    Collaborate on itineraries, pack together, and group talk!
                  </p>
                </div>
              </div>

              {!inviteLink ? (
                <button
                  onClick={handleGenerateInvite}
                  className="w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Generate 7-Day Invite Link
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-outline-variant/40">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 text-[11px] font-mono text-on-surface bg-transparent focus:outline-none truncate"
                    />
                    <button
                      onClick={copyInviteToClipboard}
                      className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isCopied ? "check" : "content_copy"}
                      </span>
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/70 italic text-center">
                    Link expires in 7 days. Anyone with this link can view & propose changes.
                  </p>
                </div>
              )}
            </div>

            {/* Active Members Roster */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2.5">
                Current Travelers ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {m.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.profile.avatar_url}
                          alt={m.profile.display_name || "Member"}
                          className="w-9 h-9 rounded-full object-cover border border-outline-variant/30"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                          {(m.profile?.display_name || "T").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-on-surface">
                          {m.profile?.display_name || "Co-Traveler"}
                        </div>
                        <div className="text-[10px] text-on-surface-variant">
                          {m.profile?.email || "WanderWay Explorer"}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        m.role === "owner"
                          ? "bg-primary-fixed text-on-primary-fixed"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Live WebRTC Video/Audio Call Room */}
        {activeTab === "call" && (
          <div className="flex-1 h-full overflow-hidden p-2 bg-[#0a0f1d]">
            <WebRTCCallRoom
              tripId={tripId}
              userName={userName}
              userAvatar={userAvatar}
              onClose={() => setActiveTab("chat")}
            />
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
