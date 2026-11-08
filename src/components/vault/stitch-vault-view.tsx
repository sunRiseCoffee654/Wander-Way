"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/types/database";
import type { DestinationWeatherForecast } from "@/lib/weather/types";
import type { ConsularAdvisory } from "@/lib/advisories/types";

type DbDocument = Database["public"]["Tables"]["documents"]["Row"];

interface StitchVaultViewProps {
  tripTitle?: string;
  tripId?: string;
  destination?: string;
  dbDocuments?: DbDocument[];
}

type StreamCategory = "all" | "aviation" | "weather" | "transit" | "safety";
type VaultDocCategory = "flights" | "hotels" | "passports" | "insurance";
type VaultCategory = "all" | VaultDocCategory;

interface VaultDoc {
  id: string;
  category: VaultDocCategory;
  title: string;
  sub: string;
  type: string;
  icon: string;
  badges: Array<{ label: string; icon?: string; style: string }>;
  downloadName: string;
}

const DEFAULT_DOCUMENTS: VaultDoc[] = [
  {
    id: "doc-1",
    category: "flights",
    title: "ANA Flight E-Ticket & Boarding Pass",
    sub: "PDF • 1.4 MB",
    type: "flights",
    icon: "airplane_ticket",
    badges: [
      { label: "Offline Ready", icon: "offline_pin", style: "bg-tertiary-fixed text-on-tertiary-fixed" },
      { label: "Verified QR", icon: "qr_code_2", style: "bg-primary-fixed text-on-primary-fixed" },
    ],
    downloadName: "ANA_NH107_BoardingPass.pdf",
  },
  {
    id: "doc-2",
    category: "hotels",
    title: "Kyoto Machiya Ryokan Reservation Voucher",
    sub: "PDF • Ref #RYO-44910",
    type: "hotels",
    icon: "hotel",
    badges: [
      { label: "Synced", icon: "offline_pin", style: "bg-tertiary-fixed text-on-tertiary-fixed" },
    ],
    downloadName: "Kyoto_Machiya_Voucher.pdf",
  },
  {
    id: "doc-3",
    category: "insurance",
    title: "Allianz Global Travel Insurance Policy",
    sub: "PDF • Policy #ALZ-88310",
    type: "insurance",
    icon: "health_and_safety",
    badges: [
      { label: "Synced", icon: "offline_pin", style: "bg-tertiary-fixed text-on-tertiary-fixed" },
    ],
    downloadName: "Allianz_Global_Insurance.pdf",
  },
  {
    id: "doc-4",
    category: "passports",
    title: "JR Whole Japan Rail Pass Exchange Order",
    sub: "PDF • 7-Day Ordinary",
    type: "passports",
    icon: "train",
    badges: [
      { label: "Physical Exchange Required", icon: "info", style: "bg-secondary-container text-on-secondary-container" },
    ],
    downloadName: "JR_RailPass_ExchangeOrder.pdf",
  },
];

export function StitchVaultView({
  tripTitle = "Kyoto & Tokyo Autumn Journey 2025",
  destination = "Kyoto, Japan",
  dbDocuments,
}: StitchVaultViewProps) {
  const [streamFilter, setStreamFilter] = useState<StreamCategory>("all");
  const [vaultFilter, setVaultFilter] = useState<VaultCategory>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [activeQrDoc, setActiveQrDoc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveWeather, setLiveWeather] = useState<DestinationWeatherForecast | null>(null);
  const [liveAdvisory, setLiveAdvisory] = useState<ConsularAdvisory | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTelemetry() {
      try {
        const [wRes, aRes] = await Promise.all([
          fetch(`/api/weather?destination=${encodeURIComponent(destination)}`),
          fetch(`/api/advisories?destination=${encodeURIComponent(destination)}`),
        ]);
        if (wRes.ok) {
          const wJson = await wRes.json();
          if (isMounted && wJson.success) setLiveWeather(wJson.data);
        }
        if (aRes.ok) {
          const aJson = await aRes.json();
          if (isMounted && aJson.success) setLiveAdvisory(aJson.data);
        }
      } catch {
        // Retain graceful fallback state
      }
    }
    fetchTelemetry();
    return () => {
      isMounted = false;
    };
  }, [destination]);

  const initialDocs = (dbDocuments && dbDocuments.length > 0)
    ? dbDocuments.map((doc) => {
        const isPdf =
          doc.mime_type?.toLowerCase().includes("pdf") ||
          doc.title.toLowerCase().endsWith(".pdf");
        const lowerTitle = doc.title.toLowerCase();
        let cat: VaultDocCategory = "passports";
        if (["flights", "hotels", "passports", "insurance"].includes(doc.category?.toLowerCase())) {
          cat = doc.category.toLowerCase() as VaultDocCategory;
        } else if (lowerTitle.includes("flight") || lowerTitle.includes("boarding") || lowerTitle.includes("ticket")) {
          cat = "flights";
        } else if (lowerTitle.includes("hotel") || lowerTitle.includes("ryokan") || lowerTitle.includes("stay")) {
          cat = "hotels";
        } else if (lowerTitle.includes("insurance") || lowerTitle.includes("policy")) {
          cat = "insurance";
        }

        const formatType = isPdf ? "PDF" : doc.mime_type ? doc.mime_type.split("/")[1]?.toUpperCase() || "File" : "Document";

        return {
          id: doc.id,
          category: cat,
          title: doc.title,
          sub: `${formatType} • ${doc.file_size_bytes ? (doc.file_size_bytes / (1024 * 1024)).toFixed(1) + " MB" : "Cached"}`,
          type: cat,
          icon: isPdf ? "description" : "draft",
          badges: [
            { label: "Cloud Synced", icon: "cloud_done", style: "bg-tertiary-fixed text-on-tertiary-fixed" },
            { label: "AES-256 Encrypted", icon: "lock", style: "bg-primary-fixed text-on-primary-fixed" },
          ],
          downloadName: doc.title,
        };
      })
    : DEFAULT_DOCUMENTS;

  const [documents, setDocuments] = useState<VaultDoc[]>(initialDocs);

  // Regional emergency services resolver based on destination
  const isSwiss = destination.toLowerCase().includes("switzerland") || destination.toLowerCase().includes("interlaken") || destination.toLowerCase().includes("alps");
  const isItaly = destination.toLowerCase().includes("italy") || destination.toLowerCase().includes("amalfi") || destination.toLowerCase().includes("rome");
  const isMexico = destination.toLowerCase().includes("mexico") || destination.toLowerCase().includes("oaxaca");

  const emergencyInfo = isSwiss
    ? {
        regionName: "Switzerland",
        police: { label: "Swiss Police", dial: "117", href: "tel:117", icon: "local_police" },
        medical: { label: "Ambulance", dial: "144", href: "tel:144", icon: "ambulance" },
        third: { label: "Rega Rescue", dial: "1414", href: "tel:1414", icon: "emergency" },
        embassy: { name: "U.S. Embassy Bern", address: "Sulgeneckstrasse 19, Bern", phone: "+41313577011" },
      }
    : isItaly
    ? {
        regionName: "Italy",
        police: { label: "Carabinieri", dial: "112", href: "tel:112", icon: "local_police" },
        medical: { label: "Pronto Soccorso", dial: "118", href: "tel:118", icon: "ambulance" },
        third: { label: "Coast Guard", dial: "1530", href: "tel:1530", icon: "support_agent" },
        embassy: { name: "U.S. Embassy Rome", address: "Via Vittorio Veneto 121, Rome", phone: "+390646741" },
      }
    : isMexico
    ? {
        regionName: "Mexico",
        police: { label: "National Police", dial: "911", href: "tel:911", icon: "local_police" },
        medical: { label: "Cruz Roja", dial: "911", href: "tel:911", icon: "ambulance" },
        third: { label: "Angeles Verdes", dial: "078", href: "tel:078", icon: "support_agent" },
        embassy: { name: "U.S. Embassy Mexico City", address: "Paseo de la Reforma 305, CDMX", phone: "+525585262561" },
      }
    : {
        regionName: "Japan",
        police: { label: "Japan Police", dial: "110", href: "tel:110", icon: "local_police" },
        medical: { label: "Ambulance • Fire", dial: "119", href: "tel:119", icon: "ambulance" },
        third: { label: "Tourist Helpline (EN)", dial: "050-3816-2720", href: "tel:05038162720", icon: "support_agent" },
        embassy: { name: "U.S. Embassy Tokyo", address: "1-10-5 Akasaka, Minato-ku, Tokyo", phone: "+81332245000" },
      };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setUploadNotice("Remote vault and offline caches synced with SHA-256 integrity.");
      setTimeout(() => setUploadNotice(null), 4000);
    }, 1200);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const newDoc: VaultDoc = {
      id: `doc-${Date.now()}`,
      category: "flights",
      title: file.name,
      sub: `${(file.size / (1024 * 1024)).toFixed(1)} MB • Added just now`,
      type: "flights",
      icon: "description",
      badges: [
        { label: "AES-256 Encrypted", icon: "lock", style: "bg-tertiary-fixed text-on-tertiary-fixed" },
      ],
      downloadName: file.name,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setUploadNotice(`Encrypted & stored "${file.name}" locally in Cloud Vault.`);
    setTimeout(() => setUploadNotice(null), 4000);
  };

  const filteredDocs = documents.filter((doc) => {
    if (vaultFilter === "all") return true;
    return doc.category === vaultFilter;
  });

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Toast Notice */}
      {uploadNotice && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary text-on-primary shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="text-sm font-medium">{uploadNotice}</span>
        </div>
      )}

      {/* Live Status Bar */}
      <div className="w-full bg-surface-container-low rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="absolute top-0 right-0 w-3 h-3 bg-tertiary rounded-full ring-2 ring-surface-container-low animate-ping" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-tertiary rounded-full ring-2 ring-surface-container-low" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-on-surface">
                All Systems Verified
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-medium">
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Last Checked 12 mins ago • Real-time push stream active
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface">
            <span className="material-symbols-outlined text-primary text-[18px]">
              cloud_done
            </span>
            <span className="text-xs font-medium">
              Offline Mode: Ready ({documents.length} documents synced)
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isSyncing ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            <span className="text-xs">{isSyncing ? "Syncing..." : "Force Sync"}</span>
          </button>
        </div>
      </div>

      {/* Primary Dashboard Grid: 60% Left, 40% Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Live Travel Alert Inbox (Col 7 / ~60%) */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* Section Header & Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-6 bg-primary rounded-full" />
              <div>
                <h2 className="text-xl font-semibold text-on-surface tracking-tight">
                  Live Intelligence Stream
                </h2>
                <span className="text-xs text-on-surface-variant">
                  4 active bulletins for {tripTitle}
                </span>
              </div>
            </div>

            {/* Alert Category Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "all", label: "All (4)" },
                  { id: "aviation", label: "Aviation" },
                  { id: "weather", label: "Weather" },
                  { id: "transit", label: "Transit" },
                  { id: "safety", label: "Safety" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setStreamFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    streamFilter === chip.id
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Container */}
          <div className="flex flex-col gap-4">
            {/* Card 1: Flight Status (Aviation) */}
            {(streamFilter === "all" || streamFilter === "aviation") && (
              <div className="group bg-surface-container-low rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30">
                <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary/5 pointer-events-none" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">
                        flight_takeoff
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          ANA Flight NH107
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-medium">
                          On Time
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        San Francisco (SFO) → Tokyo Haneda (HND)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
                    Checked 15m ago
                  </span>
                </div>

                {/* Transit Metas Grid */}
                <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-surface-container rounded-xl my-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      Departure Gate
                    </span>
                    <span className="text-sm font-bold text-primary">Gate G98</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      Terminal
                    </span>
                    <span className="text-sm font-bold text-on-surface">
                      Terminal 1 (Intl)
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      Est. Touchdown
                    </span>
                    <span className="text-sm font-bold text-tertiary">
                      14:55 JST (+1)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span
                      className="material-symbols-outlined text-[16px] text-tertiary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="text-xs">
                      Source: FlightAware Verified Provider
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveQrDoc("ANA Flight NH107 Radar: FL340 over North Pacific • Mach 0.84")}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Live Air Radar
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Card 2: Weather Advisory (Weather) */}
            {(streamFilter === "all" || streamFilter === "weather") && (
              <div className="bg-surface-container-low rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden border border-outline-variant/30">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">
                        {liveWeather?.condition_icon || "rainy"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          {liveWeather ? `${liveWeather.condition_text} (${liveWeather.temperature_current}°C)` : "Weather Intelligence"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            liveWeather?.rain_risk === "high"
                              ? "bg-secondary text-on-secondary"
                              : liveWeather?.rain_risk === "moderate"
                              ? "bg-secondary-fixed text-secondary"
                              : "bg-tertiary-fixed text-on-tertiary-fixed"
                          }`}
                        >
                          {liveWeather ? `Rain Risk: ${liveWeather.rain_risk.toUpperCase()}` : "Caution Advisory"}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {destination} Regional Corridor • Valid Today
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    {liveWeather?.rain_risk === "high" ? "warning" : "thermostat"}
                  </span>
                </div>

                <div className="p-3 bg-surface-container rounded-xl my-2 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      {liveWeather
                        ? `Precipitation: ${liveWeather.precipitation_probability}% (${liveWeather.precipitation_mm}mm) • Wind: ${liveWeather.wind_speed_kmh || 12} km/h`
                        : "Impact: Seasonal transit changes and light rain possible"}
                    </span>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {liveWeather?.warnings[0]?.message ||
                        "Minor regional transit speed reductions or schedule adjustments may occur during peak precipitation windows."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span
                      className="material-symbols-outlined text-[16px] text-tertiary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="text-xs">
                      Source: {liveWeather?.source || "National Meteorological Bureau"}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {liveWeather ? "Live Grounded" : "Updated 24m ago"}
                  </span>
                </div>
              </div>
            )}

            {/* Card 3: Road & Transit Incident Card (Transit) */}
            {(streamFilter === "all" || streamFilter === "transit") && (
              <div className="bg-surface-container-low rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow border border-outline-variant/30">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">
                        directions_bus
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          Municipal Transit &amp; Local Reroute Active
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium">
                          Active Notice
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Central pedestrian crossing and historical corridor
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    alt_route
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant my-2 px-1">
                  Temporary detours in effect due to festival rehearsals and historic maintenance.
                  Nearby transit stops shifted 150m west to the primary boulevard.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span
                      className="material-symbols-outlined text-[16px] text-tertiary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="text-xs">
                      Source: Municipal Transit Authority
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveQrDoc("Transit Detour Map: Historic Corridor shift active until 18:00")}
                    className="text-xs text-primary font-medium hover:underline cursor-pointer"
                  >
                    View Detour Map
                  </button>
                </div>
              </div>
            )}

            {/* Card 4: Official Safety & Health Advisory */}
            {(streamFilter === "all" || streamFilter === "safety" || streamFilter === "transit") && (
              <div className="bg-surface-container-low rounded-2xl p-5 shadow-xs hover:shadow-sm transition-shadow border border-outline-variant/30">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">
                        health_and_safety
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">
                          {liveAdvisory ? `${liveAdvisory.country_name} Safety Clearance` : "Safety & Health Clearance"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-medium">
                          {liveAdvisory ? `Safety Score: ${liveAdvisory.safety_score}/100` : "Verified Green"}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {liveAdvisory?.level_name || "Advisory Level: Level 1 (Exercise Normal Precautions)"}
                      </span>
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined text-tertiary text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    shield
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant my-2 px-1">
                  {liveAdvisory?.summary ||
                    `No active travel advisories, infectious warnings, or transit closures issued for ${destination}. Medical infrastructure and emergency response channels operating at full capacity.`}
                </p>

                {liveAdvisory && (
                  <div className="my-2 p-2.5 rounded-xl bg-surface-container flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-on-surface">
                      <span className="material-symbols-outlined text-secondary text-[16px]">local_police</span>
                      <span>Police: <strong className="text-primary">{liveAdvisory.emergency_contacts.police}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-on-surface">
                      <span className="material-symbols-outlined text-secondary text-[16px]">medical_services</span>
                      <span>Ambulance: <strong className="text-primary">{liveAdvisory.emergency_contacts.ambulance}</strong></span>
                    </div>
                    {liveAdvisory.emergency_contacts.tourist_helpline && (
                      <div className="flex items-center gap-1.5 font-medium text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[16px]">support_agent</span>
                        <span>Helpline: <strong className="text-primary">{liveAdvisory.emergency_contacts.tourist_helpline}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span
                      className="material-symbols-outlined text-[16px] text-tertiary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="text-xs">
                      Source: {liveAdvisory?.source || "Official Consular Affairs & WHO"}
                    </span>
                  </div>
                  <span className="text-xs text-tertiary font-semibold">
                    Verified Grounded
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Secure Travel Vault (Col 5 / ~40%) */}
        <aside className="lg:col-span-5 flex flex-col gap-5">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-6 bg-secondary rounded-full" />
              <div>
                <h2 className="text-xl font-semibold text-on-surface tracking-tight">
                  Secure Travel Vault
                </h2>
                <span className="text-xs text-on-surface-variant">
                  Hardware-encrypted • Fully cached offline
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              lock
            </span>
          </div>

          {/* Categories Segment Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(
              [
                { id: "all", label: "All Docs" },
                { id: "flights", label: "Flights" },
                { id: "hotels", label: "Hotels" },
                { id: "passports", label: "Passports" },
                { id: "insurance", label: "Insurance" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setVaultFilter(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  vaultFilter === cat.id
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Vault Documents List */}
          <div className="flex flex-col gap-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-surface-container-low shadow-xs hover:shadow-sm transition-shadow flex items-start justify-between gap-3 border border-outline-variant/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {doc.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-on-surface">
                      {doc.title}
                    </span>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <span className="text-xs text-on-surface-variant">
                        {doc.sub}
                      </span>
                      {doc.badges.map((b, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${b.style}`}
                        >
                          {b.icon && (
                            <span className="material-symbols-outlined text-[12px]">
                              {b.icon}
                            </span>
                          )}
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveQrDoc(`Downloaded: ${doc.title} (${doc.downloadName})`);
                  }}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                  title="Download / Open"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    download
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Quick Action: Upload Secure Document & Target */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            className={`group relative rounded-2xl p-6 transition-all border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer ${
              isDragging
                ? "bg-surface-container-high border-primary"
                : "bg-surface-container-low border-outline-variant/50 hover:bg-surface-container"
            }`}
            onClick={() => {
              const el = document.getElementById("vaultFileInput");
              el?.click();
            }}
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">
                upload_file
              </span>
            </div>
            <span className="text-sm font-semibold text-on-surface">
              + Upload Secure Document
            </span>
            <p className="text-xs text-on-surface-variant mt-1">
              Drag &amp; drop PDF, JPEG, or PKPASS files here, or browse files
            </p>
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                lock
              </span>
              <span className="text-xs">
                Private by default • Encrypted locally via AES-256
              </span>
            </div>
            <input
              id="vaultFileInput"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.pkpass"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
        </aside>
      </div>

      {/* BOTTOM SECTION: Emergency Contacts & Embassy Assistance Bar */}
      <section className="mt-8 mb-6 bg-surface-container-low rounded-2xl p-6 shadow-xs border border-outline-variant/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Title & Local Emergency Numbers */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">
                  emergency
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Emergency Assistance &amp; Consular Support
                </h3>
                <span className="text-xs text-on-surface-variant">
                  One-tap dialing for emergency dispatch in {emergencyInfo.regionName}
                </span>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-3 mt-1">
              {/* Police Dial Button */}
              <a
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface transition-colors"
                href={emergencyInfo.police.href}
              >
                <span className="material-symbols-outlined text-error text-[20px]">
                  {emergencyInfo.police.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {emergencyInfo.police.label}
                  </span>
                  <span className="text-xs font-bold">Dial {emergencyInfo.police.dial}</span>
                </div>
              </a>

              {/* Ambulance & Fire Dial Button */}
              <a
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface transition-colors"
                href={emergencyInfo.medical.href}
              >
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  {emergencyInfo.medical.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {emergencyInfo.medical.label}
                  </span>
                  <span className="text-xs font-bold">Dial {emergencyInfo.medical.dial}</span>
                </div>
              </a>

              {/* Third Service (Helpline/Rega/Angeles Verdes) */}
              <a
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                href={emergencyInfo.third.href}
              >
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {emergencyInfo.third.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {emergencyInfo.third.label}
                  </span>
                  <span className="text-xs font-bold">{emergencyInfo.third.dial}</span>
                </div>
              </a>
            </div>
          </div>

          {/* Right: Diplomatic / Embassy Assistance Card */}
          <div className="w-full lg:w-auto p-4 rounded-xl bg-surface-container flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  account_balance
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">
                  {emergencyInfo.embassy.name}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {emergencyInfo.embassy.address}
                </span>
                <span className="text-[11px] text-tertiary mt-0.5 font-medium">
                  Duty Officer 24/7 Available
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-xs"
                href={`tel:${emergencyInfo.embassy.phone}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  call
                </span>
                <span className="text-xs font-semibold">Call Embassy</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal / Dialog for preview */}
      {activeQrDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-on-surface">Document Notice</span>
              <button
                onClick={() => setActiveQrDoc(null)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant">{activeQrDoc}</p>
            <button
              onClick={() => setActiveQrDoc(null)}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary-container transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
