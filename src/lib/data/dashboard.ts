import { applyFilters, loadRequests, parseRequestsCsv } from "@/lib/data/loadRequests";
import { and, desc, eq } from "drizzle-orm";
import type { AccessUser } from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import { authorityDatasets } from "@/lib/db/schema";
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

export function getAllRows() {
  return loadRequests();
}

/**
 * Authority dataset rows are immutable per `id` (a new upload always gets a
 * new id/version), so parsed CSVs can be cached for the life of this
 * process instead of re-parsing on every request.
 */
const parsedAuthorityDatasetCache = new Map<
  string,
  ReturnType<typeof parseRequestsCsv>
>();

export async function getRowsForUser(user: AccessUser) {
  if (user.authorityId) {
    await ensureSchema();
    const db = await getDb();
    const [active] = await db
      .select()
      .from(authorityDatasets)
      .where(
        and(
          eq(authorityDatasets.authorityId, user.authorityId),
          eq(authorityDatasets.datasetType, "service_requests"),
          eq(authorityDatasets.status, "active"),
        ),
      )
      .orderBy(desc(authorityDatasets.version))
      .limit(1);
    if (active) {
      const cached = parsedAuthorityDatasetCache.get(active.id);
      if (cached) return cached;
      const result = parseRequestsCsv(active.csvText);
      parsedAuthorityDatasetCache.set(active.id, result);
      return result;
    }
    // No active dataset for this authority: never fall back to the
    // national platform CSV for an authority-scoped user, in any
    // environment — that would leak national data into a scoped view.
    return { rows: [], excluded: 0 };
  }
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
