import type { ServiceRequestRow } from "@/lib/types";

export function uniqueSorted(
  rows: ServiceRequestRow[],
  key: keyof ServiceRequestRow,
): string[] {
  return [...new Set(rows.map((r) => String(r[key])))].sort();
}

export function applyFilters(
  rows: ServiceRequestRow[],
  filters: {
    provinces?: string[];
    districts?: string[];
    settlementTypes?: string[];
    categories?: string[];
    channels?: string[];
    priorities?: string[];
    months?: string[];
  },
): ServiceRequestRow[] {
  return rows.filter((r) => {
    if (filters.provinces?.length && !filters.provinces.includes(r.province))
      return false;
    if (filters.districts?.length && !filters.districts.includes(r.district))
      return false;
    if (
      filters.settlementTypes?.length &&
      !filters.settlementTypes.includes(r.settlement_type)
    )
      return false;
    if (
      filters.categories?.length &&
      !filters.categories.includes(r.service_category)
    )
      return false;
    if (
      filters.channels?.length &&
      !filters.channels.includes(r.primary_channel)
    )
      return false;
    if (
      filters.priorities?.length &&
      !filters.priorities.includes(r.priority_flag)
    )
      return false;
    if (filters.months?.length && !filters.months.includes(r.month))
      return false;
    return true;
  });
}
