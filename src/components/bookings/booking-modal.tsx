"use client";

import { useState } from "react";
import {
  type Booking,
  type BookingType,
  type BookingStatus,
  BOOKING_TYPES,
  BOOKING_STATUSES,
} from "@/lib/bookings/types";
import {
  createBookingAction,
  updateBookingAction,
} from "@/lib/bookings/actions";
import { CURRENCY_DECIMALS } from "@/lib/currency/service";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  booking?: Booking | null;
  defaultCurrency?: string;
  onSaved: (booking: Booking) => void;
}

const TYPE_CONFIG: Record<
  BookingType,
  { label: string; icon: string; defaultProviderHint: string }
> = {
  flight: { label: "Flight", icon: "flight", defaultProviderHint: "e.g. IndiGo Airlines 6E-214" },
  accommodation: { label: "Accommodation", icon: "hotel", defaultProviderHint: "e.g. Taj Rambagh Palace Jaipur" },
  train: { label: "Train / Rail", icon: "train", defaultProviderHint: "e.g. Vande Bharat Express (IRCTC)" },
  bus: { label: "Bus / Coach", icon: "directions_bus", defaultProviderHint: "e.g. RSRTC Volvo Sleeper Coach" },
  activity: { label: "Activity / Tour", icon: "local_activity", defaultProviderHint: "e.g. Amber Fort Heritage & Stepwell Walk" },
  rental: { label: "Rental Vehicle / WiFi", icon: "car_rental", defaultProviderHint: "e.g. Savaari Innova / Airport WiFi" },
  other: { label: "Other Reservation", icon: "confirmation_number", defaultProviderHint: "e.g. ASI Monument Entry Ticket" },
};

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; desc: string }> = {
  idea: { label: "Idea / Exploring", color: "bg-surface-container text-on-surface-variant", desc: "Shortlisted options" },
  researching: { label: "Researching", color: "bg-secondary-container text-on-secondary-container", desc: "Comparing quotes & timings" },
  price_selected: { label: "Price Selected", color: "bg-tertiary-container text-on-tertiary-container", desc: "Best option chosen" },
  booked: { label: "Confirmed & Booked", color: "bg-primary text-on-primary", desc: "Reservation secured with provider" },
  completed: { label: "Completed", color: "bg-emerald-600 text-white", desc: "Trip leg concluded" },
  cancelled: { label: "Cancelled", color: "bg-error-container text-on-error-container", desc: "Voided or abandoned" },
};

const POPULAR_CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD", "CHF"];

function minorUnitsToMajor(minor: number, currency: string): string {
  const decimals = CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
  return (minor / Math.pow(10, decimals)).toFixed(decimals);
}

function majorToMinor(majorStr: string, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
  const num = parseFloat(majorStr) || 0;
  return Math.round(num * Math.pow(10, decimals));
}

export function BookingModal(props: BookingModalProps) {
  if (!props.isOpen) return null;
  return <BookingModalInner key={props.booking?.id ?? "new"} {...props} />;
}

function BookingModalInner({
  onClose,
  tripId,
  booking,
  defaultCurrency = "INR",
  onSaved,
}: BookingModalProps) {
  const isEditing = Boolean(booking);

  const meta = booking?.metadata as Record<string, unknown> | null;
  const initialNotes =
    typeof meta?.notes === "string"
      ? meta.notes
      : typeof meta?.details === "string"
      ? meta.details
      : "";

  const [providerName, setProviderName] = useState(booking?.provider_name ?? "");
  const [bookingType, setBookingType] = useState<BookingType>(booking?.booking_type ?? "flight");
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "idea");
  const [confirmationCode, setConfirmationCode] = useState(booking?.confirmation_code || "");
  const [bookingDate, setBookingDate] = useState(
    booking?.booking_date ? booking.booking_date.slice(0, 16) : ""
  );
  const [currency, setCurrency] = useState(booking?.currency || defaultCurrency);
  const [amountStr, setAmountStr] = useState(
    booking
      ? minorUnitsToMajor(booking.amount_minor_units, booking.currency || defaultCurrency)
      : ""
  );
  const [notes, setNotes] = useState(initialNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!providerName.trim()) {
      setError("Please provide a reservation title or provider name.");
      return;
    }

    setIsSubmitting(true);
    const amountMinor = majorToMinor(amountStr, currency);

    try {
      if (isEditing && booking) {
        const res = await updateBookingAction(booking.id, {
          provider_name: providerName.trim(),
          booking_type: bookingType,
          status,
          confirmation_code: confirmationCode.trim() || null,
          booking_date: bookingDate ? new Date(bookingDate).toISOString() : null,
          amount_minor_units: amountMinor,
          currency,
          metadata: notes ? { notes } : null,
        });

        if (!res.success || !res.booking) {
          setError(res.error || "Failed to update booking.");
          setIsSubmitting(false);
          return;
        }

        onSaved(res.booking);
      } else {
        const res = await createBookingAction({
          trip_id: tripId,
          provider_name: providerName.trim(),
          booking_type: bookingType,
          status,
          confirmation_code: confirmationCode.trim() || null,
          booking_date: bookingDate ? new Date(bookingDate).toISOString() : null,
          amount_minor_units: amountMinor,
          currency,
          metadata: notes ? { notes } : null,
        });

        if (!res.success || !res.booking) {
          setError(res.error || "Failed to create booking.");
          setIsSubmitting(false);
          return;
        }

        onSaved(res.booking);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
              <span className="material-symbols-outlined text-[24px]">
                {TYPE_CONFIG[bookingType].icon}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                {isEditing ? "Edit Reservation" : "Add Reservation"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Track external bookings, e-tickets, confirmations and spend
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          {/* Booking Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Reservation Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BOOKING_TYPES.map((type) => {
                const isSelected = bookingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBookingType(type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow-xs"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {TYPE_CONFIG[type].icon}
                    </span>
                    <span className="truncate">{TYPE_CONFIG[type].label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider / Title */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Provider / Reservation Title *
            </label>
            <input
              type="text"
              required
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder={TYPE_CONFIG[bookingType].defaultProviderHint}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Funnel Status */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Funnel Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOOKING_STATUSES.map((st) => {
                const isSelected = status === st;
                const conf = STATUS_CONFIG[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow-xs font-semibold"
                        : "bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="font-medium truncate">{conf.label}</span>
                    <span className={`text-[10px] truncate ${isSelected ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                      {conf.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmation Code & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Confirmation Code / PNR
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  qr_code
                </span>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="e.g. PNR-6E884910"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-wider font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Amount / Fare
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm font-semibold placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {POPULAR_CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes / Details */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Notes, Seat or Room Details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Window Seat 14A, Breakfast included"
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-sm hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
              )}
              <span>{isEditing ? "Save Changes" : "Confirm Booking"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
