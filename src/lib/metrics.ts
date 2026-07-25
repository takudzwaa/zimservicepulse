import type {
  DistrictSummary,
  GroupSummary,
  Kpis,
  MonthTrend,
  ServiceRequestRow,
} from "@/lib/types";
import { PRIORITY_ORDER } from "@/lib/types";

export function weightedMean(
  rows: ServiceRequestRow[],
  valueKey:
    | "citizen_satisfaction_1_5"
    | "pct_resolved_on_time"
    | "avg_resolution_days",
  weightKey: "requests_received" = "requests_received",
): number {
  let weightSum = 0;
  let weighted = 0;
  for (const row of rows) {
    const w = row[weightKey];
    weightSum += w;
    weighted += row[valueKey] * w;
  }
  if (weightSum === 0) return Number.NaN;
  return weighted / weightSum;
}

export function kpis(rows: ServiceRequestRow[]): Kpis {
  const total = rows.reduce((s, r) => s + r.requests_received, 0);
  const backlog = rows.reduce((s, r) => s + r.unresolved_backlog, 0);
  const resolved = rows.reduce((s, r) => s + r.requests_resolved, 0);
  return {
    total_requests: total,
    backlog,
    backlog_pct: total ? (backlog / total) * 100 : Number.NaN,
    resolution_rate: total ? (resolved / total) * 100 : Number.NaN,
    satisfaction: weightedMean(rows, "citizen_satisfaction_1_5"),
    on_time_pct: weightedMean(rows, "pct_resolved_on_time"),
  };
}

function minmax(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (!Number.isFinite(range) || range === 0) {
    return values.map(() => 0);
  }
  return values.map((v) => (v - min) / range);
}

function statusFromPriority(group: ServiceRequestRow[]): string {
  const byFlag = new Map<string, number>();
  for (const row of group) {
    byFlag.set(
      row.priority_flag,
      (byFlag.get(row.priority_flag) ?? 0) + row.unresolved_backlog,
    );
  }
  if (byFlag.size === 0) return "";
  const maxBacklog = Math.max(...byFlag.values());
  const tied = new Set(
    [...byFlag.entries()]
      .filter(([, v]) => v === maxBacklog)
      .map(([k]) => k),
  );
  for (const level of PRIORITY_ORDER) {
    if (tied.has(level)) return level;
  }
  return [...byFlag.keys()][0] ?? "";
}

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? "";
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function districtSummary(rows: ServiceRequestRow[]): DistrictSummary[] {
  const groups = new Map<string, ServiceRequestRow[]>();
  for (const row of rows) {
    const key = `${row.district}||${row.province}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const summaries: Omit<
    DistrictSummary,
    "pressure_score" | "urgent_share" | "has_urgent"
  >[] = [];

  for (const group of groups.values()) {
    const first = group[0]!;
    summaries.push({
      district: first.district,
      province: first.province,
      settlement_type: mode(group.map((g) => g.settlement_type)),
      latitude: group.reduce((s, g) => s + g.latitude, 0) / group.length,
      longitude: group.reduce((s, g) => s + g.longitude, 0) / group.length,
      requests_received: group.reduce((s, g) => s + g.requests_received, 0),
      unresolved_backlog: group.reduce((s, g) => s + g.unresolved_backlog, 0),
      satisfaction: weightedMean(group, "citizen_satisfaction_1_5"),
      on_time_pct: weightedMean(group, "pct_resolved_on_time"),
      avg_resolution_days: weightedMean(group, "avg_resolution_days"),
      urgent_backlog: group
        .filter((g) => g.priority_flag === "Urgent")
        .reduce((s, g) => s + g.unresolved_backlog, 0),
      urgent_flag: statusFromPriority(group),
    });
  }

  if (summaries.length === 0) return [];

  const backlogNorm = minmax(summaries.map((s) => s.unresolved_backlog));
  const lateNorm = minmax(summaries.map((s) => 100 - s.on_time_pct));
  const satNorm = minmax(summaries.map((s) => 5 - s.satisfaction));

  const urgentBacklogs = summaries.map((s) => s.urgent_backlog);
  const positiveUrgent = urgentBacklogs.filter((v) => v > 0);
  const threshold =
    positiveUrgent.length > 0
      ? quantile(positiveUrgent.length ? urgentBacklogs : [0], 0.75)
      : 0;

  const out: DistrictSummary[] = summaries.map((s, i) => ({
    ...s,
    pressure_score:
      (0.5 * backlogNorm[i]! + 0.25 * lateNorm[i]! + 0.25 * satNorm[i]!) * 100,
    urgent_share:
      s.unresolved_backlog > 0
        ? (s.urgent_backlog / s.unresolved_backlog) * 100
        : 0,
    has_urgent:
      positiveUrgent.length > 0 &&
      s.urgent_backlog >= Math.max(threshold, 1),
  }));

  return out.sort((a, b) => b.pressure_score - a.pressure_score);
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base]!;
  return sorted[base]! + rest * (next - sorted[base]!);
}

export function monthTrend(rows: ServiceRequestRow[]): MonthTrend[] {
  const byMonth = new Map<string, ServiceRequestRow[]>();
  for (const row of rows) {
    const list = byMonth.get(row.month) ?? [];
    list.push(row);
    byMonth.set(row.month, list);
  }
  return [...byMonth.keys()]
    .sort()
    .map((month) => {
      const k = kpis(byMonth.get(month)!);
      return {
        month,
        requests_received: k.total_requests,
        unresolved_backlog: k.backlog,
        satisfaction: k.satisfaction,
        on_time_pct: k.on_time_pct,
      };
    });
}

export function groupSummary(
  rows: ServiceRequestRow[],
  by:
    | "service_category"
    | "primary_channel"
    | "settlement_type"
    | "province"
    | "district"
    | "priority_flag",
): GroupSummary[] {
  const groups = new Map<string, ServiceRequestRow[]>();
  for (const row of rows) {
    const key = row[by];
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      requests_received: group.reduce((s, g) => s + g.requests_received, 0),
      unresolved_backlog: group.reduce((s, g) => s + g.unresolved_backlog, 0),
      satisfaction: weightedMean(group, "citizen_satisfaction_1_5"),
      on_time_pct: weightedMean(group, "pct_resolved_on_time"),
      avg_resolution_days: weightedMean(group, "avg_resolution_days"),
    }))
    .sort((a, b) => b.unresolved_backlog - a.unresolved_backlog);
}

export function filterContextLabel(filters: {
  provinces?: string[];
  districts?: string[];
  settlementTypes?: string[];
  categories?: string[];
  channels?: string[];
  priorities?: string[];
  months?: string[];
}): string {
  const parts: string[] = [];
  const push = (label: string, values?: string[]) => {
    if (values?.length) parts.push(`${label}: ${values.join(", ")}`);
  };
  push("Provinces", filters.provinces);
  push("Districts", filters.districts);
  push("Settlement", filters.settlementTypes);
  push("Categories", filters.categories);
  push("Channels", filters.channels);
  push("Priority", filters.priorities);
  push("Months", filters.months);
  return parts.length ? parts.join(" · ") : "National scope (all filters clear)";
}
