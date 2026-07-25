"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterState, ServiceRequestRow, DistrictSummary, GroupSummary, MonthTrend, Insight, Kpis } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { KpiRibbon } from "@/components/dashboard/kpi-ribbon";
import { HotspotMap } from "@/components/map/hotspot-map";
import { RankingCharts } from "@/components/charts/ranking-charts";
import { InsightCards } from "@/components/dashboard/insight-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function filtersToQuery(f: FilterState): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string[]) => {
    if (v.length) p.set(k, v.join(","));
  };
  set("provinces", f.provinces);
  set("districts", f.districts);
  set("settlementTypes", f.settlementTypes);
  set("categories", f.categories);
  set("channels", f.channels);
  set("priorities", f.priorities);
  set("months", f.months);
  return p.toString();
}

export function ExploreClient({
  rows,
  initialFilters,
  kpi,
  districts,
  categories,
  channels,
  settlements,
  trends,
  insights,
  geojson,
  presets,
}: {
  rows: ServiceRequestRow[];
  initialFilters: FilterState;
  kpi: Kpis;
  districts: DistrictSummary[];
  categories: GroupSummary[];
  channels: GroupSummary[];
  settlements: GroupSummary[];
  trends: MonthTrend[];
  insights: Insight[];
  geojson: GeoJSON.FeatureCollection | null;
  presets: { id: string; name: string; filters: FilterState }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [presetName, setPresetName] = useState("");
  const [pending, startTransition] = useTransition();
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>(
    initialFilters.districts.length === 1 ? initialFilters.districts[0] : undefined,
  );

  function apply(next: FilterState) {
    setFilters(next);
    startTransition(() => {
      const q = filtersToQuery(next);
      router.push(q ? `/explore?${q}` : "/explore");
    });
  }

  async function savePreset() {
    if (!presetName.trim()) return;
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: presetName, filters }),
    });
    if (!res.ok) {
      toast.error("Could not save preset");
      return;
    }
    toast.success("Preset saved");
    setPresetName("");
    router.refresh();
  }

  const top = useMemo(() => districts.slice(0, 10), [districts]);
  const selected = districts.find((district) => district.district === selectedDistrict);
  const activeFilterCount = Object.values(filters).reduce((sum, value) => sum + value.length, 0);

  function selectDistrict(district: DistrictSummary) {
    setSelectedDistrict(district.district);
    apply({ ...filters, provinces: [district.province], districts: [district.district] });
  }

  function selectChart(
    selection:
      | { dimension: "categories"; value: string }
      | { dimension: "channels"; value: string }
      | { dimension: "settlements"; value: string }
      | { dimension: "months"; value: string },
  ) {
    const next = { ...filters };
    if (selection.dimension === "categories") next.categories = [selection.value];
    if (selection.dimension === "channels") next.channels = [selection.value];
    if (selection.dimension === "settlements") next.settlementTypes = [selection.value];
    if (selection.dimension === "months") next.months = [selection.value];
    apply(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Live filters update KPIs, map, rankings, and insights together.
          {pending ? " Updating…" : ""}
        </p>
      </div>

      <div className="rounded-xl border border-brand/10 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-brand">Data context</span>
          <Badge variant="secondary">{rows.length.toLocaleString()} monthly service records</Badge>
          {activeFilterCount ? <Badge variant="outline">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</Badge> : <span className="text-muted-foreground">National view · Jan–Jun 2026</span>}
          {activeFilterCount ? (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => {
              setSelectedDistrict(undefined);
              apply({ ...EMPTY_FILTERS });
            }}>
              Clear context
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <FilterPanel rows={rows} filters={filters} onChange={apply} />
          <div className="rounded-lg border bg-white p-3 space-y-2">
            <div className="text-sm font-semibold text-brand">Saved presets</div>
            <div className="flex gap-2">
              <Input
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Button type="button" onClick={savePreset} size="sm">
                Save
              </Button>
            </div>
            <div className="space-y-1">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="block w-full rounded-md border px-2 py-1.5 text-left text-xs hover:bg-secondary"
                  onClick={() => apply({ ...EMPTY_FILTERS, ...p.filters })}
                >
                  {p.name}
                </button>
              ))}
              {!presets.length ? (
                <p className="text-xs text-muted-foreground">No presets yet.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <KpiRibbon kpis={kpi} />
          <div className="grid gap-4 xl:grid-cols-2">
            <HotspotMap
              districts={districts}
              geojson={geojson}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={selectDistrict}
            />
            <RankingCharts
              categories={categories}
              channels={channels}
              settlements={settlements}
              trends={trends}
              onSelect={selectChart}
            />
          </div>
          {selected ? (
            <Card className="border-brand/20 bg-gradient-to-r from-brand/[0.06] to-white shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">District focus</div>
                  <div className="mt-1 font-brand text-xl font-semibold text-ink">{selected.district}, {selected.province}</div>
                  <p className="text-sm text-muted-foreground">Pressure {selected.pressure_score.toFixed(0)} · {selected.unresolved_backlog.toLocaleString()} unresolved · {selected.on_time_pct.toFixed(1)}% on time</p>
                </div>
                <Button variant="outline" onClick={() => {
                  setSelectedDistrict(undefined);
                  apply({ ...filters, districts: [], provinces: [] });
                }}>
                  Leave district focus
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <div className="rounded-lg border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-brand">
              Top 10 pressure districts
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Pressure</TableHead>
                  <TableHead>Backlog</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((d) => (
                  <TableRow key={d.district}>
                    <TableCell>{d.district}</TableCell>
                    <TableCell>{d.province}</TableCell>
                    <TableCell>{d.pressure_score.toFixed(0)}</TableCell>
                    <TableCell>{d.unresolved_backlog.toLocaleString()}</TableCell>
                    <TableCell>{d.urgent_flag}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <InsightCards insights={insights} />
          <p className="text-[11px] text-muted-foreground">
            Query: {searchParams.toString() || "(none)"}
          </p>
        </div>
      </div>
    </div>
  );
}
