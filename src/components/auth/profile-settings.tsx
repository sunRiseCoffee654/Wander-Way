"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileSettingsProps {
  userEmail?: string | null;
  userId?: string | null;
}

export default function ProfileSettings({
  userEmail,
  userId,
}: ProfileSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "Elena Rostova",
    home_location: "San Francisco International (SFO)",
    preferred_currency: "INR",
    travel_pace: "balanced",
    phone: "+1 (415) 890-2341",
    budget_basis: "person" as "person" | "group",
  });

  const [constraints, setConstraints] = useState<string[]>([
    "Vegetarian",
    "Direct Flights Preferred",
    "High Walkability",
  ]);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!userId) return;
      const { data, error: err } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (mounted) {
        if (err) {
          // If no row exists yet or profile table is empty, keep default rich state
        } else if (data) {
          setFormData((prev) => ({
            ...prev,
            full_name: data.full_name || prev.full_name,
            home_location: data.home_location || prev.home_location,
            preferred_currency: data.preferred_currency || prev.preferred_currency,
            travel_pace: (data.travel_preferences as Record<string, string>)?.travel_pace || prev.travel_pace,
          }));
        }
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [supabase, userId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    if (!userId) {
      setIsLoading(false);
      setSuccess(true);
      showToast("Profile preferences updated locally.");
      setTimeout(() => setSuccess(false), 4000);
      return;
    }

    const { error: err } = await supabase.from("profiles").upsert({
      id: userId,
      email: userEmail || null,
      full_name: formData.full_name || null,
      home_location: formData.home_location || null,
      preferred_currency: formData.preferred_currency,
      travel_preferences: { travel_pace: formData.travel_pace },
      updated_at: new Date().toISOString(),
    });

    setIsLoading(false);
    if (err) {
      setError(err.message);
      showToast(`Error saving profile: ${err.message}`);
      return;
    }

    setSuccess(true);
    showToast("Profile and travel preferences saved successfully.");
    setTimeout(() => setSuccess(false), 4000);
  };

  const handleReindex = () => {
    setIsReindexing(true);
    setTimeout(() => {
      setIsReindexing(false);
      showToast("Cloud Vault re-indexed. 28 documents & vector indices verified.");
    }, 1000);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleExportData = () => {
    const exportPayload = {
      traveler: formData.full_name,
      email: userEmail || "elena.rostova@wanderway.app",
      home_location: formData.home_location,
      currency: formData.preferred_currency,
      pace: formData.travel_pace,
      constraints,
      exported_at: new Date().toISOString(),
      vault_version: "v3.2",
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanderway-profile-archive-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export archive downloaded.");
  };

  const toggleConstraint = (item: string) => {
    setConstraints((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-on-surface text-surface shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="material-symbols-outlined text-[20px] text-tertiary-fixed">
            check_circle
          </span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Action & Navigation Context Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs tracking-wider uppercase font-medium">
            <span>Settings</span>
            <span>/</span>
            <span className="text-primary font-semibold">Account &amp; Identity</span>
          </div>
          <h1 className="text-3xl font-normal text-on-surface tracking-tight">
            Profile &amp; Account Settings
          </h1>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            Manage your traveler identity, default planning currency, travel pace, security vaults, and offline synchronizations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button
            type="button"
            id="save-settings-btn"
            disabled={isLoading}
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-surface-tint text-on-primary text-sm font-medium shadow-xs transition-all cursor-pointer disabled:opacity-70 active:scale-[0.98]"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isLoading ? "animate-spin" : ""
              }`}
            >
              {isLoading ? "refresh" : "check"}
            </span>
            <span>{isLoading ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-xs">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Profile and travel preferences saved successfully.</span>
        </div>
      )}

      {/* Main Settings Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Identity & Travel Preferences (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* 1. Traveler Identity Card */}
          <section className="bg-surface-container-low rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 border border-outline-variant/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Elena Rostova Avatar"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xs ring-4 ring-surface-container-lowest"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary shadow-xs"
                    title="Online & Synced"
                  >
                    <span className="material-symbols-outlined text-[14px]">done</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-medium text-on-surface">
                      {formData.full_name || "Elena Rostova"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px]">
                        verified
                      </span>
                      Verified Explorer • Trip Lead
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    Member since October 2022 • 14 countries cataloged
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => showToast("Profile photo dialog opened.")}
                      className="text-primary hover:text-surface-tint text-xs font-medium transition-colors cursor-pointer"
                    >
                      Change photo
                    </button>
                    <span className="text-outline-variant">•</span>
                    <button
                      type="button"
                      onClick={() => showToast("Avatar reset to default.")}
                      className="text-error hover:text-on-error-container text-xs transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end text-right bg-surface-container-lowest px-4 py-2.5 rounded-xl shadow-xs border border-outline-variant/30">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">
                  Passports Linked
                </span>
                <span className="text-sm font-semibold text-on-surface flex items-center gap-1.5 mt-0.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    public
                  </span>
                  USA (Exp. 2031)
                </span>
              </div>
            </div>

            {/* Identity Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-medium">
                  Display Name
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                    badge
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg pl-11 pr-4 py-2.5 text-sm text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/40"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, full_name: e.target.value }))
                    }
                  />
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Shown on booking vouchers and group trip boards
                </span>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-on-surface-variant font-medium">
                    Primary Email
                  </label>
                  <span className="inline-flex items-center gap-1 text-tertiary text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">
                      check_circle
                    </span>
                    Verified
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                    mail
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg pl-11 pr-4 py-2.5 text-sm text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/40"
                    type="email"
                    readOnly
                    value={userEmail || "elena.rostova@wanderway.app"}
                  />
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Primary destination for flight changes &amp; booking receipts
                </span>
              </div>

              {/* Home Airport */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-medium">
                  Usual Departure / Home Airport
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                    flight_takeoff
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg pl-11 pr-4 py-2.5 text-sm text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/40"
                    type="text"
                    value={formData.home_location}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, home_location: e.target.value }))
                    }
                  />
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Default baseline for route calculations &amp; time estimates
                </span>
              </div>

              {/* Phone / Emergency Contact */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-medium">
                  Phone &amp; Emergency SMS
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                    phone
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg pl-11 pr-4 py-2.5 text-sm text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/40"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, phone: e.target.value }))
                    }
                  />
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Used for gate change pings and SOS location relay
                </span>
              </div>
            </div>
          </section>

          {/* 2. Global Travel Preferences & Budget Defaults */}
          <section className="bg-surface-container-low rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    tune
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-medium text-on-surface">
                    Travel Preferences &amp; Budget Defaults
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Customize algorithmic route pacing, currency engines, and comfort guidelines.
                  </p>
                </div>
              </div>
            </div>

            {/* Currency Engine */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs flex flex-col gap-4 border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-on-surface">
                    Preferred Planning Currency
                  </span>
                  <p className="text-xs text-on-surface-variant">
                    All travel budgets, cost breakdowns, and quotes render in this currency.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <select
                    value={formData.preferred_currency}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        preferred_currency: e.target.value,
                      }))
                    }
                    className="w-full appearance-none bg-surface-container-high hover:bg-surface-container px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-semibold text-primary border-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="INR">INR (₹) • Indian Rupee</option>
                    <option value="USD">USD ($) • US Dollar</option>
                    <option value="EUR">EUR (€) • Euro</option>
                    <option value="JPY">JPY (¥) • Japanese Yen</option>
                    <option value="GBP">GBP (£) • British Pound</option>
                    <option value="AUD">AUD ($) • Australian Dollar</option>
                    <option value="CAD">CAD ($) • Canadian Dollar</option>
                  </select>
                </div>
              </div>

              {/* FX Rate Live Ticker Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    currency_exchange
                  </span>
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    Live Vault Exchange Benchmarks
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">1 USD =</span>
                    <span className="font-medium text-primary">148.20 JPY</span>
                    <span className="text-tertiary text-[10px]">▲ 0.4%</span>
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="inline-flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">1 USD =</span>
                    <span className="font-medium text-primary">0.92 EUR</span>
                    <span className="text-tertiary text-[10px]">▲ 0.1%</span>
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="inline-flex items-center gap-1.5 text-on-surface">
                    <span className="text-on-surface-variant">1 USD =</span>
                    <span className="font-medium text-primary">1.54 AUD</span>
                    <span className="text-secondary text-[10px]">▼ 0.2%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Pace Segmented Control */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-on-surface">
                  Algorithmic Travel Pace
                </label>
                <span className="text-xs text-on-surface-variant">
                  Controls buffer minutes between sequential events
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-container rounded-xl p-1.5">
                {[
                  { id: "relaxed", label: "Relaxed", sub: "2-3 activities/day" },
                  { id: "balanced", label: "Balanced (Active)", sub: "4-5 activities/day" },
                  { id: "full", label: "Fast-Paced", sub: "High-density schedule" },
                ].map((pace) => {
                  const isActive = formData.travel_pace === pace.id;
                  return (
                    <button
                      key={pace.id}
                      type="button"
                      onClick={() =>
                        setFormData((d) => ({ ...d, travel_pace: pace.id }))
                      }
                      className={`py-2.5 px-3 rounded-lg text-center text-xs transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                        isActive
                          ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {pace.label}
                        {isActive && (
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            done
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] opacity-80">{pace.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Budget Basis Segmented Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div>
                <span className="text-sm font-semibold text-on-surface">
                  Default Budget Presentation
                </span>
                <p className="text-xs text-on-surface-variant">
                  Preferred baseline split across multi-traveler itineraries.
                </p>
              </div>
              <div className="inline-flex bg-surface-container rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((d) => ({ ...d, budget_basis: "person" }))
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    formData.budget_basis === "person"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Per Person
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((d) => ({ ...d, budget_basis: "group" }))
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    formData.budget_basis === "group"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Total Group
                </button>
              </div>
            </div>

            {/* Dietary & Accessibility Multi-Select Assist Chips */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-on-surface">
                  Dietary, Mobility &amp; Transit Constraints
                </label>
                <span className="text-xs text-on-surface-variant">
                  Applied automatically to suggestions
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {[
                  "Vegetarian",
                  "Direct Flights Preferred",
                  "High Walkability",
                  "Step-Free Access",
                  "Nut Allergy Cautious",
                  "Eco / Rail-Priority",
                ].map((chip) => {
                  const isSelected = constraints.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleConstraint(chip)}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs cursor-pointer ${
                        isSelected
                          ? "bg-secondary-container text-on-secondary-container font-semibold"
                          : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? "check" : "add"}
                      </span>
                      <span>{chip}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Data Ownership & Danger Zone Section */}
          <section className="bg-surface-container-low rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 border border-outline-variant/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-medium text-on-surface">
                  Data Portability &amp; Ownership
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Export your itineraries, flight manifests, receipts, and personal metadata anytime in open formats.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface text-xs font-semibold shadow-xs transition-all cursor-pointer border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-error-container hover:bg-error/20 text-on-error-container text-xs font-semibold shadow-xs transition-all cursor-pointer border border-error/20 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Danger Zone Accordion */}
            <div className="rounded-xl bg-surface-container-lowest p-5 flex flex-col gap-4 shadow-xs border border-error/20">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setDangerOpen(!dangerOpen)}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-[24px]">
                    warning
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-error">
                      Danger Zone: Account Deletion
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Irreversibly delete your profile, offline caches, and disassociate lead ownership on shared trips.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                  {dangerOpen ? "expand_less" : "expand_more"}
                </span>
              </div>

              {dangerOpen && (
                <div className="flex flex-col gap-4 pt-3 border-t border-outline-variant/30">
                  <div className="p-4 rounded-lg bg-error-container text-on-error-container text-xs flex flex-col gap-2">
                    <span className="font-semibold text-xs">
                      Notice for Active Trip Leads:
                    </span>
                    <span>
                      You are currently listed as the primary billing lead for{" "}
                      <strong>&quot;Kyoto &amp; Tokyo Autumn Journey&quot;</strong> and{" "}
                      <strong>&quot;Swiss Alps Trek 2025&quot;</strong>. Deleting this account will orphan these collaborative boards unless ownership is reassigned to another co-traveler.
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-xs text-on-surface-variant">
                      This action cannot be undone. All documents inside Cloud Vault will be wiped immediately.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you absolutely sure you want to delete your WanderWay account and purge all vault documents? This action cannot be undone."
                          )
                        ) {
                          showToast("Account deletion simulated.");
                        }
                      }}
                      className="px-5 py-2 rounded-lg bg-error text-on-error text-xs font-semibold hover:bg-on-error-container transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      Delete Account &amp; Purge Vault
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Cloud Vault, Security & Cache Management (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 3. Connected Travel Vault & Device Sync */}
          <section className="bg-surface-container-low rounded-2xl p-6 shadow-xs flex flex-col gap-5 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                  <span className="material-symbols-outlined text-[20px]">
                    cloud_done
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    Cloud Vault &amp; Sync
                  </h3>
                  <span className="text-xs text-tertiary font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    v3.2 • 100% Synchronized
                  </span>
                </div>
              </div>
            </div>

            {/* Synchronized Nodes Card */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">
                  Registered Devices
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  2 connected
                </span>
              </div>

              {/* Device 1 */}
              <div className="flex items-center justify-between text-on-surface py-1">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-outline text-[18px]">
                    laptop_mac
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">
                      MacBook Pro 16&quot; (This Device)
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Kyoto itinerary editing active
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-tertiary font-medium">Active</span>
              </div>

              {/* Device 2 */}
              <div className="flex items-center justify-between text-on-surface py-1">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-outline text-[18px]">
                    smartphone
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">iPhone 15 Pro</span>
                    <span className="text-[11px] text-on-surface-variant">
                      Synced 4m ago • Tokyo eSIM
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant">Standby</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="reindex-btn"
                  onClick={handleReindex}
                  disabled={isReindexing}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-medium transition-colors cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isReindexing ? "animate-spin" : ""
                    }`}
                  >
                    sync
                  </span>
                  <span>
                    {isReindexing
                      ? "Re-indexing..."
                      : "Force Re-index Remote Vault"}
                  </span>
                </button>
              </div>
            </div>

            {/* Offline Local Cache Storage */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">
                  Local Storage Cache
                </span>
                <span className="text-xs font-bold text-primary">
                  142 MB Total
                </span>
              </div>

              {/* Storage distribution progress bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden flex">
                <div
                  className="bg-primary h-full"
                  style={{ width: "58%" }}
                  title="Offline Vector Maps (82MB)"
                />
                <div
                  className="bg-secondary-container h-full"
                  style={{ width: "27%" }}
                  title="PDF Vouchers & Tickets (38MB)"
                />
                <div
                  className="bg-tertiary-fixed-dim h-full"
                  style={{ width: "15%" }}
                  title="Saved Places Data (22MB)"
                />
              </div>

              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Map Tiles (82 MB)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary-container" />
                  PDFs (38 MB)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
                  Meta (22 MB)
                </span>
              </div>

              <p className="text-xs text-on-surface-variant">
                Cached routes and transit schedules remain available during subterranean train transits and low-connectivity flights.
              </p>

              <button
                type="button"
                onClick={() => showToast("Local offline cache cleared.")}
                className="flex items-center justify-center gap-1.5 py-1.5 text-secondary hover:text-on-secondary-container text-xs font-semibold transition-colors self-start cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete_sweep
                </span>
                <span>Clear Offline Cache</span>
              </button>
            </div>

            {/* Authentication & Security Connections */}
            <div className="flex flex-col gap-3 pt-1">
              <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">
                Authentication Methods
              </span>
              <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center font-bold text-on-surface text-[14px]">
                    G
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      Google Account
                    </span>
                    <span className="text-[11px] text-on-surface-variant truncate max-w-[140px]">
                      {userEmail || "elena.rostova@gmail.com"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">
                      password
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      Email OTP Shield
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Two-step passkey enabled
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-tertiary font-bold">
                  Active
                </span>
              </div>
            </div>
          </section>

          {/* 4. Visual Trip Footprint & Travel Persona */}
          <section className="bg-surface-container-low rounded-2xl p-6 shadow-xs flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-on-surface">
                Traveler Stats
              </span>
              <span className="text-xs text-secondary font-semibold">
                2024 Autumn Season
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-xs flex flex-col border border-outline-variant/30">
                <span className="text-[11px] text-on-surface-variant">
                  Planned Trips
                </span>
                <span className="text-2xl font-bold text-primary mt-1">6</span>
                <span className="text-[11px] text-tertiary mt-0.5 font-medium">
                  2 upcoming
                </span>
              </div>
              <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-xs flex flex-col border border-outline-variant/30">
                <span className="text-[11px] text-on-surface-variant">
                  Vault Documents
                </span>
                <span className="text-2xl font-bold text-secondary mt-1">
                  28
                </span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  Tickets &amp; Visas
                </span>
              </div>
            </div>

            {/* Stylized Flatlay Image */}
            <div className="relative rounded-xl overflow-hidden shadow-xs h-28 bg-surface-container-high">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Traveler Artifacts"
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-inverse-on-surface text-xs font-medium">
                  Active Trip: Kyoto &amp; Tokyo Autumn Journey
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
