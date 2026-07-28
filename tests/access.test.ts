import { describe, expect, it } from "vitest";
import {
  canExportRawData,
  canManageCitizenReports,
  canOpenAudience,
  canReviewDataAccess,
  canSeeReport,
  scopeRowsForUser,
} from "@/lib/access";
import { MUNICIPAL_SERVICES } from "@/lib/municipal-services";
import type { AccessUser } from "@/lib/access";
import type { ServiceRequestRow } from "@/lib/types";

const row = (province: string, district: string): ServiceRequestRow => ({
  month: "2026-01",
  province,
  district,
  latitude: -17.8,
  longitude: 31,
  settlement_type: "Urban",
  service_category: "Water & sanitation",
  primary_channel: "Walk-in",
  requests_received: 10,
  requests_resolved: 8,
  avg_resolution_days: 3,
  pct_resolved_on_time: 80,
  unresolved_backlog: 2,
  citizen_satisfaction_1_5: 4,
  priority_flag: "Normal",
});

const baseUser: AccessUser = {
  id: "user",
  role: "district_manager",
  audience: "council",
  assignedDistricts: ["Chinhoyi"],
  assignedProvinces: ["Mashonaland West"],
};

describe("workspace access and data scoping", () => {
  const rows = [
    row("Mashonaland West", "Chinhoyi"),
    row("Harare", "Harare Urban"),
  ];

  it("limits district and province roles to their assignments", () => {
    expect(scopeRowsForUser(rows, baseUser).map((item) => item.district)).toEqual([
      "Chinhoyi",
    ]);
    expect(
      scopeRowsForUser(rows, {
        ...baseUser,
        role: "provincial_analyst",
        audience: "ministry",
      }).map((item) => item.province),
    ).toEqual(["Mashonaland West"]);
  });

  it("keeps external users out of raw exports and internal triage", () => {
    const external: AccessUser = {
      ...baseUser,
      role: "external_user",
      audience: "citizen",
      assignedDistricts: [],
      assignedProvinces: [],
    };
    expect(canExportRawData(external)).toBe(false);
    expect(canManageCitizenReports(external)).toBe(false);
    expect(canOpenAudience(external, "citizen")).toBe(true);
    expect(canOpenAudience(external, "business")).toBe(false);
  });

  it("reserves governance review for admins", () => {
    expect(canReviewDataAccess(baseUser)).toBe(false);
    expect(
      canReviewDataAccess({ ...baseUser, role: "admin", audience: null }),
    ).toBe(true);
  });

  it("prevents cross-authority report access even when districts overlap", () => {
    const tenantUser = { ...baseUser, authorityId: "authority-a" };
    expect(
      canSeeReport(tenantUser, {
        authorityId: "authority-a",
        district: "Chinhoyi",
      }),
    ).toBe(true);
    expect(
      canSeeReport(tenantUser, {
        authorityId: "authority-b",
        district: "Chinhoyi",
      }),
    ).toBe(false);
  });
});

describe("municipal service routing", () => {
  it("provides a destination for every coverage card", () => {
    expect(MUNICIPAL_SERVICES).toHaveLength(9);
    expect(MUNICIPAL_SERVICES.every((service) => service.href.startsWith("/"))).toBe(true);
    expect(
      MUNICIPAL_SERVICES.filter((service) => service.category).map(
        (service) => service.slug,
      ),
    ).toEqual(["roads", "waste", "water"]);
  });
});
