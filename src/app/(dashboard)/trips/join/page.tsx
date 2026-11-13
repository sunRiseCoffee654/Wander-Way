"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { getInvitationByCode, acceptTripInvitation } from "@/lib/collaboration/actions";
import type { TripInvitation } from "@/lib/collaboration/types";

function JoinTripContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [inviteCode, setInviteCode] = useState(initialCode);
  const [invitation, setInvitation] = useState<TripInvitation | null>(null);
  const [isValidating, setIsValidating] = useState(() => Boolean(initialCode));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Guest details form state
  const [travelerName, setTravelerName] = useState("");
  const [travelerEmail, setTravelerEmail] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCode) return;

    let isCancelled = false;

    getInvitationByCode(initialCode)
      .then((res) => {
        if (isCancelled) return;
        if (res.valid && res.invitation) {
          setInvitation(res.invitation);
          if (res.invitation.invited_email) {
            setTravelerEmail(res.invitation.invited_email);
          }
        } else {
          setValidationError(res.error || "Invalid invitation code.");
        }
        setIsValidating(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        setValidationError(err instanceof Error ? err.message : "Failed to validate code.");
        setIsValidating(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [initialCode]);

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsValidating(true);
    setValidationError(null);
    setInvitation(null);

    try {
      const res = await getInvitationByCode(inviteCode.trim());
      if (res.valid && res.invitation) {
        setInvitation(res.invitation);
        if (res.invitation.invited_email) {
          setTravelerEmail(res.invitation.invited_email);
        }
      } else {
        setValidationError(res.error || "Invalid invitation code.");
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCode = invitation?.invite_code || inviteCode.trim();
    if (!effectiveCode) return;

    setIsJoining(true);
    setValidationError(null);

    try {
      const res = await acceptTripInvitation(
        effectiveCode,
        travelerName.trim() || undefined,
        travelerEmail.trim() || undefined
      );

      if (res.success && res.tripId) {
        setJoinedSuccess(res.message || "Invitation accepted! Navigating to trip...");
        setTimeout(() => {
          router.push(`/trips/${res.tripId}` as Route);
        }, 1500);
      } else {
        setValidationError(res.error || "Could not accept invitation.");
        setIsJoining(false);
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Failed to join trip.");
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-surface-container-lowest border border-surface-container-high/60 rounded-3xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-surface-container-high/40">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">group_add</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-primary block">
              Trip Collaboration
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Join Travel Journey
            </h1>
          </div>
        </div>

        {/* Code Input Form if no invitation loaded */}
        {!invitation && (
          <form onSubmit={handleManualLookup} className="space-y-4">
            <p className="text-xs text-on-surface-variant">
              Enter the 7-day invite code provided in your email invitation or message (format: <code>WW-XXXX-YYYY</code>).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. WW-JAIPUR-COLLAB"
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm uppercase placeholder:font-sans"
              />
              <button
                type="submit"
                disabled={isValidating || !inviteCode.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isValidating ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                )}
                <span>Verify Code</span>
              </button>
            </div>
          </form>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Success Banner */}
        {joinedSuccess && (
          <div
            role="status"
            className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 text-center space-y-2 animate-in fade-in"
          >
            <span className="material-symbols-outlined text-[36px] text-emerald-600 block mx-auto">
              celebration
            </span>
            <h3 className="text-base font-bold">Successfully Enrolled!</h3>
            <p className="text-xs">{joinedSuccess}</p>
          </div>
        )}

        {/* Validated Invitation Card */}
        {invitation && !joinedSuccess && (
          <div className="space-y-6">
            {/* Trip Preview Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-fixed/25 via-surface-container-low to-surface-container border border-surface-container-high/60 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    You Are Invited To
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface">
                    {invitation.trip_title || "WanderWay Journey"}
                  </h2>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    <span>{invitation.destination || "Destination"}</span>
                    <span>•</span>
                    <span>Invited by {invitation.inviter_name || "Trip Lead"}</span>
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary text-on-primary shrink-0 shadow-2xs">
                  {invitation.role} Access
                </span>
              </div>

              {invitation.personal_message && (
                <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-surface-container-high/40 text-xs italic text-on-surface">
                  &ldquo;{invitation.personal_message}&rdquo;
                </div>
              )}
            </div>

            {/* Contributor Powers Checklist */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                What you can do as an {invitation.role}:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-1">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit_calendar</span>
                  <span className="text-xs font-bold text-on-surface">Contribute Itinerary</span>
                  <span className="text-[11px] text-on-surface-variant leading-snug">
                    Add places, modify scheduled times, and vote on proposed stops.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-1">
                  <span className="material-symbols-outlined text-secondary text-[20px]">backpack</span>
                  <span className="text-xs font-bold text-on-surface">Co-Manage Packing</span>
                  <span className="text-[11px] text-on-surface-variant leading-snug">
                    Add gear items to the checklist, assign gear to travelers, and check items off.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-1">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">forum</span>
                  <span className="text-xs font-bold text-on-surface">Group Hub &amp; Voice</span>
                  <span className="text-[11px] text-on-surface-variant leading-snug">
                    Join live traveler group talk, share coordinates, and review weather warnings.
                  </span>
                </div>
              </div>
            </div>

            {/* Acceptance Form */}
            <form onSubmit={handleAcceptInvite} className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/50 space-y-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Confirm Your Traveler Identity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="traveler-name" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Your Name / Display Nickname
                  </label>
                  <input
                    id="traveler-name"
                    type="text"
                    required
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder="e.g. Priya Nair"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="traveler-email" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Your Email Address
                  </label>
                  <input
                    id="traveler-email"
                    type="email"
                    required
                    value={travelerEmail}
                    onChange={(e) => setTravelerEmail(e.target.value)}
                    placeholder="e.g. priya.nair@example.in"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-on-surface-variant">
                  Invite Code: <strong>{invitation.invite_code}</strong>
                </span>
                <button
                  type="submit"
                  disabled={isJoining || !travelerName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isJoining ? "animate-spin" : ""}`}>
                    {isJoining ? "progress_activity" : "check_circle"}
                  </span>
                  <span>{isJoining ? "Joining Trip..." : `Accept & Join Trip as ${invitation.role}`}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-2 flex items-center justify-between text-xs text-on-surface-variant border-t border-surface-container-high/40">
          <Link href={"/trips" as Route} className="hover:text-primary transition-colors">
            ← Return to Trips Overview
          </Link>
          <span>WanderWay Grounded Travel Companion</span>
        </div>
      </div>
    </div>
  );
}

export default function JoinTripPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-xl mx-auto py-20 text-center text-xs text-on-surface-variant">
          Loading invitation...
        </div>
      }
    >
      <JoinTripContent />
    </Suspense>
  );
}
