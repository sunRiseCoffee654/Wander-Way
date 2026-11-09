"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GroupTalkDrawer } from "@/components/collaboration/group-talk-drawer";

interface StitchSidebarProps {
  currentTripTitle?: string;
  activeTripId?: string;
}

export function StitchSidebar({
  currentTripTitle = "Plan a Journey",
  activeTripId,
}: StitchSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isGroupTalkOpen, setIsGroupTalkOpen] = useState(false);

  const tripMatch = pathname?.match(/^\/trips\/([^/]+)/);
  const resolvedTripId = (tripMatch && tripMatch[1] !== "new") ? tripMatch[1] : activeTripId;

  const itineraryHref = (resolvedTripId ? `/trips/${resolvedTripId}` : "/trips") as Route;
  const bookingsHref = (resolvedTripId ? `/trips/${resolvedTripId}/bookings` : "/trips") as Route;
  const budgetHref = (resolvedTripId ? `/trips/${resolvedTripId}/budget` : "/budget") as Route;
  const intelligenceHref = (resolvedTripId ? `/trips/${resolvedTripId}/intelligence` : "/vault") as Route;
  const vaultHref = (resolvedTripId ? `/trips/${resolvedTripId}/vault` : "/vault") as Route;
  const packingHref = (resolvedTripId ? `/trips/${resolvedTripId}/packing` : "/packing") as Route;

  const navItems: { href: Route; label: string; icon: string; isActive: boolean }[] = [
    {
      href: "/" as Route,
      label: "Home Launcher",
      icon: "roofing",
      isActive: pathname === "/",
    },
    {
      href: "/explore" as Route,
      label: "Explore",
      icon: "explore",
      isActive: pathname.startsWith("/explore"),
    },
    {
      href: "/trips" as Route,
      label: "Trip Overview",
      icon: "space_dashboard",
      isActive: pathname === "/trips",
    },
    {
      href: itineraryHref,
      label: "Itinerary & Routes",
      icon: "route",
      isActive:
        pathname.startsWith("/trips/") &&
        pathname !== "/trips/new" &&
        !pathname.includes("/budget") &&
        !pathname.includes("/vault") &&
        !pathname.includes("/packing") &&
        !pathname.includes("/bookings") &&
        !pathname.includes("/intelligence"),
    },
    {
      href: bookingsHref,
      label: "Bookings & Passes",
      icon: "confirmation_number",
      isActive: pathname.includes("/bookings"),
    },
    {
      href: packingHref,
      label: "Smart Packing & Gear",
      icon: "checklist",
      isActive: pathname.includes("/packing"),
    },
    {
      href: budgetHref,
      label: "Budget Intelligence",
      icon: "payments",
      isActive: pathname.includes("/budget"),
    },
    {
      href: intelligenceHref,
      label: "Live Travel Intel",
      icon: "verified",
      isActive: pathname.includes("/intelligence"),
    },
    {
      href: vaultHref,
      label: "Document Vault",
      icon: "lock",
      isActive: pathname.includes("/vault"),
    },
    {
      href: "/profile" as Route,
      label: "Profile & Account",
      icon: "person",
      isActive: pathname.startsWith("/profile"),
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Floating mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed bottom-5 left-5 z-40 flex lg:hidden size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      {/* Persistent Sidebar (Desktop) + Slide-out Drawer (Mobile) */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between py-6 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-standard lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between px-3 py-2">
            <Link
              href="/trips"
              className="flex items-center group py-1"
              onClick={() => setMobileOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nav_logo.png"
                alt="WanderWay"
                className="h-9 w-auto max-w-[170px] object-contain group-hover:scale-105 transition-transform"
              />
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          </div>

          {/* Current Trip Pill */}
          <div className="px-3">
            <Link
              href={itineraryHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">
                luggage
              </span>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant">
                  Current Trip
                </span>
                <span className="text-sm font-medium text-on-surface truncate">
                  {currentTripTitle}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const activeClass = item.isActive
                ? "bg-primary-fixed text-on-primary-fixed font-semibold shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-4 px-4 py-3 rounded-full transition-all text-sm font-medium ${activeClass}`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform group-hover:scale-105 ${
                      item.isActive ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & Sign In */}
        <div className="flex flex-col gap-2 px-3">
          {/* Group Talk & Video Hub Launcher */}
          <button
            type="button"
            onClick={() => {
              setIsGroupTalkOpen(true);
              setMobileOpen(false);
            }}
            className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-all text-left shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  forum
                </span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">
                  Group Talk & Call
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Chat, Vote & Video Room
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              Live
            </span>
          </button>

          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors group shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">
                account_circle
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-on-surface">
                  Sign In / Account
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Personal Travel Vault
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </Link>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-lowest/60 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="font-medium">Cloud Vault Secured</span>
            </div>
            <span className="font-semibold text-primary">v3.2</span>
          </div>
        </div>
      </aside>

      {/* Group Talk Slide-Out Drawer & Video Room */}
      <GroupTalkDrawer
        tripId={resolvedTripId || "default"}
        tripTitle={currentTripTitle}
        isOpen={isGroupTalkOpen}
        onClose={() => setIsGroupTalkOpen(false)}
      />
    </>
  );
}
