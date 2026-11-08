"use client";

import { useState, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Info,
} from "lucide-react";
import type { GroundedActivity } from "@/lib/ai/types";

interface SameDayMapProps {
  destination: string;
  activities: GroundedActivity[];
  selectedActivityIds: Set<string>;
  onSelectActivity?: (id: string) => void;
  activeActivityId?: string | null;
  className?: string;
}

export function SameDayMap({
  destination,
  activities,
  selectedActivityIds,
  onSelectActivity,
  activeActivityId,
  className = "",
}: SameDayMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter activities with valid resolved coordinates
  const resolvedStops = useMemo(() => {
    return activities
      .map((act, index) => ({
        ...act,
        waypointNumber: index + 1,
      }))
      .filter(
        (act) =>
          act.latitude !== null &&
          act.longitude !== null &&
          !isNaN(act.latitude) &&
          !isNaN(act.longitude),
      );
  }, [activities]);

  const unresolvedStops = useMemo(() => {
    return activities.filter((act) => act.latitude === null || act.longitude === null);
  }, [activities]);

  // Compute bounding box and center
  const { center, bounds } = useMemo(() => {
    if (resolvedStops.length === 0) {
      return {
        center: { lat: 35.0116, lon: 135.7681 }, // Fallback default
        bounds: null,
      };
    }

    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;

    for (const stop of resolvedStops) {
      if (stop.latitude! < minLat) minLat = stop.latitude!;
      if (stop.latitude! > maxLat) maxLat = stop.latitude!;
      if (stop.longitude! < minLon) minLon = stop.longitude!;
      if (stop.longitude! > maxLon) maxLon = stop.longitude!;
    }

    return {
      center: {
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2,
      },
      bounds: { minLat, maxLat, minLon, maxLon },
    };
  }, [resolvedStops]);

  // Construct Geoapify static map background URL
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";
  const mapWidth = 800;
  const mapHeight = 540;

  const staticMapUrl = useMemo(() => {
    if (!apiKey) return "";
    const style = "osm-bright-smooth";
    // We render custom interactive SVG markers, so static map supplies the beautiful base tiles
    return `https://maps.geoapify.com/v1/staticmap?style=${style}&width=${mapWidth}&height=${mapHeight}&center=lonlat:${center.lon},${center.lat}&zoom=${zoomLevel}&apiKey=${apiKey}`;
  }, [apiKey, center.lon, center.lat, zoomLevel]);

  // Project lat/lon to normalized 0-100% coordinates relative to center and zoom
  function projectToPercent(lat: number, lon: number): { x: number; y: number } {
    if (!bounds || resolvedStops.length <= 1) {
      return { x: 50, y: 50 };
    }

    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.015);
    const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.02);

    // Padding inside the SVG viewport (15% to 85%)
    const pad = 18;
    const x = pad + ((lon - bounds.minLon) / lonSpan) * (100 - pad * 2);
    // Latitudes: higher latitude is higher up on map (lower y%)
    const y = 100 - (pad + ((lat - bounds.minLat) / latSpan) * (100 - pad * 2));

    return {
      x: Math.min(Math.max(x, 10), 90),
      y: Math.min(Math.max(y, 10), 90),
    };
  }

  function handleResetView() {
    setZoomLevel(13);
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-surface shadow-elevation-1 ${className}`}
    >
      {/* Map Header / Control Bar */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-elevated/90 px-4 py-2.5 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <Navigation className="size-4 text-primary" />
          <span className="font-serif text-sm font-semibold text-text-primary">
            Same-Day Route Map
          </span>
          <span className="rounded-control bg-selected-bg px-2 py-0.5 text-[11px] font-medium text-on-selected">
            {resolvedStops.length} stops mapped
          </span>
        </div>

        {/* Zoom & Fit controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 18))}
            className="flex size-7 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 9))}
            className="flex size-7 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="flex size-7 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus"
            title="Fit day bounds"
            aria-label="Fit day bounds"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map Visual Surface */}
      <div className="relative h-[420px] w-full overflow-hidden bg-[#e8edea]">
        {/* Raster Tile Backdrop */}
        {staticMapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl}
            alt={`Map of ${destination}`}
            className="size-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-canvas text-xs text-text-muted">
            Map tiles loading...
          </div>
        )}

        {/* Subtle grid pattern when tiles are loading */}
        <div className="pointer-events-none absolute inset-0 bg-radial from-transparent to-black/5" />

        {/* Interactive SVG Overlay with Waypoint Markers & Polylines */}
        <svg
          className="absolute inset-0 size-full pointer-events-auto"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Connecting Polylines between consecutive resolved stops */}
          {resolvedStops.map((stop, idx) => {
            if (idx === resolvedStops.length - 1) return null;
            const nextStop = resolvedStops[idx + 1];
            const p1 = projectToPercent(stop.latitude!, stop.longitude!);
            const p2 = projectToPercent(nextStop.latitude!, nextStop.longitude!);

            const isCurrentSelected = selectedActivityIds.has(stop.id);
            const isNextSelected = selectedActivityIds.has(nextStop.id);
            const isPathActive = isCurrentSelected && isNextSelected;

            return (
              <g key={`leg-${stop.id}-${nextStop.id}`}>
                {/* Outer shadow line */}
                <line
                  x1={`${p1.x}%`}
                  y1={`${p1.y}%`}
                  x2={`${p2.x}%`}
                  y2={`${p2.y}%`}
                  stroke="rgba(255, 255, 255, 0.9)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Main route track */}
                <line
                  x1={`${p1.x}%`}
                  y1={`${p1.y}%`}
                  x2={`${p2.x}%`}
                  y2={`${p2.y}%`}
                  stroke={isPathActive ? "#08594F" : "#738C83"}
                  strokeWidth="2"
                  strokeDasharray={stop.travel_mode_to_next === "walk" ? "2 2" : "none"}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* HTML Waypoint Markers (Positioned by projectToPercent) */}
        {resolvedStops.map((stop) => {
          const pos = projectToPercent(stop.latitude!, stop.longitude!);
          const isSelected = selectedActivityIds.has(stop.id);
          const isHovered = hoveredId === stop.id;
          const isActive = activeActivityId === stop.id;
          const isLowMatch = stop.match_tier === "matched_low";

          return (
            <div
              key={stop.id}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute z-20 transition-transform duration-150 hover:scale-110"
              onMouseEnter={() => setHoveredId(stop.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectActivity?.(stop.id)}
            >
              {/* Waypoint Number Pill */}
              <button
                type="button"
                className={`relative flex size-8 items-center justify-center rounded-full font-serif text-xs font-bold transition-shadow cursor-pointer ${
                  isActive || isHovered
                    ? "ring-4 ring-primary/30 scale-110"
                    : ""
                } ${
                  isSelected
                    ? isLowMatch
                      ? "bg-[#FFF1CC] text-[#7A4B00] border-2 border-dashed border-[#7A4B00] shadow-sm"
                      : "bg-primary text-on-primary border-2 border-white shadow-md"
                    : "bg-surface text-text-muted border-2 border-border-subtle opacity-70"
                }`}
                aria-label={`Waypoint ${stop.waypointNumber}: ${stop.place_name}`}
              >
                {stop.waypointNumber}
              </button>

              {/* Hover / Active Tooltip */}
              {(isHovered || isActive) && (
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-control border border-border-subtle bg-surface px-2.5 py-1.5 text-left shadow-elevation-2 animate-in fade-in duration-100"
                  style={{ minWidth: "140px" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-text-primary">
                      #{stop.waypointNumber} {stop.planned_time || ""}
                    </span>
                    {stop.match_tier === "matched_low" && (
                      <span className="text-[10px] text-warning-fg font-medium">
                        Check location
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-text-primary truncate">
                    {stop.place_name}
                  </div>
                  {stop.formatted_address && (
                    <div className="text-[10px] text-text-muted truncate">
                      {stop.formatted_address}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Map Attribution Note */}
        <div className="pointer-events-none absolute bottom-1 right-2 z-10 rounded-xs bg-surface/80 px-1.5 py-0.5 text-[9px] text-text-muted backdrop-blur-xs">
          © OpenStreetMap, © Geoapify
        </div>
      </div>

      {/* Unresolved Places Invariant Banner (Honest Provenance) */}
      {unresolvedStops.length > 0 && (
        <div className="flex items-start gap-2 border-t border-border-subtle bg-surface-elevated p-3 text-xs text-text-secondary">
          <Info className="mt-0.5 size-4 shrink-0 text-text-muted" />
          <div className="leading-relaxed">
            <span className="font-medium text-text-primary">
              {unresolvedStops.length}{" "}
              {unresolvedStops.length === 1 ? "stop has" : "stops have"} no verified coordinates:
            </span>{" "}
            {unresolvedStops.map((u) => u.place_name).join(", ")}. In accordance with WanderWay
            data integrity standards, no fabricated pins are placed on your map.
          </div>
        </div>
      )}
    </div>
  );
}
