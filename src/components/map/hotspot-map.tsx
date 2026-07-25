"use client";

import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Source, Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { DistrictSummary } from "@/lib/types";

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

const OFFLINE_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#eef3fa" },
    },
  ],
};

export function HotspotMap({
  districts,
  geojson,
  selectedDistrict,
  onSelectDistrict,
}: {
  districts: DistrictSummary[];
  geojson: GeoJSON.FeatureCollection | null;
  selectedDistrict?: string;
  onSelectDistrict?: (district: DistrictSummary) => void;
}) {
  const [offline, setOffline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const mappedDistricts = districts.filter(
    (district) => Number.isFinite(district.longitude) && Number.isFinite(district.latitude),
  );
  const maxReq = Math.max(...mappedDistricts.map((d) => d.requests_received), 1);

  const outline = useMemo(() => geojson, [geojson]);

  // MapLibre reads the browser's layout and WebGL state during construction.
  // Deferring construction until after mount avoids an undefined camera/center
  // during Next.js hydration.
  useEffect(() => setIsMounted(true), []);

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-brand">Pressure map</h3>
          <p className="text-[11px] text-muted-foreground">Select a district to inspect its service signals.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={offline} onCheckedChange={setOffline} id="offline-map" />
          <Label htmlFor="offline-map" className="text-xs">
            Offline map mode
          </Label>
        </div>
      </div>
      <div className="h-[420px] w-full">
        {isMounted ? <Map
          initialViewState={{ longitude: 29.5, latitude: -19.0, zoom: 5.4 }}
          mapStyle={offline ? OFFLINE_STYLE : OPEN_STREET_MAP_STYLE}
          maxBounds={[[24, -23.5], [34, -14.5]]}
          attributionControl={{}}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          {offline && outline ? (
            <Source id="provinces" type="geojson" data={outline}>
              <Layer
                id="province-fill"
                type="fill"
                paint={{ "fill-color": "#d6e4f2", "fill-opacity": 0.7 }}
              />
              <Layer
                id="province-line"
                type="line"
                paint={{ "line-color": "#2d619b", "line-width": 1 }}
              />
            </Source>
          ) : null}
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
                    boxShadow: selectedDistrict === d.district
                      ? "0 0 0 5px rgba(45,97,155,0.3)"
                      : d.has_urgent
                      ? "0 0 0 4px rgba(198,61,55,0.32)"
                      : undefined,
                  }}
                />
              </Marker>
            );
          })}
        </Map> : <div className="grid h-full place-items-center bg-slate-50 text-sm text-muted-foreground">Loading interactive map…</div>}
      </div>
      <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
        Bubble size = request volume. Colour = pressure score (blue → gold →
        red). Halo denotes either selection or top-quartile urgent backlog.
      </p>
    </div>
  );
}
