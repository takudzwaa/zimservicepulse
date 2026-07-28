import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  canManageCitizenReports,
  canSubmitCitizenReports,
} from "@/lib/access";
import { getRowsForUser } from "@/lib/data/dashboard";
import { uniqueSorted } from "@/lib/data/filter-utils";
import { ensureSchema, getDb } from "@/lib/db";
import {
  citizenReportEvents,
  citizenReports,
} from "@/lib/db/schema";
import {
  ComplaintsClient,
  type ComplaintView,
} from "@/components/dashboard/complaints-client";
import { Badge } from "@/components/ui/badge";

export default async function ComplaintsPage() {
  const session = await auth();
  const user = session!.user;
  const { rows } = await getRowsForUser(user);

  await ensureSchema();
  const db = await getDb();

  let reports;
  if (canManageCitizenReports(user)) {
    reports =
      user.role === "admin"
        ? await db
            .select()
            .from(citizenReports)
            .orderBy(desc(citizenReports.createdAt))
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
  } else {
    reports = await db
      .select()
      .from(citizenReports)
      .where(eq(citizenReports.reporterId, user.id))
      .orderBy(desc(citizenReports.createdAt));
  }

  const reportIds = reports.map((r) => r.id);
  const events = reportIds.length
    ? await db
        .select()
        .from(citizenReportEvents)
        .where(inArray(citizenReportEvents.reportId, reportIds))
        .orderBy(desc(citizenReportEvents.createdAt))
    : [];

  const serialized: ComplaintView[] = reports.map((report) => ({
    id: report.id,
    reference: report.reference,
    province: report.province,
    district: report.district,
    category: report.category,
    description: report.description,
    locationDetail: report.locationDetail,
    status: report.status,
    aiPriority: report.aiPriority,
    aiScore: report.aiScore,
    aiRationale: report.aiRationale,
    workflowActionId: report.workflowActionId,
    createdAt: report.createdAt.toISOString(),
    events: events
      .filter((event) => event.reportId === report.id)
      .map((event) => ({
        id: event.id,
        status: event.status,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
      })),
  }));

  const places = Array.from(
    new Map(
      rows.map((row) => [
        `${row.province}||${row.district}`,
        { province: row.province, district: row.district },
      ]),
    ).values(),
  ).sort(
    (a, b) =>
      a.province.localeCompare(b.province) ||
      a.district.localeCompare(b.district),
  );

  const canManage = canManageCitizenReports(user);
  const canSubmit = canSubmitCitizenReports(user) || canManage;
  const mode =
    canManage && canSubmit
      ? "mixed"
      : canManage
        ? "manage"
        : "citizen";

  return (
    <div className="space-y-4">
      <div>
        <Badge variant="secondary" className="mb-2">
          Complaints & case tracking
        </Badge>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Complaints center
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Citizens send service complaints and track whether they are{" "}
          <strong>Pending</strong>, <strong>In progress</strong>, or{" "}
          <strong>Resolved</strong>. Councils acknowledge, update status, and
          triage into workflow — with ComplaintTriage Assist priority scores.
        </p>
      </div>
      <ComplaintsClient
        mode={mode}
        reports={serialized}
        places={places}
        categories={uniqueSorted(rows, "service_category")}
      />
    </div>
  );
}
