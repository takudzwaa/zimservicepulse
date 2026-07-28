import { groupSummary, kpis, weightedMean } from "@/lib/metrics";
import type { Kpis, ServiceRequestRow } from "@/lib/types";

export interface CohortCompareResult {
  a: { label: string; kpis: Kpis };
  b: { label: string; kpis: Kpis };
  deltas: {
    backlog_pct: number;
    satisfaction: number;
    on_time_pct: number;
    total_requests: number;
  };
}

export interface ChannelRoi {
  channel: string;
  requests_received: number;
  resolution_rate: number;
  on_time_pct: number;
  satisfaction: number;
  roi_score: number;
}

export interface AgingBucket {
  bucket: string;
  requests_received: number;
  unresolved_backlog: number;
  share_pct: number;
}

export function cohortCompare(
  rowsA: ServiceRequestRow[],
  rowsB: ServiceRequestRow[],
  labelA: string,
  labelB: string,
): CohortCompareResult {
  const a = kpis(rowsA);
  const b = kpis(rowsB);
  return {
    a: { label: labelA, kpis: a },
    b: { label: labelB, kpis: b },
    deltas: {
      backlog_pct: a.backlog_pct - b.backlog_pct,
      satisfaction: a.satisfaction - b.satisfaction,
      on_time_pct: a.on_time_pct - b.on_time_pct,
      total_requests: a.total_requests - b.total_requests,
    },
  };
}

export function channelRoi(rows: ServiceRequestRow[]): ChannelRoi[] {
  const groups = groupSummary(rows, "primary_channel");
  const scored = groups.map((g) => {
    const subset = rows.filter((r) => r.primary_channel === g.key);
    const total = g.requests_received || 1;
    const resolved = subset.reduce((s, r) => s + r.requests_resolved, 0);
    const resolution_rate = (resolved / total) * 100;
    // A zero-volume channel yields NaN on_time_pct/satisfaction (weightedMean's
    // 0/0 guard); scoring it 0 instead of NaN keeps it from poisoning the
    // Math.max(...) normalisation below for every other channel.
    const raw =
      g.requests_received === 0
        ? 0
        : (resolution_rate / 100) * (g.on_time_pct / 100) * (g.satisfaction / 5);
    return {
      channel: g.key,
      requests_received: g.requests_received,
      resolution_rate,
      on_time_pct: g.on_time_pct,
      satisfaction: g.satisfaction,
      roi_score: raw * 100,
    };
  });
  const max = Math.max(...scored.map((s) => s.roi_score), 1);
  return scored
    .map((s) => ({ ...s, roi_score: (s.roi_score / max) * 100 }))
    .sort((a, b) => b.roi_score - a.roi_score);
}

export function backlogAging(rows: ServiceRequestRow[]): AgingBucket[] {
  const buckets = [
    { bucket: "0–3 days", min: 0, max: 3 },
    { bucket: "3–5 days", min: 3, max: 5 },
    { bucket: "5–7 days", min: 5, max: 7 },
    { bucket: "7+ days", min: 7, max: Infinity },
  ];
  const totalBacklog = rows.reduce((s, r) => s + r.unresolved_backlog, 0) || 1;
  return buckets.map(({ bucket, min, max }) => {
    const subset = rows.filter(
      (r) => r.avg_resolution_days >= min && r.avg_resolution_days < max,
    );
    const unresolved_backlog = subset.reduce(
      (s, r) => s + r.unresolved_backlog,
      0,
    );
    return {
      bucket,
      requests_received: subset.reduce((s, r) => s + r.requests_received, 0),
      unresolved_backlog,
      share_pct: (unresolved_backlog / totalBacklog) * 100,
    };
  });
}

export function risingBacklogAlert(
  rows: ServiceRequestRow[],
): { rising: boolean; delta: number; latest: number; previous: number } | null {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    byMonth.set(
      r.month,
      (byMonth.get(r.month) ?? 0) + r.unresolved_backlog,
    );
  }
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return null;
  const latest = byMonth.get(months[months.length - 1]!)!;
  const previous = byMonth.get(months[months.length - 2]!)!;
  const delta = latest - previous;
  return { rising: delta > 0, delta, latest, previous };
}

export function volumeWeightedDays(rows: ServiceRequestRow[]): number {
  return weightedMean(rows, "avg_resolution_days");
}
