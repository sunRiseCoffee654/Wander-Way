"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type Booking,
  type BookingType,
  type BookingStatus,
  BOOKING_TYPES,
  BOOKING_STATUSES,
} from "@/lib/bookings/types";
import {
  filterBookings,
  calculateBookingMetrics,
} from "@/lib/bookings/helpers";
import {
  deleteBookingAction,
  updateBookingAction,
} from "@/lib/bookings/actions";
import { formatMinorUnits } from "@/lib/currency/service";
import { BookingModal } from "./booking-modal";

interface BookingsClientViewProps {
  tripId: string;
  tripTitle?: string;
  initialBookings: Booking[];
  defaultCurrency?: string;
}

const TYPE_LABELS: Record<BookingType, { label: string; icon: string }> = {
  flight: { label: "Flights", icon: "flight" },
  accommodation: { label: "Hotels & Stays", icon: "hotel" },
  train: { label: "Trains & Rail", icon: "train" },
  bus: { label: "Buses", icon: "directions_bus" },
  activity: { label: "Activities", icon: "local_activity" },
  rental: { label: "Rentals & WiFi", icon: "car_rental" },
  other: { label: "Other Passes", icon: "confirmation_number" },
};

const STATUS_BADGE: Record<BookingStatus, { label: string; badgeClass: string; icon: string }> = {
  idea: { label: "Idea", badgeClass: "bg-surface-container-high text-on-surface-variant border border-outline-variant/40", icon: "lightbulb" },
  researching: { label: "Researching", badgeClass: "bg-secondary-container text-on-secondary-container", icon: "search" },
  price_selected: { label: "Price Selected", badgeClass: "bg-tertiary-container text-on-tertiary-container", icon: "sell" },
  booked: { label: "Booked", badgeClass: "bg-primary text-on-primary font-semibold shadow-xs", icon: "verified" },
  completed: { label: "Completed", badgeClass: "bg-emerald-600 text-white font-semibold", icon: "task_alt" },
  cancelled: { label: "Cancelled", badgeClass: "bg-error-container text-on-error-container line-through", icon: "cancel" },
};

const NEXT_STAGE: Partial<Record<BookingStatus, { next: BookingStatus; label: string }>> = {
  idea: { next: "researching", label: "Start Research" },
  researching: { next: "price_selected", label: "Select Price" },
  price_selected: { next: "booked", label: "Confirm Booked" },
  booked: { next: "completed", label: "Mark Completed" },
};

export function BookingsClientView({
  tripId,
  tripTitle = "Trip Reservations",
  initialBookings,
  defaultCurrency = "INR",
}: BookingsClientViewProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [categoryFilter, setCategoryFilter] = useState<BookingType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Filtered Bookings
  const filtered = useMemo(() => {
    return filterBookings(bookings, {
      category: categoryFilter,
      status: statusFilter,
      searchQuery,
    });
  }, [bookings, categoryFilter, statusFilter, searchQuery]);

  // Overall Metrics
  const metrics = useMemo(() => {
    return calculateBookingMetrics(bookings);
  }, [bookings]);

  // Copy confirmation code helper
  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
    }
  };

  // Quick Advance Status
  const handleAdvanceStatus = async (booking: Booking) => {
    const nextCfg = NEXT_STAGE[booking.status];
    if (!nextCfg) return;

    try {
      const res = await updateBookingAction(booking.id, {
        status: nextCfg.next,
      });

      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? res.booking! : b))
        );
      }
    } catch (err) {
      console.error("Failed to advance status:", err);
    }
  };

  // Delete Booking
  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to remove this booking?")) return;
    try {
      const res = await deleteBookingAction(id);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete booking:", err);
    }
  };

  // Saved callback from modal
  const handleSavedBooking = (saved: Booking) => {
    setBookings((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      if (exists) {
        return prev.map((b) => (b.id === saved.id ? saved : b));
      }
      return [saved, ...prev];
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            <Link href={`/trips/${tripId}`} className="hover:text-primary transition-colors">
              {tripTitle}
            </Link>
            <span>/</span>
            <span className="text-primary">Reservations Tracker</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
            Bookings, Tickets & Passes
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Track flights, stays, trains and tours from exploration to confirmed booking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/trips/${tripId}/vault`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              folder_shared
            </span>
            <span>Document Vault</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingBooking(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Reservation</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Confirmed Spend */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Confirmed Spend
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface">
              {formatMinorUnits(metrics.totalConfirmedMinorUnits, defaultCurrency)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {metrics.counts.booked + metrics.counts.completed} confirmed reservations
            </p>
          </div>
        </div>

        {/* Pending / Pipeline Spend */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Pipeline / Estimations
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface">
              {formatMinorUnits(metrics.totalPendingMinorUnits, defaultCurrency)}
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1">
              {metrics.counts.idea + metrics.counts.researching + metrics.counts.price_selected} in pipeline
            </p>
          </div>
        </div>

        {/* Status Pipeline Breakdown */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Funnel Progress
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <span className="text-primary">{metrics.counts.booked} Booked</span>
            <span className="text-outline">/</span>
            <span>{metrics.counts.price_selected} Quoted</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface-variant">{metrics.counts.idea} Ideas</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full mt-3 overflow-hidden flex">
            <div
              className="bg-primary h-full"
              style={{
                width: `${metrics.totalCount ? (metrics.counts.booked / metrics.totalCount) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-tertiary-container h-full"
              style={{
                width: `${metrics.totalCount ? (metrics.counts.price_selected / metrics.totalCount) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-secondary-container h-full"
              style={{
                width: `${metrics.totalCount ? (metrics.counts.researching / metrics.totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Total Reservations */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Tracked
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface">
              {metrics.totalCount} Bookings
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1">
              Active journey pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Funnel Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            statusFilter === "all"
              ? "bg-primary text-on-primary shadow-xs"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <span>All Statuses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-semibold">
            {metrics.totalCount}
          </span>
        </button>

        {BOOKING_STATUSES.map((st) => {
          const isSelected = statusFilter === st;
          const count = metrics.counts[st] || 0;
          const cfg = STATUS_BADGE[st];

          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? "bg-black/20" : "bg-surface-container-high"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === "all"
                ? "bg-on-surface text-surface"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
            }`}
          >
            All Categories
          </button>
          {BOOKING_TYPES.map((type) => {
            const isSelected = categoryFilter === type;
            const cfg = TYPE_LABELS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setCategoryFilter(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-on-surface text-surface font-semibold"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search provider or code..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Bookings List / Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">bookmark_border</span>
          </div>
          <h3 className="text-base font-bold text-on-surface">No reservations found</h3>
          <p className="text-xs text-on-surface-variant max-w-sm">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "No reservations match your current filters. Try resetting the search or category."
              : "Track flights, hotel vouchers, train passes, and tours in one unified command center."}
          </p>
          {(searchQuery || categoryFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((b) => {
            const typeCfg = TYPE_LABELS[b.booking_type];
            const statusCfg = STATUS_BADGE[b.status];
            const nextAction = NEXT_STAGE[b.status];
            const meta = b.metadata as Record<string, unknown> | null;
            const metaNotes = typeof meta?.notes === "string" ? meta.notes : null;

            return (
              <div
                key={b.id}
                className="group p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-container-high text-primary shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]">
                        {typeCfg.icon}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant">
                        {typeCfg.label}
                      </span>
                      <h3 className="text-base font-bold text-on-surface line-clamp-1">
                        {b.provider_name}
                      </h3>
                      {b.booking_date && (
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            calendar_today
                          </span>
                          <span>
                            {new Date(b.booking_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusCfg.badgeClass}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {statusCfg.icon}
                      </span>
                      <span>{statusCfg.label}</span>
                    </span>

                    <span className="text-base font-black text-on-surface">
                      {formatMinorUnits(b.amount_minor_units, b.currency)}
                    </span>
                  </div>
                </div>

                {/* Confirmation Code & Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-outline-variant/20 text-xs">
                  {b.confirmation_code ? (
                    <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-xl font-mono text-[11px]">
                      <span className="text-on-surface-variant">Ref:</span>
                      <span className="font-bold text-on-surface tracking-wider">
                        {b.confirmation_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(b.confirmation_code!, b.id)}
                        className="ml-1 p-1 rounded-md hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Copy confirmation code"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedId === b.id ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-on-surface-variant italic">
                      No confirmation code yet
                    </span>
                  )}

                  {metaNotes && (
                    <span className="text-[11px] text-on-surface-variant truncate max-w-[200px]">
                      {metaNotes}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {nextAction ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(b)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_forward
                      </span>
                      <span>{nextAction.label}</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBooking(b);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Edit reservation"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBooking(b.id)}
                      className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                      title="Delete reservation"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBooking(null);
        }}
        tripId={tripId}
        booking={editingBooking}
        defaultCurrency={defaultCurrency}
        onSaved={handleSavedBooking}
      />
    </div>
  );
}
