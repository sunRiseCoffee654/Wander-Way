"use client";

import Link from "next/link";
import { useState } from "react";

interface StitchHeaderProps {
  tripDatesSubtitle?: string;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
}

export function StitchHeader({
  tripDatesSubtitle = "WanderWay • Grounded Travel Companion",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80",
}: StitchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl z-30 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40">
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="flex items-center gap-2.5 w-full bg-surface-container rounded-full px-4 py-2 hover:bg-surface-container-high transition-colors focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary shadow-2xs">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent w-full text-on-surface placeholder:text-on-surface-variant text-xs sm:text-sm focus:outline-none"
            placeholder="Search places, reservations, tickets, notes..."
          />
          <span className="hidden sm:inline-block text-[11px] font-medium text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-md">
            ⌘K
          </span>
        </div>
      </div>

      {/* Header Right Actions & Badges */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Date Horizon Pill (Desktop only) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface">
          <span className="material-symbols-outlined text-secondary text-[18px]">
            calendar_month
          </span>
          <span className="text-xs font-medium truncate max-w-[280px]">
            {tripDatesSubtitle}
          </span>
        </div>

        {/* Sync Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          <span className="text-xs font-semibold">Synced</span>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            aria-label="Notifications"
            className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface-container-lowest p-4 shadow-xl border border-surface-container-high z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                <span className="text-xs font-semibold uppercase text-primary">
                  Notifications
                </span>
                <span className="text-[11px] text-tertiary font-medium">
                  All Systems Verified
                </span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                    flight_takeoff
                  </span>
                  <div>
                    <span className="font-semibold text-on-surface block">
                      IndiGo 6E-214 on schedule
                    </span>
                    <span className="text-on-surface-variant text-[11px]">
                      Departs Gate B14 DEL Direct to JAI
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-secondary-fixed/30">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
                    warning
                  </span>
                  <div>
                    <span className="font-semibold text-on-surface block">
                      Day 4 Action Needed
                    </span>
                    <span className="text-on-surface-variant text-[11px]">
                      Amber Fort Sunrise Elephant Gate unreserved
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <Link
          href="/profile"
          aria-label="Settings"
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>

        {/* Profile Avatar */}
        <Link href="/profile" className="flex items-center pl-1 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Traveler Profile Avatar"
            src={userAvatar}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-container-high group-hover:ring-primary transition-all shadow-2xs"
          />
        </Link>
      </div>
    </header>
  );
}
