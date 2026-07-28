"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  DistrictSummary,
  FilterState,
  GroupSummary,
  Insight,
  Kpis,
  MonthTrend,
  ServiceRequestRow,
  InsightKind,
} from "@/lib/types";
import { EMPTY_FILTERS, FOCUS_OPTIONS } from "@/lib/types";
import { applyFilters } from "@/lib/data/filter-utils";
import {
  districtSummary,
  groupSummary,
  kpis,
  monthTrend,
} from "@/lib/metrics";
import { generateInsights, prioritise } from "@/lib/insights";
import { KpiRibbon } from "@/components/dashboard/kpi-ribbon";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { HotspotMap } from "@/components/map/hotspot-map";
import { RankingCharts } from "@/components/charts/ranking-charts";
import { InsightCards } from "@/components/dashboard/insight-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BriefingClient({ rows }: { rows: ServiceRequestRow[] }) {
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS });
  const [focusLabel, setFocusLabel] = useState(
    "Balanced (default severity)",
  );
  const [step, setStep] = useState(1);

  const filtered = useMemo(
    () => applyFilters(rows, filters),
    [rows, filters],
  );

  const dash = useMemo(() => {
    const focus = FOCUS_OPTIONS[focusLabel] as InsightKind | null;
    const kpi: Kpis = kpis(filtered);
    const districts: DistrictSummary[] = districtSummary(filtered);
    const insights: Insight[] = prioritise(generateInsights(filtered), focus);
    const categories: GroupSummary[] = groupSummary(
      filtered,
      "service_category",
    );
    const channels: GroupSummary[] = groupSummary(filtered, "primary_channel");
    const settlements: GroupSummary[] = groupSummary(
      filtered,
      "settlement_type",
    );
    const trends: MonthTrend[] = monthTrend(filtered);
    return {
      kpi,
      districts,
      insights,
      categories,
      channels,
      settlements,
      trends,
    };
  }, [filtered, focusLabel]);

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-2">4-step service story</Badge>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Operational briefing
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview → Explore → Insights → Actions. Designed for a sub-3-minute
          pitch without losing the live filter story.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={step === n ? "default" : "outline"}
            onClick={() => setStep(n)}
          >
            Step {n}
          </Button>
        ))}
      </div>

      {step === 1 ? (
        <section className="space-y-4 animate-in-up">
          <div className="rounded-lg border border-alert/30 bg-alert/5 px-4 py-3 text-sm">
            Every month, councils receive tens of thousands of citizen service
            requests. In this national extract,{" "}
            <strong>{dash.kpi.total_requests.toLocaleString()}</strong> requests
            appear and nearly one in five —{" "}
            <strong>{dash.kpi.backlog.toLocaleString()}</strong> — remain
            unresolved. Managers know there is a backlog. ZimServicePulse shows
            where pressure concentrates and what to do first.
          </div>
          <KpiRibbon kpis={dash.kpi} />
          <HotspotMap districts={dash.districts} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-4 lg:grid-cols-[260px_1fr] animate-in-up">
          <FilterPanel rows={rows} filters={filters} onChange={setFilters} />
          <div className="space-y-4">
            <KpiRibbon kpis={dash.kpi} />
            <RankingCharts
              categories={dash.categories}
              channels={dash.channels}
              settlements={dash.settlements}
              trends={dash.trends}
            />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3 animate-in-up">
          <p className="text-sm text-muted-foreground">
            These cards come from a transparent rules engine — every number is
            computed from the filtered data. Nothing is hardcoded.
          </p>
          <InsightCards insights={dash.insights} />
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4 animate-in-up">
          <div className="max-w-sm space-y-2">
            <Label>What-if action focus</Label>
            <Select
              value={focusLabel}
              onValueChange={(v) => setFocusLabel(String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FOCUS_OPTIONS).map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <InsightCards insights={dash.insights} />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/api/export/markdown"
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted"
            >
              Download Markdown summary
            </Link>
            <Link
              href="/api/export/pdf"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
            >
              Download PDF briefing
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ ...EMPTY_FILTERS });
                setStep(1);
              }}
            >
              Reset to national view
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
