import { describe, expect, it } from "vitest";
import { forecastNextMonth } from "@/lib/forecast";
import type { ServiceRequestRow } from "@/lib/types";

function makeRow(overrides: Partial<ServiceRequestRow> = {}): ServiceRequestRow {
  return {
    month: "2026-01",
    province: "Mashonaland West",
    district: "Chinhoyi",
    latitude: -17.8,
    longitude: 30.2,
    settlement_type: "Urban",
    service_category: "Water & sanitation",
    primary_channel: "Walk-in",
    requests_received: 100,
    requests_resolved: 80,
    avg_resolution_days: 3,
    pct_resolved_on_time: 80,
    unresolved_backlog: 20,
    citizen_satisfaction_1_5: 4,
    priority_flag: "Normal",
    ...overrides,
  };
}

describe("forecastNextMonth", () => {
  it("falls back to a July 2026 label when there is no monthly history", () => {
    const f = forecastNextMonth([]);
    expect(f.history).toEqual([]);
    expect(f.nextMonth.isForecast).toBe(true);
    expect(f.nextMonth.month).toBe("2026-07");
    expect(f.nextMonth.unresolved_backlog).toBe(0);
  });

  it("projects a flat line when only a single month of history exists", () => {
    const rows = [makeRow({ month: "2026-03", unresolved_backlog: 50, requests_received: 100 })];
    const f = forecastNextMonth(rows);
    expect(f.history).toHaveLength(1);
    expect(f.slope.backlog).toBe(0);
    expect(f.nextMonth.unresolved_backlog).toBe(50);
    expect(f.nextMonth.month).toBe("2026-04");
  });

  it("treats history points as evenly spaced by index, ignoring gaps in the month sequence", () => {
    const rows = [
      makeRow({ month: "2026-01", unresolved_backlog: 100, requests_received: 100 }),
      // Note: February is missing entirely — the regression still spaces these two
      // points one unit apart, not two.
      makeRow({ month: "2026-03", unresolved_backlog: 140, requests_received: 100 }),
    ];
    const f = forecastNextMonth(rows);
    expect(f.slope.backlog).toBeCloseTo(40, 5);
    expect(f.nextMonth.unresolved_backlog).toBe(180);
    // The label continues from the last *history point's* label, not from a
    // calendar-aware projection.
    expect(f.nextMonth.month).toBe("2026-04");
  });

  it("clamps projected satisfaction and on-time percentage to their valid ranges", () => {
    const rows = [
      makeRow({ month: "2026-01", citizen_satisfaction_1_5: 4.9, pct_resolved_on_time: 98 }),
      makeRow({ month: "2026-02", citizen_satisfaction_1_5: 4.95, pct_resolved_on_time: 99.5 }),
      makeRow({ month: "2026-03", citizen_satisfaction_1_5: 5.0, pct_resolved_on_time: 100 }),
    ];
    const f = forecastNextMonth(rows);
    expect(f.nextMonth.satisfaction).toBeLessThanOrEqual(5);
    expect(f.nextMonth.on_time_pct).toBeLessThanOrEqual(100);
  });
});
