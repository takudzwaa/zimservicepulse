import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import {
  canManageCitizenReports,
  canSeeReport,
} from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import {
  actionItems,
  citizenReportEvents,
  citizenReports,
} from "@/lib/db/schema";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageCitizenReports(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureSchema();
  const db = await getDb();
  const { id } = await ctx.params;
  const found = await db
    .select()
    .from(citizenReports)
    .where(eq(citizenReports.id, id))
    .limit(1);
  const report = found[0];
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (!canSeeReport(session.user, report)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (report.workflowActionId) {
    return NextResponse.json({
      id: report.workflowActionId,
      created: false,
    });
  }

  const idempotencyKey = `citizen-report:${report.id}`;
  const existing = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.idempotencyKey, idempotencyKey))
    .limit(1);
  const actionId = existing[0]?.id ?? nanoid();
  if (!existing.length) {
    await db.insert(actionItems).values({
      id: actionId,
      authorityId: report.authorityId,
      idempotencyKey,
      title: `${report.category}: ${report.reference}`,
      body: `${report.description}${report.locationDetail ? ` Location: ${report.locationDetail}.` : ""}`,
      severity: "medium",
      kind: "citizen_report",
      status: "open",
      district: report.district,
      category: report.category,
    });
  }
  await db
    .update(citizenReports)
    .set({
      workflowActionId: actionId,
      status: "acknowledged",
      updatedAt: new Date(),
    })
    .where(eq(citizenReports.id, report.id));
  await db.insert(citizenReportEvents).values({
    id: nanoid(),
    reportId: report.id,
    actorId: session.user.id,
    status: "acknowledged",
    note: "Triaged into the council workflow",
  });
  return NextResponse.json({ id: actionId, created: !existing.length });
}
