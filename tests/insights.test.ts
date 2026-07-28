import { describe, expect, it } from "vitest";
import { generateInsights, prioritise } from "@/lib/insights";
import type { Insight, ServiceRequestRow } from "@/lib/types";

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

describe("generateInsights", () => {
  it("returns no insights for an empty dataset", () => {
    expect(generateInsights([])).toEqual([]);
  });

  it("skips the backlog-leader rule when only one service category is present", () => {
    const rows = [
      makeRow({ district: "A", service_category: "Roads", unresolved_backlog: 10 }),
      makeRow({ district: "B", service_category: "Roads", unresolved_backlog: 20 }),
    ];
    expect(generateInsights(rows).find((i) => i.kind === "backlog")).toBeUndefined();
  });

  it("flags the category holding the largest backlog share, with high severity above 25%", () => {
    const rows = [
      makeRow({
        service_category: "Roads",
        district: "A",
        unresolved_backlog: 80,
        requests_received: 200,
      }),
      makeRow({
        service_category: "Water & sanitation",
        district: "B",
        unresolved_backlog: 20,
        requests_received: 200,
      }),
    ];
    const insight = generateInsights(rows).find((i) => i.kind === "backlog");
    expect(insight).toBeDefined();
    expect(insight!.title).toMatch(/Roads/);
    expect(insight!.severity).toBe("high");
  });

  it("ignores channels below the minimum volume share when computing the channel gap", () => {
    const rows = [
      makeRow({
        district: "A",
        primary_channel: "WhatsApp",
        pct_resolved_on_time: 95,
        requests_received: 490,
      }),
      makeRow({
        district: "B",
        primary_channel: "Walk-in",
        pct_resolved_on_time: 60,
        requests_received: 490,
      }),
      // Well under 2% of the ~985 total volume — should be excluded from the comparison.
      makeRow({
        district: "C",
        primary_channel: "Community officer",
        pct_resolved_on_time: 10,
        requests_received: 5,
      }),
    ];
    const insight = generateInsights(rows).find((i) => i.kind === "channel");
    expect(insight).toBeDefined();
    expect(insight!.body).toMatch(/WhatsApp/);
    expect(insight!.body).toMatch(/Walk-in/);
    expect(insight!.body).not.toMatch(/Community officer/);
  });

  it("flags districts below the satisfaction floor only when they have enough volume", () => {
    const rows = [
      makeRow({ district: "LowVolLowSat", citizen_satisfaction_1_5: 2.0, requests_received: 5 }),
      makeRow({ district: "HighVolLowSat", citizen_satisfaction_1_5: 2.5, requests_received: 500 }),
      makeRow({ district: "HighVolHighSat", citizen_satisfaction_1_5: 4.5, requests_received: 500 }),
    ];
    const insight = generateInsights(rows).find((i) => i.kind === "satisfaction");
    expect(insight).toBeDefined();
    expect(insight!.body).toMatch(/HighVolLowSat/);
    expect(insight!.body).not.toMatch(/LowVolLowSat/);
  });
});

describe("prioritise", () => {
  it("boosts insights matching the focus kind ahead of severity ordering", () => {
    const insights: Insight[] = [
      { id: "1", title: "a", body: "", severity: "medium", action_title: "", action_body: "", kind: "backlog" },
      { id: "2", title: "b", body: "", severity: "high", action_title: "", action_body: "", kind: "channel" },
      { id: "3", title: "c", body: "", severity: "medium", action_title: "", action_body: "", kind: "urgent" },
    ];
    const result = prioritise(insights, "urgent");
    expect(result[0]!.kind).toBe("urgent");
    expect(result[1]!.kind).toBe("channel");
    expect(result[2]!.kind).toBe("backlog");
  });

  it("sorts by severity when no focus is set", () => {
    const insights: Insight[] = [
      { id: "1", title: "a", body: "", severity: "medium", action_title: "", action_body: "", kind: "backlog" },
      { id: "2", title: "b", body: "", severity: "high", action_title: "", action_body: "", kind: "channel" },
    ];
    const result = prioritise(insights, null);
    expect(result[0]!.severity).toBe("high");
  });
});
