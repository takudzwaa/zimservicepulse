/**
 * Named, transparent algorithms used across ZimServicePulse.
 * Designed so operators can inspect and explain exactly what is working.
 */

import { forecastNextMonth } from "@/lib/forecast";
import { generateInsights } from "@/lib/insights";
import {
  districtSummary,
  groupSummary,
  kpis,
  weightedMean,
} from "@/lib/metrics";
import type { Insight, ServiceRequestRow } from "@/lib/types";

export type AlgorithmId =
  | "pulse-pressure"
  | "insight-forge"
  | "trendcast-ols"
  | "hotspot-rank"
  | "channel-roi"
  | "complaint-triage"
  | "dataset-quality";

export type AlgorithmMeta = {
  id: AlgorithmId;
  name: string;
  shortName: string;
  family: "Scoring" | "Rules engine" | "Forecasting" | "Ranking" | "NLP assist" | "Quality";
  formula: string;
  whereItRuns: string;
  whyItMatters: string;
};

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "pulse-pressure",
    name: "PulsePressure™ Score",
    shortName: "PulsePressure™",
    family: "Scoring",
    formula:
      "pressure = 100 × (0.50 · norm(backlog) + 0.25 · norm(1 − on-time) + 0.25 · norm(1 − satisfaction/5)) with min–max normalisation per district cohort",
    whereItRuns: "Hotspot map colour/size, top-pressure tables, district pulse",
    whyItMatters:
      "One defendable ranking of where service delivery is under the most stress — not a black box.",
  },
  {
    id: "insight-forge",
    name: "InsightForge Rules Engine",
    shortName: "InsightForge",
    family: "Rules engine",
    formula:
      "Five deterministic rules: BacklogLeader, ChannelGap (≥5pt on-time delta), UrgentConcentration (top-quartile urgent share), SatisfactionFloor (<3.0 weighted), SlowResolution (highest weighted days)",
    whereItRuns: "Insights cards, recommended actions, briefing exports, workflow sync",
    whyItMatters:
      "Every insight is traceable to filtered data with a named action in a named place.",
  },
  {
    id: "trendcast-ols",
    name: "TrendCast OLS Projector",
    shortName: "TrendCast OLS",
    family: "Forecasting",
    formula:
      "Ordinary least-squares linear regression over last ≤6 monthly weighted KPIs: next = intercept + slope · n",
    whereItRuns: "Analysis forecast chart, provincial analyst desk, AI lab",
    whyItMatters:
      "Transparent next-month projection of backlog, on-time %, and satisfaction — analysts can recompute the slope.",
  },
  {
    id: "hotspot-rank",
    name: "HotspotRank Prioritiser",
    shortName: "HotspotRank",
    family: "Ranking",
    formula:
      "Sort districts by PulsePressure™ desc; flag urgent when urgent_backlog ≥ P75 of positive urgent volumes",
    whereItRuns: "Explore map, command center alerts, district tables",
    whyItMatters: "Tells crews which districts to visit first tomorrow morning.",
  },
  {
    id: "channel-roi",
    name: "ChannelROI Composite",
    shortName: "ChannelROI",
    family: "Scoring",
    formula:
      "roi = 100 × minmax(resolution_rate × on_time_pct/100 × satisfaction/5) across channels with volume weight",
    whereItRuns: "Channel lead desk, ranking charts, channel strategy actions",
    whyItMatters:
      "Shows which citizen channels repay capacity — promote high-ROI digital paths.",
  },
  {
    id: "complaint-triage",
    name: "ComplaintTriage Assist",
    shortName: "ComplaintTriage",
    family: "NLP assist",
    formula:
      "priority_score = keyword urgency weight + category pressure weight + length/clarity signal; maps to High / Medium / Low with human-readable rationale",
    whereItRuns: "Citizen complaint intake, council inbox, complaints center",
    whyItMatters:
      "AI is felt at the moment of submission — citizens and councils see an immediate priority signal.",
  },
  {
    id: "dataset-quality",
    name: "DataQuality Guard",
    shortName: "DataQuality Guard",
    family: "Quality",
    formula:
      "score = 100 − penalties for missing required columns, null rate, coordinate out-of-bounds, resolved>received, empty rows",
    whereItRuns: "Local authority dataset upload hub",
    whyItMatters:
      "Councils only activate clean datasets — protects every downstream algorithm.",
  },
];

export function getAlgorithm(id: AlgorithmId): AlgorithmMeta {
  return ALGORITHMS.find((a) => a.id === id)!;
}

const URGENCY_KEYWORDS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /\b(no water|burst pipe|sewage|flood|collapse|accident|fire|danger)\b/i, weight: 35, label: "safety/urgency language" },
  { pattern: /\b(days?|weeks?|months?|since yesterday|still waiting)\b/i, weight: 18, label: "duration signal" },
  { pattern: /\b(urgent|emergency|critical|immediately)\b/i, weight: 28, label: "explicit urgency" },
  { pattern: /\b(clinic|school|hospital|elderly|children)\b/i, weight: 15, label: "vulnerable-service context" },
  { pattern: /\b(smell|leak|pothole|rubbish|dump|blocked)\b/i, weight: 10, label: "service defect language" },
];

const CATEGORY_PRESSURE: Record<string, number> = {
  "Water & sanitation": 22,
  "Roads & transport": 16,
  "Waste management": 18,
  "Business licensing": 8,
  "Social protection": 14,
  "Citizen documentation": 10,
};

export type ComplaintTriageResult = {
  algorithm: string;
  score: number;
  priority: "high" | "medium" | "low";
  rationale: string;
  signals: string[];
};

export function scoreComplaintTriage(input: {
  description: string;
  category: string;
  locationDetail?: string | null;
}): ComplaintTriageResult {
  const text = `${input.description} ${input.locationDetail ?? ""}`.trim();
  const signals: string[] = [];
  let score = 12;

  for (const rule of URGENCY_KEYWORDS) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
      signals.push(rule.label);
    }
  }

  const catBoost = CATEGORY_PRESSURE[input.category] ?? 10;
  score += catBoost;
  signals.push(`category baseline (${input.category})`);

  const len = input.description.trim().length;
  if (len >= 80) {
    score += 8;
    signals.push("detailed description");
  } else if (len < 25) {
    score -= 6;
    signals.push("short description (lower confidence)");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const priority: ComplaintTriageResult["priority"] =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    algorithm: "ComplaintTriage Assist",
    score,
    priority,
    rationale: `ComplaintTriage Assist scored this ${score}/100 (${priority} priority) from ${signals.join("; ")}.`,
    signals,
  };
}

export type DatasetValidation = {
  algorithm: string;
  score: number;
  rowCount: number;
  columns: string[];
  requiredPresent: string[];
  missingRequired: string[];
  issues: string[];
  sampleRows: Record<string, string>[];
  status: "validated" | "needs_attention";
};

const REQUIRED_DATASET_COLS = [
  "month",
  "province",
  "district",
  "service_category",
  "requests_received",
  "unresolved_backlog",
] as const;

export function validateAuthorityDataset(
  headers: string[],
  rows: Record<string, string>[],
): DatasetValidation {
  const columns = headers.map((h) => h.trim()).filter(Boolean);
  const lower = new Map(columns.map((c) => [c.toLowerCase(), c]));
  const requiredPresent: string[] = [];
  const missingRequired: string[] = [];
  const issues: string[] = [];
  let score = 100;

  for (const req of REQUIRED_DATASET_COLS) {
    if (lower.has(req)) requiredPresent.push(req);
    else {
      missingRequired.push(req);
      score -= 12;
    }
  }

  if (rows.length === 0) {
    issues.push("No data rows found");
    score -= 40;
  }

  let nullish = 0;
  let resolvedGtReceived = 0;
  let outOfBounds = 0;
  const latKey = lower.get("latitude");
  const lonKey = lower.get("longitude");
  const recvKey = lower.get("requests_received");
  const resKey = lower.get("requests_resolved");

  for (const row of rows.slice(0, 500)) {
    for (const col of requiredPresent) {
      const key = lower.get(col)!;
      if (!String(row[key] ?? "").trim()) nullish += 1;
    }
    if (recvKey && resKey) {
      const recv = Number(row[recvKey]);
      const res = Number(row[resKey]);
      if (Number.isFinite(recv) && Number.isFinite(res) && res > recv) {
        resolvedGtReceived += 1;
      }
    }
    if (latKey && lonKey) {
      const lat = Number(row[latKey]);
      const lon = Number(row[lonKey]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        if (lat < -22.5 || lat > -15.5 || lon < 25.2 || lon > 33.1) {
          outOfBounds += 1;
        }
      }
    }
  }

  if (nullish > 0) {
    issues.push(`${nullish} empty required cells in sample`);
    score -= Math.min(25, Math.ceil(nullish / 5));
  }
  if (resolvedGtReceived > 0) {
    issues.push(`${resolvedGtReceived} rows with resolved > received`);
    score -= Math.min(15, resolvedGtReceived);
  }
  if (outOfBounds > 0) {
    issues.push(`${outOfBounds} coordinates outside Zimbabwe bounds`);
    score -= Math.min(10, outOfBounds);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    algorithm: "DataQuality Guard",
    score,
    rowCount: rows.length,
    columns,
    requiredPresent,
    missingRequired,
    issues,
    sampleRows: rows.slice(0, 5),
    status: score >= 70 && missingRequired.length === 0 ? "validated" : "needs_attention",
  };
}

export type ChannelRoiRow = {
  channel: string;
  requests_received: number;
  on_time_pct: number;
  satisfaction: number;
  resolution_rate: number;
  roi_score: number;
};

export function computeChannelRoi(rows: ServiceRequestRow[]): ChannelRoiRow[] {
  const groups = groupSummary(rows, "primary_channel");
  const raw = groups.map((g) => {
    const channelRows = rows.filter((r) => r.primary_channel === g.key);
    const received = g.requests_received;
    const resolved = channelRows.reduce((s, r) => s + r.requests_resolved, 0);
    const resolution_rate = received ? (resolved / received) * 100 : 0;
    const composite =
      (resolution_rate / 100) * (g.on_time_pct / 100) * (g.satisfaction / 5);
    return {
      channel: g.key,
      requests_received: received,
      on_time_pct: g.on_time_pct,
      satisfaction: g.satisfaction,
      resolution_rate,
      composite,
    };
  });
  const values = raw.map((r) => r.composite);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  return raw
    .map((r) => ({
      channel: r.channel,
      requests_received: r.requests_received,
      on_time_pct: r.on_time_pct,
      satisfaction: r.satisfaction,
      resolution_rate: r.resolution_rate,
      roi_score: ((r.composite - min) / range) * 100,
    }))
    .sort((a, b) => b.roi_score - a.roi_score);
}

export type LiveAlgorithmRun = {
  meta: AlgorithmMeta;
  status: "ready";
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  outputs?: Insight[] | ChannelRoiRow[] | ReturnType<typeof districtSummary>;
  formula: string;
};

export function runLiveAlgorithms(rows: ServiceRequestRow[]): LiveAlgorithmRun[] {
  const kpi = kpis(rows);
  const districts = districtSummary(rows);
  const insights = generateInsights(rows);
  const forecast = forecastNextMonth(rows);
  const roi = computeChannelRoi(rows);
  const top = districts[0];

  return [
    {
      meta: getAlgorithm("pulse-pressure"),
      status: "ready",
      summary: top
        ? `Highest pressure: ${top.district} at ${top.pressure_score.toFixed(0)}/100`
        : "No districts in scope",
      metrics: [
        { label: "Districts scored", value: String(districts.length) },
        { label: "National backlog", value: kpi.backlog.toLocaleString() },
        {
          label: "Top pressure",
          value: top ? `${top.pressure_score.toFixed(0)}` : "—",
        },
      ],
      outputs: districts.slice(0, 5),
      formula: getAlgorithm("pulse-pressure").formula,
    },
    {
      meta: getAlgorithm("insight-forge"),
      status: "ready",
      summary: `${insights.length} live insight${insights.length === 1 ? "" : "s"} with recommended actions`,
      metrics: [
        {
          label: "High severity",
          value: String(insights.filter((i) => i.severity === "high").length),
        },
        { label: "Rules fired", value: String(insights.length) },
        {
          label: "Weighted satisfaction",
          value: Number.isFinite(kpi.satisfaction)
            ? `${kpi.satisfaction.toFixed(2)}/5`
            : "—",
        },
      ],
      outputs: insights,
      formula: getAlgorithm("insight-forge").formula,
    },
    {
      meta: getAlgorithm("trendcast-ols"),
      status: "ready",
      summary: `Next month (${forecast.nextMonth.month}) backlog ≈ ${forecast.nextMonth.unresolved_backlog.toLocaleString()}`,
      metrics: [
        {
          label: "Backlog slope",
          value: forecast.slope.backlog.toFixed(1),
        },
        {
          label: "On-time next",
          value: `${forecast.nextMonth.on_time_pct.toFixed(1)}%`,
        },
        {
          label: "Satisfaction next",
          value: `${forecast.nextMonth.satisfaction.toFixed(2)}/5`,
        },
      ],
      formula: forecast.formula,
    },
    {
      meta: getAlgorithm("hotspot-rank"),
      status: "ready",
      summary: top
        ? `HotspotRank leads with ${top.district} (${top.urgent_flag || "Normal"} flag)`
        : "No hotspots",
      metrics: [
        {
          label: "Urgent-flagged",
          value: String(districts.filter((d) => d.has_urgent).length),
        },
        {
          label: "#1 district",
          value: top?.district ?? "—",
        },
        {
          label: "Avg resolution days",
          value: Number.isFinite(weightedMean(rows, "avg_resolution_days"))
            ? weightedMean(rows, "avg_resolution_days").toFixed(1)
            : "—",
        },
      ],
      outputs: districts.slice(0, 8),
      formula: getAlgorithm("hotspot-rank").formula,
    },
    {
      meta: getAlgorithm("channel-roi"),
      status: "ready",
      summary: roi[0]
        ? `Best channel ROI: ${roi[0].channel} (${roi[0].roi_score.toFixed(0)})`
        : "No channels",
      metrics: roi.slice(0, 3).map((r) => ({
        label: r.channel,
        value: r.roi_score.toFixed(0),
      })),
      outputs: roi,
      formula: getAlgorithm("channel-roi").formula,
    },
    {
      meta: getAlgorithm("complaint-triage"),
      status: "ready",
      summary:
        "Runs at complaint submission — keyword urgency + category pressure + clarity signal",
      metrics: [
        { label: "High threshold", value: "≥ 70" },
        { label: "Medium threshold", value: "40–69" },
        { label: "Low threshold", value: "< 40" },
      ],
      formula: getAlgorithm("complaint-triage").formula,
    },
    {
      meta: getAlgorithm("dataset-quality"),
      status: "ready",
      summary:
        "Validates council CSV uploads before activation — required columns, nulls, bounds, consistency",
      metrics: [
        { label: "Required columns", value: String(REQUIRED_DATASET_COLS.length) },
        { label: "Pass score", value: "≥ 70" },
        { label: "Activate gate", value: "validated" },
      ],
      formula: getAlgorithm("dataset-quality").formula,
    },
  ];
}
