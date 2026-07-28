import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canManageCitizenReports, canSubmitCitizenReports } from "@/lib/access";
import { scoreComplaintTriage } from "@/lib/ai/algorithms";
import { getRowsForUser } from "@/lib/data/dashboard";
import { ensureSchema, getDb } from "@/lib/db";
import {
  citizenReportEvents,
  citizenReports,
} from "@/lib/db/schema";

const reportSchema = z.object({
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(2000),
  locationDetail: z.string().trim().max(300).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const db = await getDb();
  const user = session.user;
  let reports;
  if (canManageCitizenReports(user) || user.role === "admin") {
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
  } else {
    reports = await db
      .select()
      .from(citizenReports)
      .where(eq(citizenReports.reporterId, user.id))
      .orderBy(desc(citizenReports.createdAt));
  }
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canSubmitCitizenReports(session.user) && !canManageCitizenReports(session.user)) {
    // Allow operational roles to log on behalf of walk-in citizens too
    return NextResponse.json(
      { error: "Complaint submission access required" },
      { status: 403 },
    );
  }
  const parsed = reportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { rows } = await getRowsForUser(session.user);
  const placeExists = rows.some(
    (row) =>
      row.province === parsed.data.province &&
      row.district === parsed.data.district,
  );
  const categoryExists = rows.some(
    (row) => row.service_category === parsed.data.category,
  );
  if (!placeExists || !categoryExists) {
    return NextResponse.json(
      { error: "Unknown province, district, or service category" },
      { status: 400 },
    );
  }

  const triage = scoreComplaintTriage({
    description: parsed.data.description,
    category: parsed.data.category,
    locationDetail: parsed.data.locationDetail,
  });

  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  const reference = `ZSP-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
  await db.insert(citizenReports).values({
    id,
    reference,
    authorityId: session.user.authorityId,
    reporterId: session.user.id,
    ...parsed.data,
    locationDetail: parsed.data.locationDetail || null,
    aiPriority: triage.priority,
    aiScore: String(triage.score),
    aiRationale: triage.rationale,
  });
  await db.insert(citizenReportEvents).values({
    id: nanoid(),
    reportId: id,
    actorId: session.user.id,
    status: "submitted",
    note: `Report submitted · ${triage.algorithm} marked ${triage.priority} (${triage.score}/100)`,
  });
  return NextResponse.json(
    {
      id,
      reference,
      status: "submitted",
      trackingBucket: "pending",
      ai: triage,
    },
    { status: 201 },
  );
}
