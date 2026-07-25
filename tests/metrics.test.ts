import { describe, expect, it } from "vitest";
import { applyFilters, loadRequests } from "../src/lib/data/loadRequests";
import { forecastNextMonth } from "../src/lib/forecast";
import { generateInsights } from "../src/lib/insights";
import { districtSummary, kpis } from "../src/lib/metrics";
import { channelRoi, backlogAging } from "../src/lib/analysis";

describe("national golden KPIs (PITCH.md)", () => {
  const { rows } = loadRequests();

  it("loads 720 validated rows", () => {
    expect(rows.length).toBe(720);
  });

  it("matches memorised national figures", () => {
    const k = kpis(rows);
    expect(k.total_requests).toBe(264572);
    expect(k.backlog).toBe(51571);
    expect(k.backlog_pct).toBeCloseTo(19.5, 1);
    expect(k.satisfaction).toBeCloseTo(3.53, 2);
    expect(k.on_time_pct).toBeCloseTo(73.4, 1);
  });

  it("ranks Chinhoyi as highest pressure nationally", () => {
    const ds = districtSummary(rows);
    expect(ds[0]?.district).toBe("Chinhoyi");
  });

  it("generates insights with urgent concentration naming known districts", () => {
    const insights = generateInsights(rows);
    expect(insights.length).toBeGreaterThanOrEqual(3);
    const urgent = insights.find((i) => i.kind === "urgent");
    expect(urgent?.body).toMatch(/Harare Urban/);
  });

  it("recalculates when filtered to rural", () => {
    const rural = applyFilters(rows, { settlementTypes: ["Rural"] });
    const k = kpis(rural);
    expect(k.total_requests).toBeLessThan(264572);
    expect(k.total_requests).toBeGreaterThan(0);
  });

  it("forecasts a next month label after last history month", () => {
    const f = forecastNextMonth(rows);
    expect(f.history.length).toBeGreaterThan(0);
    expect(f.nextMonth.isForecast).toBe(true);
    expect(f.nextMonth.month).toBe("2026-07");
  });

  it("computes channel ROI and aging buckets", () => {
    expect(channelRoi(rows).length).toBeGreaterThan(0);
    expect(backlogAging(rows).reduce((s, b) => s + b.share_pct, 0)).toBeCloseTo(
      100,
      0,
    );
  });
});
