"use client";

import React, { useState } from "react";
import { ShareTripModal } from "./share-trip-modal";

interface TripShareButtonProps {
  tripId: string;
  tripTitle?: string;
  destination?: string;
  variant?: "primary" | "secondary" | "outline" | "icon";
  className?: string;
  label?: string;
  defaultEmail?: string;
}

export function TripShareButton({
  tripId,
  tripTitle = "WanderWay Journey",
  destination = "Jaipur, Rajasthan",
  variant = "outline",
  className = "",
  label = "Share Trip",
  defaultEmail,
}: TripShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStyleClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-primary hover:bg-primary/90 text-on-primary font-bold shadow-xs";
      case "secondary":
        return "bg-secondary hover:bg-secondary/90 text-on-secondary font-bold shadow-xs";
      case "icon":
        return "p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest";
      case "outline":
      default:
        return "bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest font-semibold";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Share ${tripTitle} with other travelers`}
        className={`px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${getStyleClasses()} ${className}`}
        title="Share trip dashboard & invite contributors via email"
      >
        <span className="material-symbols-outlined text-[18px] text-primary">person_add</span>
        {variant !== "icon" && <span>{label}</span>}
      </button>

      <ShareTripModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tripId={tripId}
        tripTitle={tripTitle}
        destination={destination}
        defaultEmail={defaultEmail}
      />
    </>
  );
}
