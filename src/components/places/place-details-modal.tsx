"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaceDetails } from "@/lib/geoapify/types";

interface PlaceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  details: PlaceDetails | null;
  error: string | null;
  onViewOnMap?: (lat: number, lon: number) => void;
}

export function PlaceDetailsModal({
  open,
  onClose,
  title,
  details,
  error,
  onViewOnMap,
}: PlaceDetailsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-details-title"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md p-4"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="rounded-panel border border-border-subtle bg-surface p-6 shadow-elevation-2">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="place-details-title"
              className="text-lg font-semibold text-text-primary"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-error-bg border border-error-fg bg-error-bg p-3 text-xs text-error-fg">
              {error}
            </div>
          )}

          {details ? (
            <>
              <p className="text-sm text-text-secondary truncate">
                {details.formatted}
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 size-5 text-text-muted">
                    📍
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Coordinates
                    </p>
                    <p className="text-xs text-text-muted">
                      {details.location.lat.toFixed(4)},{' '}
                      {details.location.lon.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="shrink-0 size-5 text-text-muted">
                    🏷️
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Categories
                    </p>
                    <p className="text-xs text-text-muted">
                      {details.categories.join(", ") || "—"}
                    </p>
                  </div>
                </div>

                {details.address.country || details.address.city ? (
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 size-5 text-text-muted">
                      🏠
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        Address
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {[
                          details.address.street,
                          details.address.city,
                          details.address.state,
                          details.address.postcode,
                          details.address.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                ) : null}

                {details.timezone ? (
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 size-5 text-text-muted">
                      🕒
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        Time zone
                      </p>
                      <p className="text-xs text-text-muted">
                        {details.timezone}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {onViewOnMap && details.location && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() =>
                      onViewOnMap(
                        details.location.lat,
                        details.location.lon,
                      )
                    }
                  >
                    View on map
                  </Button>
                </div>
              )}
            </>
          ) : !error ? (
            <p className="mt-4 text-sm text-text-muted">
              No details available for this place.
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
