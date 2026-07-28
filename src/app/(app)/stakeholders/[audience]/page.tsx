import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canOpenAudience, scopeRowsForUser } from "@/lib/access";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import { uniqueSorted } from "@/lib/data/filter-utils";
import { ensureSchema, getDb } from "@/lib/db";
import {
  citizenReportEvents,
  citizenReports,
  dataAccessGrants,
  dataAccessRequests,
} from "@/lib/db/schema";
import { groupSummary } from "@/lib/metrics";
import type { WorkspaceAudience } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";
import { KpiRibbon } from "@/components/dashboard/kpi-ribbon";
import { HotspotMap } from "@/components/map/hotspot-map";
import {
  CitizenReportsClient,
  DataAccessRequestClient,
} from "@/components/dashboard/stakeholder-workspace-client";
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

const AUDIENCES: WorkspaceAudience[] = [
  "council",
  "ministry",
  "business",
  "researcher",
  "citizen",
];

const LABELS: Record<WorkspaceAudience, string> = {
  council: "Council operations",
  ministry: "Ministry intelligence",
  business: "Business service insights",
  researcher: "Research data workspace",
  citizen: "Citizen services",
};

function SummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: ReturnType<typeof groupSummary>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand">{title}</CardTitle>
        <CardDescription>Aggregate service-delivery measures; no personal records.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Backlog</TableHead>
              <TableHead>On-time</TableHead>
              <TableHead>Satisfaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 10).map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.key}</TableCell>
                <TableCell>{row.requests_received.toLocaleString()}</TableCell>
                <TableCell>{row.unresolved_backlog.toLocaleString()}</TableCell>
                <TableCell>{row.on_time_pct.toFixed(1)}%</TableCell>
                <TableCell>{row.satisfaction.toFixed(2)}/5</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function StakeholderWorkspacePage({
  params,
}: {
  params: Promise<{ audience: string }>;
}) {
  const { audience: rawAudience } = await params;
  if (!AUDIENCES.includes(rawAudience as WorkspaceAudience)) {
    notFound();
  }
  const audience = rawAudience as WorkspaceAudience;
  const session = await auth();
  const user = session!.user;
  if (!canOpenAudience(user, audience)) {
    return (
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Role protected</Badge>
          <CardTitle className="text-brand">{LABELS[audience]}</CardTitle>
          <CardDescription>
            This workspace is available to {audience} accounts. Sign in with the
            matching authorized account to use its governed tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>Return home</Link>
        </CardContent>
      </Card>
    );
  }

  const { rows } = await getRowsForUser(user);
  const scopedRows = scopeRowsForUser(rows, user);
  const dash = computeDashboard(scopedRows, EMPTY_FILTERS);
  const provinces = groupSummary(scopedRows, "province");
  const categories = groupSummary(scopedRows, "service_category");

  await ensureSchema();
  const db = await getDb();
  let reports: (typeof citizenReports.$inferSelect)[] = [];
  if (audience === "council") {
    reports =
      user.role === "admin"
        ? await db.select().from(citizenReports).orderBy(desc(citizenReports.createdAt))
        : user.authorityId
          ? await db
              .select()
              .from(citizenReports)
              .where(eq(citizenReports.authorityId, user.authorityId))
              .orderBy(desc(citizenReports.createdAt))
        : user.assignedDistricts.length
          ? await db
              .select()
              .from(citizenReports)
              .where(inArray(citizenReports.district, user.assignedDistricts))
              .orderBy(desc(citizenReports.createdAt))
          : [];
  } else if (audience === "citizen") {
    reports = await db
      .select()
      .from(citizenReports)
      .where(eq(citizenReports.reporterId, user.id))
      .orderBy(desc(citizenReports.createdAt));
  }

  const reportIds = reports.map((report) => report.id);
  const events = reportIds.length
    ? await db
        .select()
        .from(citizenReportEvents)
        .where(inArray(citizenReportEvents.reportId, reportIds))
        .orderBy(desc(citizenReportEvents.createdAt))
    : [];
  const serializedReports = reports.map((report) => ({
    ...report,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    events: events
      .filter((event) => event.reportId === report.id)
      .map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
  }));

  const accessRequests =
    audience === "business" || audience === "researcher"
      ? await db
          .select()
          .from(dataAccessRequests)
          .where(eq(dataAccessRequests.requesterId, user.id))
          .orderBy(desc(dataAccessRequests.createdAt))
      : [];
  const serializedAccessRequests = accessRequests.map((request) => ({
    ...request,
    createdAt: request.createdAt.toISOString(),
  }));
  const grants =
    audience === "business" || audience === "researcher"
      ? await db
          .select()
          .from(dataAccessGrants)
          .where(eq(dataAccessGrants.requesterId, user.id))
      : [];
  const serializedGrants = grants.map((grant) => ({
    id: grant.id,
    requestId: grant.requestId,
    expiresAt: grant.expiresAt.toISOString(),
    downloadCount: grant.downloadCount,
    downloadUrl: `/api/data-access-grants/${grant.id}/download`,
  }));
  const places = Array.from(
    new Map(
      rows.map((row) => [
        `${row.province}||${row.district}`,
        { province: row.province, district: row.district },
      ]),
    ).values(),
  ).sort((a, b) => a.province.localeCompare(b.province) || a.district.localeCompare(b.district));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="secondary">{audience} workspace</Badge>
          <h1 className="mt-2 font-brand text-3xl font-semibold text-brand">
            {LABELS[audience]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {audience === "council" && "Manage assigned-area pressure and turn citizen reports into accountable work."}
            {audience === "ministry" && "Compare councils and provinces using consistent weighted service measures."}
            {audience === "business" && "Use governed aggregate signals for infrastructure and operating-context decisions."}
            {audience === "researcher" && "Inspect coverage and methodology before requesting licensed historical access."}
            {audience === "citizen" && "Understand local service performance, report problems, and track council response."}
          </p>
        </div>
        {(audience === "council" || audience === "ministry") && (
          <Link href="/briefing" className={cn(buttonVariants())}>Open briefing</Link>
        )}
      </div>

      <KpiRibbon kpis={dash.kpi} />

      {audience === "council" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <HotspotMap districts={dash.districts} />
            <SummaryTable title="Service categories" rows={categories} />
          </div>
          <section>
            <h2 className="mb-3 font-brand text-xl text-brand">Citizen-report inbox</h2>
            <CitizenReportsClient mode="manage" reports={serializedReports} places={places} categories={uniqueSorted(rows, "service_category")} />
          </section>
        </>
      ) : null}

      {audience === "ministry" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SummaryTable title="Provincial comparison" rows={provinces} />
          <SummaryTable title="Service-category comparison" rows={categories} />
        </div>
      ) : null}

      {audience === "business" || audience === "researcher" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryTable title="Aggregate provincial signals" rows={provinces} />
            <SummaryTable title="Aggregate service signals" rows={categories} />
          </div>
          {audience === "researcher" ? (
            <Card>
              <CardHeader><CardTitle className="text-brand">Dataset methodology</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
                <div><strong>Coverage</strong><p>720 monthly aggregates · January–June 2026</p></div>
                <div><strong>Geography</strong><p>10 provinces · 20 districts</p></div>
                <div><strong>Privacy</strong><p>No resident-level personal data in the analytical extract</p></div>
              </CardContent>
            </Card>
          ) : null}
          {user.role !== "admin" ? (
            <DataAccessRequestClient
              requests={serializedAccessRequests}
              grants={serializedGrants}
            />
          ) : null}
        </>
      ) : null}

      {audience === "citizen" ? (
        <>
          <SummaryTable title="National service summary" rows={categories} />
          <CitizenReportsClient mode="citizen" reports={serializedReports} places={places} categories={uniqueSorted(rows, "service_category")} />
        </>
      ) : null}
    </div>
  );
}
