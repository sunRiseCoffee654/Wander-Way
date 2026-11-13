"use client";

import React, { useState, useEffect, useId } from "react";
import {
  sendTripEmailInvitation,
  getTripInvitations,
  getTripMembers,
  revokeTripInvitation,
  type SendEmailInviteResult,
} from "@/lib/collaboration/actions";
import type { TripInvitation, TripMember } from "@/lib/collaboration/types";

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle?: string;
  destination?: string;
  defaultEmail?: string;
}

export function ShareTripModal({
  isOpen,
  onClose,
  tripId,
  tripTitle = "WanderWay Journey",
  destination = "Jaipur, Rajasthan",
  defaultEmail = "",
}: ShareTripModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendEmailInviteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Members and invitations roster
  const [members, setMembers] = useState<TripMember[]>([]);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(() => isOpen);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const titleId = useId();

  // Load members and invitations when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    Promise.all([getTripMembers(tripId), getTripInvitations(tripId)])
      .then(([mems, invites]) => {
        if (!isMounted) return;
        setMembers(mems);
        setInvitations(invites);
        setIsLoadingRoster(false);
      })
      .catch((err) => {
        console.warn("Failed to load roster in share modal:", err);
        if (isMounted) setIsLoadingRoster(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const currentShareUrl =
    sendResult?.shareUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/trips/join?code=WW-JAIPUR-COLLAB`
      : "https://wanderway.in/trips/join?code=WW-JAIPUR-COLLAB");

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await sendTripEmailInvitation(
        tripId,
        email.trim(),
        role,
        personalMessage,
        tripTitle,
        destination
      );

      setSendResult(res);
      setInvitations((prev) => [res.invitation, ...prev]);
      setEmail("");
      setPersonalMessage("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to dispatch invitation.";
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentShareUrl);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2500);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      await revokeTripInvitation(tripId, inviteId);
      setInvitations((prev) =>
        prev.map((i) => (i.id === inviteId ? { ...i, status: "revoked" } : i))
      );
    } catch (err) {
      console.warn("Revoke error:", err);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] bg-surface-container-lowest border border-surface-container-high/60 rounded-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-surface-container-high/40 flex items-center justify-between gap-4 bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">person_add</span>
            </div>
            <div>
              <h2 id={titleId} className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                Share Trip &amp; Invite Collaborators
              </h2>
              <p className="text-xs text-on-surface-variant">
                Invite friends or travel companions to co-edit the itinerary &amp; packing list.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Context Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-fixed/20 via-surface-container-low to-surface-container border border-surface-container-high/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">flight_takeoff</span>
              <div>
                <span className="font-bold text-on-surface block">{tripTitle}</span>
                <span className="text-on-surface-variant text-[11px]">{destination}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-on-primary">
              Multi-Traveler Ready
            </span>
          </div>

          {/* Success Banner if invite just sent */}
          {sendResult && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 text-xs space-y-2 animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                <span className="font-bold text-sm">Invitation created successfully!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
                An invitation code (<strong>{sendResult.inviteCode}</strong>) was generated. You can dispatch
                directly via your email client or copy the invite link below.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={sendResult.mailtoUrl}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Open in Mail Client</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-semibold text-xs border border-surface-container-highest hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isLinkCopied ? "check" : "content_copy"}
                  </span>
                  <span>{isLinkCopied ? "Link Copied!" : "Copy Invite Link"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email Invite Form */}
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Traveler Email Address
              </label>
              <div className="relative">
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. friend@example.in or rohan.mehta@example.in"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-sm placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>

            {/* Role Permissions Selection */}
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Collaboration Permission Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                    role === "editor"
                      ? "bg-primary-fixed/20 border-primary shadow-2xs ring-2 ring-primary/20"
                      : "bg-surface-container-low border-surface-container-high/60 hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
                      Editor (Recommended)
                    </span>
                    <input
                      type="radio"
                      name="role"
                      value="editor"
                      checked={role === "editor"}
                      onChange={() => setRole("editor")}
                      className="accent-primary"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-snug">
                    Can add &amp; edit itinerary activities, suggest stops, contribute packing items, and claim checklist duties.
                  </p>
                </label>

                <label
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                    role === "viewer"
                      ? "bg-primary-fixed/20 border-primary shadow-2xs ring-2 ring-primary/20"
                      : "bg-surface-container-low border-surface-container-high/60 hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-secondary">visibility</span>
                      Viewer
                    </span>
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={role === "viewer"}
                      onChange={() => setRole("viewer")}
                      className="accent-primary"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-snug">
                    Can inspect itinerary schedule, live weather, and documents with read-only access.
                  </p>
                </label>
              </div>
            </div>

            {/* Optional Personal Note */}
            <div>
              <label htmlFor="invite-note" className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Personal Invitation Note <span className="text-[10px] text-on-surface-variant font-normal">(Optional)</span>
              </label>
              <textarea
                id="invite-note"
                rows={2}
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="e.g. Excited for this trip! Let's divide packing gear and pick favorite landmarks."
                className="w-full px-4 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-xs placeholder:text-on-surface-variant/50 leading-relaxed resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isSending || !email.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSending ? "animate-spin" : ""}`}>
                  {isSending ? "progress_activity" : "send"}
                </span>
                <span>{isSending ? "Dispatching Invitation..." : "Send Email Invitation"}</span>
              </button>
            </div>
          </form>

          {/* Shareable Link Box */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">link</span>
                Direct Shareable Invite Link
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">Valid for 7 Days</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high">
              <input
                type="text"
                readOnly
                value={currentShareUrl}
                className="flex-1 px-2.5 text-xs font-mono text-on-surface bg-transparent focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1 shrink-0 border border-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isLinkCopied ? "check" : "content_copy"}
                </span>
                <span>{isLinkCopied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Share this link directly in messages, Slack, or group chats. Any invited traveler can accept and become a contributor.
            </p>
          </div>

          {/* Active Collaborators & Pending Invites Roster */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                Active Travelers &amp; Pending Invites ({members.length + invitations.filter((i) => i.status === "pending").length})
              </h3>
              {isLoadingRoster && (
                <span className="material-symbols-outlined text-[16px] animate-spin text-primary">
                  progress_activity
                </span>
              )}
            </div>

            {/* Current Members */}
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {(m.profile?.display_name || "T").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-on-surface block truncate">
                        {m.profile?.display_name || "Traveler"}
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate block">
                        {m.profile?.email || "Authenticated Traveler"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      m.role === "owner"
                        ? "bg-primary-fixed text-on-primary-fixed border-primary/20"
                        : "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20"
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
              ))}

              {/* Pending Invitations */}
              {invitations
                .filter((inv) => inv.status === "pending")
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl bg-surface-container-lowest border border-dashed border-amber-500/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-on-surface block truncate">
                          {inv.invited_email}
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Invite Code: {inv.invite_code} • Pending Acceptance
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant border border-surface-container-highest uppercase">
                        {inv.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                        className="text-[11px] text-error hover:underline disabled:opacity-50 cursor-pointer"
                        title="Revoke invitation"
                      >
                        {revokingId === inv.id ? "Revoking..." : "Revoke"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-surface-container-high/40 bg-surface-container-low/50 flex items-center justify-between text-xs text-on-surface-variant">
          <span>All editors can co-develop itineraries &amp; organize gear.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
