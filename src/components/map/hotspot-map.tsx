"use client";

import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DistrictSummary } from "@/lib/types";

// MapLibre v6 requires an explicit worker URL under bundlers. Serve the
// worker (and its relative shared import) from /public/maplibre so the path
// is same-origin and does not depend on import.meta.url resolution.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

function pressureColor(score: number): string {
  if (score >= 70) return "#C63D37";
  if (score >= 40) return "#C9962D";
  return "#2D619B";
}

// A keyless, production map style backed by OpenStreetMap tiles. Keeping the
// style local means the map does not depend on MapLibre's demo service.
const OPEN_STREET_MAP_STYLE = {
  version: 8 as const,
  sources: {
    "open-street-map": {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    },
  },
  layers: [{ id: "open-street-map", type: "raster" as const, source: "open-street-map" }],
};

export function HotspotMap({
  districts,
  selectedDistrict,
  onSelectDistrict,
}: {
  districts: DistrictSummary[];
  selectedDistrict?: string;
  onSelectDistrict?: (district: DistrictSummary) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const mappedDistricts = districts.filter(
    (district) => Number.isFinite(district.longitude) && Number.isFinite(district.latitude),
  );
  const maxReq = Math.max(...mappedDistricts.map((d) => d.requests_received), 1);

  // MapLibre reads the browser's layout and WebGL state during construction.
  // Deferring construction until after mount avoids an undefined camera/center
  // during Next.js hydration.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold text-brand">Pressure map</h3>
        <p className="text-[11px] text-muted-foreground">
          Select a district to inspect its service signals.
        </p>
      </div>
      <div className="h-[420px] w-full">
        {isMounted ? (
          <Map
            initialViewState={{ longitude: 29.5, latitude: -19.0, zoom: 5.4 }}
            mapStyle={OPEN_STREET_MAP_STYLE}
            maxBounds={[
              [24, -23.5],
              [34, -14.5],
            ]}
            attributionControl={{}}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            {mappedDistricts.map((d) => {
              const size = 12 + (d.requests_received / maxReq) * 28;
              return (
                <Marker
                  key={d.district}
                  longitude={d.longitude}
                  latitude={d.latitude}
                  anchor="center"
                >
                  <button
                    type="button"
                    aria-label={`Inspect ${d.district}, pressure ${d.pressure_score.toFixed(0)}`}
                    title={`${d.district}: pressure ${d.pressure_score.toFixed(0)}, backlog ${d.unresolved_backlog.toLocaleString()}`}
                    onClick={() => onSelectDistrict?.(d)}
                    className="rounded-full border-2 border-white shadow transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    style={{
                      width: size,
                      height: size,
                      background: pressureColor(d.pressure_score),
                      boxShadow:
                        selectedDistrict === d.district
                          ? "0 0 0 5px rgba(45,97,155,0.3)"
                          : d.has_urgent
                            ? "0 0 0 4px rgba(198,61,55,0.32)"
                            : undefined,
                    }}
                  />
                </Marker>
              );
            })}
          </Map>
        ) : (
          <div className="grid h-full place-items-center bg-slate-50 text-sm text-muted-foreground">
            Loading interactive map…
          </div>
        )}
      </div>
      <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
        Bubble size = request volume. Colour = pressure score (blue → gold →
        red). Halo denotes either selection or top-quartile urgent backlog.
      </p>
    </div>
  );
}
