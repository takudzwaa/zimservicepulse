"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FilterState, ServiceRequestRow } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";
import { uniqueSorted } from "@/lib/data/filter-utils";

function MultiSelect({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        multiple
        aria-label={label}
        className="h-24 w-full rounded-lg border border-input bg-white px-2 py-1 text-xs shadow-xs transition-colors hover:border-brand/40 focus:border-brand"
        value={values}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange(selected);
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-muted-foreground">
        {values.length ? `${values.length} selected` : "All values"} · Cmd/Ctrl-click for more.
      </p>
    </div>
  );
}

export function FilterPanel({
  rows,
  filters,
  onChange,
}: {
  rows: ServiceRequestRow[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const provinces = useMemo(() => uniqueSorted(rows, "province"), [rows]);
  const districts = useMemo(() => {
    const scoped = filters.provinces.length
      ? rows.filter((r) => filters.provinces.includes(r.province))
      : rows;
    return uniqueSorted(scoped, "district");
  }, [rows, filters.provinces]);

  return (
    <div className="space-y-3 rounded-xl border border-sidebar-border bg-white/90 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
        >
          Reset
        </Button>
      </div>
      <MultiSelect
        label="Province"
        options={provinces}
        values={filters.provinces}
        onChange={(provinces) =>
          onChange({
            ...filters,
            provinces,
            districts: filters.districts.filter((d) => districts.includes(d)),
          })
        }
      />
      <MultiSelect
        label="District"
        options={districts}
        values={filters.districts}
        onChange={(districts) => onChange({ ...filters, districts })}
      />
      <MultiSelect
        label="Settlement type"
        options={uniqueSorted(rows, "settlement_type")}
        values={filters.settlementTypes}
        onChange={(settlementTypes) => onChange({ ...filters, settlementTypes })}
      />
      <MultiSelect
        label="Service category"
        options={uniqueSorted(rows, "service_category")}
        values={filters.categories}
        onChange={(categories) => onChange({ ...filters, categories })}
      />
      <MultiSelect
        label="Primary channel"
        options={uniqueSorted(rows, "primary_channel")}
        values={filters.channels}
        onChange={(channels) => onChange({ ...filters, channels })}
      />
      <MultiSelect
        label="Priority"
        options={uniqueSorted(rows, "priority_flag")}
        values={filters.priorities}
        onChange={(priorities) => onChange({ ...filters, priorities })}
      />
      <MultiSelect
        label="Month"
        options={uniqueSorted(rows, "month")}
        values={filters.months}
        onChange={(months) => onChange({ ...filters, months })}
      />
    </div>
  );
}
