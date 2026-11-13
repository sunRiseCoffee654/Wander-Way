"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildDayTransitGeoJSON,
  detectTransitMode,
  calculateHaversineDistance,
  formatTransitHoursMinutes,
  type WaypointItem,
  type TransitLegItem,
} from "@/lib/itinerary/transit-geometry";
import {
  extractMapBounds,
  formatLegBadgeText,
  getTransitModeColor,
} from "./vector-map-helpers";

// Minimal offline vector style specification for MapLibre GL
const OFFLINE_FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#e8edea",
      },
    },
  ],
};

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export interface VectorItineraryMapProps {
  destination: string;
  waypoints: WaypointItem[];
  transitLegs?: TransitLegItem[];
  activeActivityId: string | null;
  onSelectWaypoint: (id: string) => void;
  className?: string;
  isOffline?: boolean;
}

export function VectorItineraryMap({
  destination,
  waypoints,
  transitLegs = [],
  activeActivityId,
  onSelectWaypoint,
  className = "",
  isOffline = false,
}: VectorItineraryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; element: HTMLDivElement }>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [webGlSupported] = useState<boolean>(() => checkWebGLSupport());

  // Compute computed transit legs if none provided
  const computedLegs = useMemo<TransitLegItem[]>(() => {
    if (transitLegs.length > 0) return transitLegs;
    const generated: TransitLegItem[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const dist = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
      const mode = detectTransitMode(dist);
      generated.push({
        fromId: from.id,
        toId: to.id,
        mode,
        distanceMeters: dist,
      });
    }
    return generated;
  }, [waypoints, transitLegs]);

  // Compute total day movement metrics
  const totalMetrics = useMemo(() => {
    let totalMeters = 0;
    let totalSeconds = 0;
    for (const leg of computedLegs) {
      const dist = leg.distanceMeters ?? 0;
      totalMeters += dist;
      const dur =
        leg.durationSeconds ??
        Math.round(dist / (leg.mode === "walk" ? 1.3 : leg.mode === "shinkansen" ? 55 : 12));
      totalSeconds += dur;
    }
    const km = Math.round(totalMeters / 100) / 10;
    return {
      km: `${km.toFixed(1)} km`,
      time: formatTransitHoursMinutes(totalSeconds),
      legsCount: computedLegs.length,
    };
  }, [computedLegs]);

  // Fit bounds helper
  const fitToWaypoints = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || waypoints.length === 0) return;

    const bounds = extractMapBounds(waypoints);
    if (!bounds) return;

    map.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 15,
        duration: 800,
      },
    );
  }, [waypoints]);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!mapContainerRef.current || !webGlSupported) return;

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    const hasValidKey = Boolean(apiKey && !apiKey.startsWith("your_") && apiKey !== "undefined");
    const styleUrl =
      hasValidKey && !isOffline
        ? `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`
        : OFFLINE_FALLBACK_STYLE;

    // Initial center from waypoints or fallback
    const firstWp = waypoints[0];
    const initialCenter: [number, number] = firstWp
      ? [firstWp.lng, firstWp.lat]
      : [75.7873, 26.9124];

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: initialCenter,
        zoom: 12,
        attributionControl: false,
      });
      mapInstanceRef.current = map;
    } catch (err) {
      console.warn("[MapLibre] Failed to create map instance, falling back:", err);
      return;
    }

    map.on("load", () => {
      setMapLoaded(true);

      // Add GeoJSON routes source
      const geojson = buildDayTransitGeoJSON(waypoints, computedLegs);
      if (!map.getSource("transit-routes")) {
        map.addSource("transit-routes", {
          type: "geojson",
          data: geojson,
        });

        // 1. Casing / Shadow line for contrast
        map.addLayer({
          id: "transit-routes-casing",
          type: "line",
          source: "transit-routes",
          filter: ["==", "$type", "LineString"],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#ffffff",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });

        // 2. Walking Legs (Teal dashed)
        map.addLayer({
          id: "transit-routes-walk",
          type: "line",
          source: "transit-routes",
          filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "walk"]],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#006A60",
            "line-width": 3.5,
            "line-dasharray": [2, 2],
          },
        });

        // 3. Metro / Rail Legs (Indigo solid)
        map.addLayer({
          id: "transit-routes-metro",
          type: "line",
          source: "transit-routes",
          filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "metro"]],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#4F5B92",
            "line-width": 4,
          },
        });

        // 4. Shinkansen / High-Speed Rail Legs (Amber glowing)
        map.addLayer({
          id: "transit-routes-shinkansen",
          type: "line",
          source: "transit-routes",
          filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "shinkansen"]],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#E06D10",
            "line-width": 4.5,
          },
        });

        // 5. Driving / Taxi Legs (Tertiary brown)
        map.addLayer({
          id: "transit-routes-drive",
          type: "line",
          source: "transit-routes",
          filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "drive"]],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#7B5800",
            "line-width": 3.5,
          },
        });
      }

      fitToWaypoints();
    });

    const currentMarkers = markersRef.current;
    return () => {
      // Cleanup markers
      currentMarkers.forEach(({ marker }) => marker.remove());
      currentMarkers.clear();
      map.remove();
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON source when waypoints or legs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("transit-routes") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      const geojson = buildDayTransitGeoJSON(waypoints, computedLegs);
      source.setData(geojson);
    }

    fitToWaypoints();
  }, [waypoints, computedLegs, mapLoaded, fitToWaypoints]);

  // Synchronize HTML markers with waypoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // Clean old markers not in current waypoints
    const currentIds = new Set(waypoints.map((w) => w.id));
    markersRef.current.forEach(({ marker }, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Create or update markers
    waypoints.forEach((wp) => {
      let entry = markersRef.current.get(wp.id);

      if (!entry) {
        const el = document.createElement("div");
        el.className = "ww-map-marker group cursor-pointer flex flex-col items-center";
        el.setAttribute("data-waypoint-id", wp.id);

        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = `size-8 rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer ${
          wp.isAi
            ? "bg-secondary text-on-secondary ring-2 ring-surface-container-lowest"
            : "bg-primary text-on-primary ring-2 ring-surface-container-lowest"
        }`;
        badge.textContent = String(wp.step);
        badge.setAttribute("aria-label", `Waypoint ${wp.step}: ${wp.title}`);

        const label = document.createElement("div");
        label.className =
          "mt-1 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-xs text-[10px] font-semibold text-on-surface shadow-xs truncate max-w-[110px] pointer-events-none";
        label.textContent = wp.title;

        el.appendChild(badge);
        el.appendChild(label);

        // Click on pin -> triggers timeline synchronization
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectWaypoint(wp.id);
          map.flyTo({
            center: [wp.lng, wp.lat],
            zoom: Math.max(map.getZoom(), 14),
            duration: 600,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .addTo(map);

        entry = { marker, element: el };
        markersRef.current.set(wp.id, entry);
      } else {
        // Update position if changed
        entry.marker.setLngLat([wp.lng, wp.lat]);
      }
    });
  }, [waypoints, mapLoaded, onSelectWaypoint]);

  // Update active marker styling and flyTo when activeActivityId changes
  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      const badge = element.querySelector("button");
      if (!badge) return;

      const isActive = id === activeActivityId;
      if (isActive) {
        badge.classList.add("ring-4", "ring-primary/40", "scale-125");
        element.style.zIndex = "50";
      } else {
        badge.classList.remove("ring-4", "ring-primary/40", "scale-125");
        element.style.zIndex = "10";
      }
    });

    // Fly to active waypoint
    if (activeActivityId && mapInstanceRef.current && mapLoaded) {
      const activeWp = waypoints.find((w) => w.id === activeActivityId);
      if (activeWp) {
        mapInstanceRef.current.flyTo({
          center: [activeWp.lng, activeWp.lat],
          zoom: Math.max(mapInstanceRef.current.getZoom(), 14),
          duration: 600,
        });
      }
    }
  }, [activeActivityId, waypoints, mapLoaded]);

  // Handle Zoom In / Out / Reset
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-surface-container-high/40 bg-surface-container-lowest shadow-2xs ${className}`}
    >
      {/* Map Header / Controls */}
      <div className="flex items-center justify-between border-b border-surface-container-high/30 px-4 py-3 bg-surface-container-low/40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">
            explore
          </span>
          <h3 className="text-sm font-bold text-on-surface">
            Interactive Route Vector
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
            {waypoints.length} stops
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="size-7 rounded-lg bg-surface border border-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="size-7 rounded-lg bg-surface border border-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={fitToWaypoints}
            className="size-7 rounded-lg bg-surface border border-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Fit Day Route"
            aria-label="Fit Day Route"
          >
            <span className="material-symbols-outlined text-[16px]">crop_free</span>
          </button>
        </div>
      </div>

      {/* Main Vector Map Surface */}
      <div className="relative w-full h-84 overflow-hidden bg-surface-container">
        {webGlSupported ? (
          <div ref={mapContainerRef} className="size-full" />
        ) : (
          /* Graceful SVG Fallback for environments without WebGL context */
          <div className="size-full flex flex-col items-center justify-center p-6 text-center">
            <span className="material-symbols-outlined text-[36px] text-primary mb-2">
              map
            </span>
            <p className="text-xs font-semibold text-on-surface mb-1">
              Vector Map Preview for {destination}
            </p>
            <p className="text-[11px] text-on-surface-variant max-w-xs">
              {waypoints.length} waypoints synchronized with your itinerary schedule.
            </p>
          </div>
        )}

        {/* Offline Badge pill */}
        {isOffline && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container/90 text-on-secondary-container text-[11px] font-semibold backdrop-blur-xs shadow-xs">
            <span className="material-symbols-outlined text-[14px]">offline_pin</span>
            <span>Offline Cached Vector</span>
          </div>
        )}

        {/* Map Attribution */}
        <div className="pointer-events-none absolute bottom-1 right-2 z-10 rounded bg-surface/80 px-1.5 py-0.5 text-[9px] text-on-surface-variant/80 backdrop-blur-xs">
          © OpenStreetMap, © Geoapify
        </div>
      </div>

      {/* Transit Route Legs & Distance Badges Strip */}
      <div className="p-4 flex flex-col gap-3 border-t border-surface-container-high/30 bg-surface-container-low/20">
        {/* Day Total Summary Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-surface-container-low rounded-xl p-3 flex flex-col border border-surface-container-high/40">
            <span className="text-[10px] text-on-surface-variant uppercase font-semibold">
              Transit Coverage
            </span>
            <span className="text-base font-bold text-primary mt-0.5">
              {totalMetrics.km}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {totalMetrics.legsCount} transit legs scheduled
            </span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 flex flex-col border border-surface-container-high/40">
            <span className="text-[10px] text-on-surface-variant uppercase font-semibold">
              Transit Time
            </span>
            <span className="text-base font-bold text-tertiary mt-0.5">
              {totalMetrics.time}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              Walking, rail &amp; high-speed transit
            </span>
          </div>
        </div>

        {/* Individual Consecutive Legs Badges */}
        {computedLegs.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Consecutive Transit Segments:
            </span>
            <div className="flex flex-wrap gap-2">
              {computedLegs.map((leg, idx) => {
                const dist = leg.distanceMeters ?? 0;
                const dur =
                  leg.durationSeconds ??
                  Math.round(dist / (leg.mode === "walk" ? 1.3 : leg.mode === "shinkansen" ? 55 : 12));
                const badge = formatLegBadgeText(leg.mode || "walk", dist, dur);
                const color = getTransitModeColor(leg.mode || "walk");

                return (
                  <div
                    key={`leg-badge-${leg.fromId}-${leg.toId}-${idx}`}
                    style={{ borderColor: `${color}40` }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border text-[11px] font-medium text-on-surface shadow-2xs"
                  >
                    <span
                      style={{ color }}
                      className="material-symbols-outlined text-[15px]"
                    >
                      {badge.icon}
                    </span>
                    <span className="font-semibold text-on-surface">{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}