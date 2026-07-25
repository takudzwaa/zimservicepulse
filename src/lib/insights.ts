import {
  districtSummary,
  groupSummary,
  weightedMean,
} from "@/lib/metrics";
import type {
  Insight,
  InsightKind,
  Kpis,
  ServiceRequestRow,
} from "@/lib/types";

const CHANNEL_GAP_MIN_PTS = 5.0;
const SATISFACTION_FLOOR = 3.0;
const MIN_VOLUME_SHARE = 0.02;

function insightId(kind: string, title: string): string {
  const input = `${kind}:${title}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `${kind}-${hash.toString(16)}`;
}

export function prioritise(
  insights: Insight[],
  focus: InsightKind | null,
): Insight[] {
  const severityRank: Record<string, number> = { high: 0, medium: 1 };
  return [...insights].sort((a, b) => {
    const aBoost = focus && a.kind === focus ? 0 : 1;
    const bBoost = focus && b.kind === focus ? 0 : 1;
    if (aBoost !== bBoost) return aBoost - bBoost;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}

export function generateInsights(rows: ServiceRequestRow[]): Insight[] {
  if (rows.length === 0) return [];
  const total = rows.reduce((s, r) => s + r.requests_received, 0);
  if (total === 0) return [];

  const insights: Insight[] = [];
  for (const rule of [
    backlogLeader,
    channelGap,
    urgentConcentration,
    satisfactionFloor,
    slowResolution,
  ]) {
    const result = rule(rows);
    if (result) insights.push(result);
  }
  return prioritise(insights, null);
}

function backlogLeader(rows: ServiceRequestRow[]): Insight | null {
  const byCat = groupSummary(rows, "service_category");
  const totalBacklog = byCat.reduce((s, r) => s + r.unresolved_backlog, 0);
  if (totalBacklog === 0 || byCat.length < 2) return null;

  const top = byCat[0]!;
  const share = (top.unresolved_backlog / totalBacklog) * 100;
  const catRows = rows.filter((r) => r.service_category === top.key);
  const settlement = groupSummary(catRows, "settlement_type")[0]?.key ?? "mixed";
  const districtTotals = new Map<string, number>();
  for (const r of catRows) {
    districtTotals.set(
      r.district,
      (districtTotals.get(r.district) ?? 0) + r.unresolved_backlog,
    );
  }
  const topDistricts = [...districtTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
  const districtList = topDistricts.join(", ");

  const title = `${top.key} carries the largest backlog`;
  return {
    id: insightId("backlog", title),
    title,
    body: `**${top.key}** accounts for **${top.unresolved_backlog.toLocaleString()} unresolved cases** (${share.toFixed(0)}% of the current backlog), concentrated in ${settlement.toLowerCase()} areas. Worst-hit districts: ${districtList}.`,
    severity: share >= 25 ? "high" : "medium",
    action_title: `Deploy a ${top.key.toLowerCase()} backlog task-force`,
    action_body: `Redirect resolution capacity to ${districtList} (${settlement.toLowerCase()} focus) to clear the ${top.unresolved_backlog.toLocaleString()}-case backlog.`,
    kind: "backlog",
  };
}

function channelGap(rows: ServiceRequestRow[]): Insight | null {
  const minVol =
    rows.reduce((s, r) => s + r.requests_received, 0) * MIN_VOLUME_SHARE;
  let byCh = groupSummary(rows, "primary_channel").filter(
    (r) => r.requests_received >= minVol,
  );
  if (byCh.length < 2) return null;

  byCh = [...byCh].sort((a, b) => b.on_time_pct - a.on_time_pct);
  const best = byCh[0]!;
  const worst = byCh[byCh.length - 1]!;
  const gap = best.on_time_pct - worst.on_time_pct;
  if (gap < CHANNEL_GAP_MIN_PTS) return null;

  const title = `${best.key} outperforms ${worst.key} on timeliness`;
  return {
    id: insightId("channel", title),
    title,
    body: `Requests via **${best.key}** are resolved on time **${best.on_time_pct.toFixed(0)}%** of the time vs **${worst.on_time_pct.toFixed(0)}%** for ${worst.key} - a gap of ${gap.toFixed(0)} percentage points.`,
    severity: gap >= 15 ? "high" : "medium",
    action_title: `Shift demand toward ${best.key}`,
    action_body: `Promote ${best.key} for service requests and review the ${worst.key} workflow, which lags by ${gap.toFixed(0)} points on on-time resolution.`,
    kind: "channel",
  };
}

function urgentConcentration(rows: ServiceRequestRow[]): Insight | null {
  const urgent = rows.filter((r) => r.priority_flag === "Urgent");
  const totalUrgent = urgent.reduce((s, r) => s + r.unresolved_backlog, 0);
  if (totalUrgent === 0) return null;

  const byDistrict = new Map<string, number>();
  for (const r of urgent) {
    byDistrict.set(
      r.district,
      (byDistrict.get(r.district) ?? 0) + r.unresolved_backlog,
    );
  }
  const top = [...byDistrict.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topSum = top.reduce((s, [, v]) => s + v, 0);
  const share = (topSum / totalUrgent) * 100;
  const names = top.map(([d]) => d).join(", ");

  const title = "Urgent cases are concentrated in a few districts";
  return {
    id: insightId("urgent", title),
    title,
    body: `**${names}** hold **${topSum.toLocaleString()}** of the ${totalUrgent.toLocaleString()} urgent-flagged unresolved cases (${share.toFixed(0)}% of the urgent backlog).`,
    severity: "high",
    action_title: "Escalate the urgent-case districts",
    action_body: `Put ${names} on a daily escalation review until their combined ${topSum.toLocaleString()} urgent cases are cleared.`,
    kind: "urgent",
  };
}

function satisfactionFloor(rows: ServiceRequestRow[]): Insight | null {
  const ds = districtSummary(rows);
  if (ds.length === 0) return null;
  const minVol =
    rows.reduce((s, r) => s + r.requests_received, 0) * MIN_VOLUME_SHARE;
  const low = ds
    .filter((d) => d.satisfaction < SATISFACTION_FLOOR && d.requests_received >= minVol)
    .sort((a, b) => a.satisfaction - b.satisfaction)
    .slice(0, 3);
  if (low.length === 0) return null;

  const names = low
    .map((r) => `${r.district} (${r.satisfaction.toFixed(1)}/5)`)
    .join(", ");
  const title = "Citizen satisfaction is below 3/5 in some districts";
  return {
    id: insightId("satisfaction", title),
    title,
    body: `Weighted satisfaction falls below ${SATISFACTION_FLOOR.toFixed(0)}/5 in **${names}** despite meaningful request volumes.`,
    severity: "medium",
    action_title: "Run citizen-engagement follow-ups",
    action_body: `Commission community feedback sessions in ${low.map((d) => d.district).join(", ")} to identify the drivers of low satisfaction and set a recovery target.`,
    kind: "satisfaction",
  };
}

function slowResolution(rows: ServiceRequestRow[]): Insight | null {
  const minVol =
    rows.reduce((s, r) => s + r.requests_received, 0) * MIN_VOLUME_SHARE;
  const pairs: { district: string; category: string; days: number }[] = [];
  const groups = new Map<string, ServiceRequestRow[]>();
  for (const r of rows) {
    const key = `${r.district}||${r.service_category}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  for (const [key, group] of groups) {
    const vol = group.reduce((s, g) => s + g.requests_received, 0);
    if (vol < minVol) continue;
    const [district, category] = key.split("||");
    pairs.push({
      district: district!,
      category: category!,
      days: weightedMean(group, "avg_resolution_days"),
    });
  }
  if (pairs.length === 0) return null;

  const slowest = pairs.reduce((a, b) => (b.days > a.days ? b : a));
  const overall = weightedMean(rows, "avg_resolution_days");
  if (slowest.days < overall * 1.3) return null;

  const title = `${slowest.category} in ${slowest.district} is the slowest to resolve`;
  return {
    id: insightId("slow", title),
    title,
    body: `**${slowest.category}** requests in **${slowest.district}** take **${slowest.days.toFixed(1)} days** on average vs ${overall.toFixed(1)} days across the current selection.`,
    severity: "medium",
    action_title: `Process review: ${slowest.category} in ${slowest.district}`,
    action_body: `Audit the ${slowest.category.toLowerCase()} resolution workflow in ${slowest.district} to close the ${(slowest.days - overall).toFixed(1)}-day gap against the average.`,
    kind: "slow",
  };
}

export function toMarkdown(
  insights: Insight[],
  kpi: Kpis,
  context: string,
): string {
  const lines = [
    "# ZimServicePulse – Insight & Action Summary",
    `_Scope: ${context}_`,
    "",
    "## Key figures",
    `- Total requests: ${kpi.total_requests.toLocaleString()}`,
    `- Unresolved backlog: ${kpi.backlog.toLocaleString()} (${kpi.backlog_pct.toFixed(1)}%)`,
    `- Avg citizen satisfaction: ${kpi.satisfaction.toFixed(2)}/5`,
    `- Resolved on time: ${kpi.on_time_pct.toFixed(1)}%`,
    "",
    "## Insights",
  ];
  insights.forEach((ins, i) => {
    lines.push(
      `${i + 1}. **${ins.title}** (${ins.severity.toUpperCase()})`,
      `   ${ins.body}`,
      "",
    );
  });
  lines.push("## Recommended actions");
  insights.forEach((ins, i) => {
    lines.push(`${i + 1}. **${ins.action_title}** - ${ins.action_body}`);
  });
  return lines.join("\n").replace(/\*\*/g, "");
}
