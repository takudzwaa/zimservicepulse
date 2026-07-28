import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/lib/db";
import {
  citizenReportEvents,
  citizenReports,
} from "@/lib/db/schema";

/** Public complaint tracking by reference — no login required. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
  if (reference.length < 6) {
    return NextResponse.json(
      { error: "Provide a valid report reference (e.g. ZSP-…)" },
      { status: 400 },
    );
  }

  await ensureSchema();
  const db = await getDb();
  const [report] = await db
    .select()
    .from(citizenReports)
    .where(eq(citizenReports.reference, reference))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const events = await db
    .select()
    .from(citizenReportEvents)
    .where(eq(citizenReportEvents.reportId, report.id))
    .orderBy(desc(citizenReportEvents.createdAt));

  const pendingStatuses = new Set(["submitted", "acknowledged"]);
  const trackingBucket =
    report.status === "resolved" || report.status === "closed"
      ? "resolved"
      : report.status === "in_progress"
        ? "in_progress"
        : pendingStatuses.has(report.status)
          ? "pending"
          : report.status;

  return NextResponse.json({
    reference: report.reference,
    status: report.status,
    trackingBucket,
    category: report.category,
    district: report.district,
    province: report.province,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    events: events.map((event) => ({
      status: event.status,
      createdAt: event.createdAt.toISOString(),
    })),
  });
}
