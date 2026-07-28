import { describe, expect, it } from "vitest";
import { backlogAging, channelRoi } from "@/lib/analysis";
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

describe("channelRoi", () => {
  it("does not divide by zero for a channel with no received requests", () => {
    const rows = [
      makeRow({
        primary_channel: "WhatsApp",
        requests_received: 0,
        requests_resolved: 0,
        pct_resolved_on_time: 0,
        citizen_satisfaction_1_5: 0,
      }),
      makeRow({
        primary_channel: "Walk-in",
        requests_received: 100,
        requests_resolved: 90,
        pct_resolved_on_time: 90,
        citizen_satisfaction_1_5: 4.5,
      }),
    ];
    const result = channelRoi(rows);
    const whatsapp = result.find((r) => r.channel === "WhatsApp")!;
    expect(Number.isFinite(whatsapp.roi_score)).toBe(true);
    expect(whatsapp.roi_score).toBe(0);
  });

  it("normalises the top-scoring channel to 100 and sorts descending", () => {
    const rows = [
      makeRow({
        primary_channel: "WhatsApp",
        requests_received: 100,
        requests_resolved: 95,
        pct_resolved_on_time: 95,
        citizen_satisfaction_1_5: 4.8,
      }),
      makeRow({
        primary_channel: "Walk-in",
        requests_received: 100,
        requests_resolved: 50,
        pct_resolved_on_time: 50,
        citizen_satisfaction_1_5: 3.0,
      }),
    ];
    const result = channelRoi(rows);
    expect(result[0]!.channel).toBe("WhatsApp");
    expect(result[0]!.roi_score).toBeCloseTo(100, 5);
    expect(result[1]!.roi_score).toBeLessThan(100);
  });

  it("handles a single row without crashing", () => {
    const result = channelRoi([makeRow()]);
    expect(result).toHaveLength(1);
    expect(result[0]!.roi_score).toBeCloseTo(100, 5);
  });
});

describe("backlogAging", () => {
  it("buckets rows by average resolution days and sums shares to 100%", () => {
    const rows = [
      makeRow({ avg_resolution_days: 1, unresolved_backlog: 10 }),
      makeRow({ avg_resolution_days: 4, unresolved_backlog: 20 }),
      makeRow({ avg_resolution_days: 6, unresolved_backlog: 30 }),
      makeRow({ avg_resolution_days: 9, unresolved_backlog: 40 }),
    ];
    const buckets = backlogAging(rows);
    expect(buckets.map((b) => b.bucket)).toEqual([
      "0–3 days",
      "3–5 days",
      "5–7 days",
      "7+ days",
    ]);
    expect(buckets[0]!.unresolved_backlog).toBe(10);
    expect(buckets[1]!.unresolved_backlog).toBe(20);
    expect(buckets[2]!.unresolved_backlog).toBe(30);
    expect(buckets[3]!.unresolved_backlog).toBe(40);
    const totalShare = buckets.reduce((s, b) => s + b.share_pct, 0);
    expect(totalShare).toBeCloseTo(100, 5);
  });

  it("returns finite, zeroed shares without dividing by zero when there is no backlog", () => {
    const rows = [makeRow({ unresolved_backlog: 0 })];
    const buckets = backlogAging(rows);
    expect(buckets.every((b) => Number.isFinite(b.share_pct))).toBe(true);
    expect(buckets.every((b) => b.share_pct === 0)).toBe(true);
  });
});
