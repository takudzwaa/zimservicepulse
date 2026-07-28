import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import { KpiRibbon } from "@/components/dashboard/kpi-ribbon";
import { InsightCards } from "@/components/dashboard/insight-cards";
import { AudienceValue } from "@/components/dashboard/audience-value";
import { ServiceCoverage } from "@/components/dashboard/service-coverage";
import { HotspotMap } from "@/components/map/hotspot-map";
import { RankingCharts } from "@/components/charts/ranking-charts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user;
  if (user.role === "external_user" && user.audience) {
    redirect(`/stakeholders/${user.audience}`);
  }
  const { rows } = await getRowsForUser(user);

  let filters: FilterState = { ...EMPTY_FILTERS };
  let title = "National operations overview";
  let subtitle =
    "Cross-role command view of citizen service pressure across Zimbabwe.";

  if (user.role === "district_manager" && user.assignedDistricts.length) {
    filters = { ...EMPTY_FILTERS, districts: user.assignedDistricts };
    title = `${user.assignedDistricts[0]} district pulse`;
    subtitle =
      "Your assigned district KPIs, urgent alerts, and recommended next actions.";
  } else if (
    user.role === "provincial_analyst" &&
    user.assignedProvinces.length
  ) {
    filters = { ...EMPTY_FILTERS, provinces: user.assignedProvinces };
    title = "Provincial analyst desk";
    subtitle =
      "Province-scoped pressure, hotspot map, and month-over-month movement.";
  } else if (user.role === "channel_lead") {
    title = "Channel performance desk";
    subtitle =
      "Where digital and assisted channels outperform — and where to shift demand.";
  }

  const dash = computeDashboard(rows, filters);
  const openActions = dash.insights.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">
            Role home
          </Badge>
          <h1 className="font-brand text-3xl font-semibold text-brand">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/briefing" className={cn(buttonVariants())}>
            Open briefing
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-alert/30 bg-alert/5 px-4 py-3 text-sm">
        {Number.isFinite(dash.kpi.backlog_pct) ? (
          <>
            Nearly{" "}
            <strong>{dash.kpi.backlog_pct.toFixed(0)}%</strong> of requests in
            scope remain unresolved (
            <strong>{dash.kpi.backlog.toLocaleString()}</strong> cases). Focus
            capacity on the highest-pressure districts first.
          </>
        ) : (
          "No data in the current scope."
        )}
      </div>

      <KpiRibbon kpis={dash.kpi} />

      {user.role === "channel_lead" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand">Channel ROI leaders</CardTitle>
            <CardDescription>
              Composite of resolution rate × on-time × satisfaction (normalised).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>On-time %</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>ROI score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.channelRoi.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell className="font-medium">{c.channel}</TableCell>
                    <TableCell>{c.requests_received.toLocaleString()}</TableCell>
                    <TableCell>{c.on_time_pct.toFixed(1)}</TableCell>
                    <TableCell>{c.satisfaction.toFixed(2)}</TableCell>
                    <TableCell>{c.roi_score.toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <HotspotMap districts={dash.districts} />
        <RankingCharts
          categories={dash.categories}
          channels={dash.channels}
          settlements={dash.settlements}
          trends={dash.trends}
        />
      </div>

      <ServiceCoverage />

      <AudienceValue />

      {user.role === "provincial_analyst" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand">Next-month forecast</CardTitle>
            <CardDescription>{dash.forecast.formula}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Backlog</div>
              <div className="text-2xl font-semibold tabular-nums">
                {dash.forecast.nextMonth.unresolved_backlog.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {dash.forecast.nextMonth.month}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">On-time %</div>
              <div className="text-2xl font-semibold tabular-nums">
                {dash.forecast.nextMonth.on_time_pct.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Satisfaction</div>
              <div className="text-2xl font-semibold tabular-nums">
                {dash.forecast.nextMonth.satisfaction.toFixed(2)}/5
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-brand text-xl text-brand">Priority insights</h2>
          <Link
            href="/workflow"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Manage as actions
          </Link>
        </div>
        <InsightCards insights={openActions} />
      </div>

      {user.role === "district_manager" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand">District detail</CardTitle>
            <CardDescription>
              Top pressure signals inside your assigned area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Pressure</TableHead>
                  <TableHead>Backlog</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.districts.slice(0, 5).map((d) => (
                  <TableRow key={d.district}>
                    <TableCell>{d.district}</TableCell>
                    <TableCell>{d.pressure_score.toFixed(0)}</TableCell>
                    <TableCell>{d.unresolved_backlog.toLocaleString()}</TableCell>
                    <TableCell>{d.urgent_flag}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
