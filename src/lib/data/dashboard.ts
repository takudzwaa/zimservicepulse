import { applyFilters, loadRequests } from "@/lib/data/loadRequests";
import {
  districtSummary,
  filterContextLabel,
  groupSummary,
  kpis,
  monthTrend,
} from "@/lib/metrics";
import { generateInsights, prioritise } from "@/lib/insights";
import { forecastNextMonth } from "@/lib/forecast";
import {
  backlogAging,
  channelRoi,
  cohortCompare,
  risingBacklogAlert,
} from "@/lib/analysis";
import type { FilterState, InsightKind, ServiceRequestRow } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";
import { readFileSync } from "fs";
import path from "path";

export function getAllRows() {
  return loadRequests();
}

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FilterState {
  const multi = (key: string): string[] => {
    const v = searchParams[key];
    if (!v) return [];
    const raw = Array.isArray(v) ? v.join(",") : v;
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };
  return {
    provinces: multi("provinces"),
    districts: multi("districts"),
    settlementTypes: multi("settlementTypes"),
    categories: multi("categories"),
    channels: multi("channels"),
    priorities: multi("priorities"),
    months: multi("months"),
  };
}

export function computeDashboard(
  rows: ServiceRequestRow[],
  filters: FilterState = EMPTY_FILTERS,
  focus: InsightKind | null = null,
) {
  const filtered = applyFilters(rows, filters);
  const kpi = kpis(filtered);
  const districts = districtSummary(filtered);
  const insights = prioritise(generateInsights(filtered), focus);
  return {
    filtered,
    kpi,
    districts,
    insights,
    categories: groupSummary(filtered, "service_category"),
    channels: groupSummary(filtered, "primary_channel"),
    settlements: groupSummary(filtered, "settlement_type"),
    trends: monthTrend(filtered),
    context: filterContextLabel(filters),
    forecast: forecastNextMonth(filtered),
    channelRoi: channelRoi(filtered),
    aging: backlogAging(filtered),
    rising: risingBacklogAlert(filtered),
  };
}

export function compareCohorts(
  rows: ServiceRequestRow[],
  aKey: "province" | "district" | "settlement_type",
  aValue: string,
  bValue: string,
) {
  const a = rows.filter((r) => r[aKey] === aValue);
  const b = rows.filter((r) => r[aKey] === bValue);
  return cohortCompare(a, b, aValue, bValue);
}

export function loadProvinceGeojson(): GeoJSON.FeatureCollection | null {
  try {
    const p = path.join(process.cwd(), "public", "geo", "zw_provinces.geojson");
    return JSON.parse(readFileSync(p, "utf8")) as GeoJSON.FeatureCollection;
  } catch {
    return null;
  }
}
