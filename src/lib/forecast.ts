import { monthTrend } from "@/lib/metrics";
import type { MonthTrend, ServiceRequestRow } from "@/lib/types";

export interface ForecastPoint {
  month: string;
  unresolved_backlog: number;
  on_time_pct: number;
  satisfaction: number;
  isForecast: boolean;
}

export interface ForecastResult {
  history: ForecastPoint[];
  nextMonth: ForecastPoint;
  formula: string;
  slope: {
    backlog: number;
    on_time_pct: number;
    satisfaction: number;
  };
}

function linearProject(values: number[]): { next: number; slope: number } {
  const n = values.length;
  if (n === 0) return { next: 0, slope: 0 };
  if (n === 1) return { next: values[0]!, slope: 0 };
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - xMean) * (values[i]! - yMean);
    den += (xs[i]! - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const next = intercept + slope * n;
  return { next, slope };
}

function nextMonthLabel(last: string): string {
  const [y, m] = last.split("-").map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function forecastNextMonth(rows: ServiceRequestRow[]): ForecastResult {
  const trend: MonthTrend[] = monthTrend(rows);
  const window = trend.slice(-6);
  const backlog = linearProject(window.map((t) => t.unresolved_backlog));
  const onTime = linearProject(window.map((t) => t.on_time_pct));
  const sat = linearProject(window.map((t) => t.satisfaction));
  const last = window[window.length - 1]?.month ?? "2026-06";

  const history: ForecastPoint[] = window.map((t) => ({
    month: t.month,
    unresolved_backlog: t.unresolved_backlog,
    on_time_pct: t.on_time_pct,
    satisfaction: t.satisfaction,
    isForecast: false,
  }));

  const nextMonth: ForecastPoint = {
    month: nextMonthLabel(last),
    unresolved_backlog: Math.max(0, Math.round(backlog.next)),
    on_time_pct: Math.min(100, Math.max(0, onTime.next)),
    satisfaction: Math.min(5, Math.max(1, sat.next)),
    isForecast: true,
  };

  return {
    history,
    nextMonth,
    formula:
      "Ordinary least-squares linear projection over the last up-to-6 months of weighted KPIs. Transparent and deterministic — not a causal model.",
    slope: {
      backlog: backlog.slope,
      on_time_pct: onTime.slope,
      satisfaction: sat.slope,
    },
  };
}
