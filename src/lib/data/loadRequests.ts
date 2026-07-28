import { readFileSync } from "fs";
import path from "path";
import Papa from "papaparse";
import type { ServiceRequestRow } from "@/lib/types";
import { PRIORITY_ORDER } from "@/lib/types";

export { applyFilters, uniqueSorted } from "@/lib/data/filter-utils";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "01_public_service_requests.csv",
);

const LAT_BOUNDS = [-22.5, -15.5] as const;
const LON_BOUNDS = [25.2, 33.1] as const;

const NUMERIC_COLS = [
  "latitude",
  "longitude",
  "requests_received",
  "requests_resolved",
  "avg_resolution_days",
  "pct_resolved_on_time",
  "unresolved_backlog",
  "citizen_satisfaction_1_5",
] as const;

const CATEGORICAL_COLS = [
  "month",
  "province",
  "district",
  "settlement_type",
  "service_category",
  "primary_channel",
  "priority_flag",
] as const;

let cached: { rows: ServiceRequestRow[]; excluded: number } | null = null;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function loadRequests(): {
  rows: ServiceRequestRow[];
  excluded: number;
} {
  if (cached) return cached;

  const csv = readFileSync(DATA_PATH, "utf8");
  const result = parseRequestsCsv(csv);
  cached = result;
  return result;
}

export function parseRequestsCsv(csv: string): {
  rows: ServiceRequestRow[];
  excluded: number;
} {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      `CSV parse error: ${parsed.errors.map((e) => e.message).join("; ")}`,
    );
  }

  const fields = parsed.meta.fields ?? [];
  const missing = [...CATEGORICAL_COLS, ...NUMERIC_COLS].filter(
    (c) => !fields.includes(c),
  );
  if (missing.length) {
    throw new Error(`Dataset missing columns: ${missing.join(", ")}`);
  }

  const rows: ServiceRequestRow[] = [];
  let excluded = 0;

  for (const raw of parsed.data) {
    const nums: Record<string, number> = {};
    let ok = true;
    for (const col of NUMERIC_COLS) {
      const n = toNumber(raw[col]);
      if (n === null) {
        ok = false;
        break;
      }
      nums[col] = n;
    }
    if (!ok) {
      excluded += 1;
      continue;
    }
    if (
      nums.latitude < LAT_BOUNDS[0] ||
      nums.latitude > LAT_BOUNDS[1] ||
      nums.longitude < LON_BOUNDS[0] ||
      nums.longitude > LON_BOUNDS[1] ||
      nums.requests_received < 0
    ) {
      excluded += 1;
      continue;
    }

    const flag = String(raw.priority_flag ?? "").trim();
    if (!PRIORITY_ORDER.includes(flag as ServiceRequestRow["priority_flag"])) {
      excluded += 1;
      continue;
    }

    rows.push({
      month: String(raw.month).trim(),
      province: String(raw.province).trim(),
      district: String(raw.district).trim(),
      settlement_type: String(raw.settlement_type).trim(),
      service_category: String(raw.service_category).trim(),
      primary_channel: String(raw.primary_channel).trim(),
      priority_flag: flag as ServiceRequestRow["priority_flag"],
      latitude: nums.latitude,
      longitude: nums.longitude,
      requests_received: Math.round(nums.requests_received),
      requests_resolved: Math.round(nums.requests_resolved),
      avg_resolution_days: nums.avg_resolution_days,
      pct_resolved_on_time: nums.pct_resolved_on_time,
      unresolved_backlog: Math.round(nums.unresolved_backlog),
      citizen_satisfaction_1_5: nums.citizen_satisfaction_1_5,
    });
  }

  return { rows, excluded };
}
