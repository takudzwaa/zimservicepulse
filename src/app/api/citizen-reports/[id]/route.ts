import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  canManageCitizenReports,
  canSeeReport,
} from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import {
  citizenReportEvents,
  citizenReports,
} from "@/lib/db/schema";
import type { CitizenReportStatus } from "@/lib/types";
import { sendEmail } from "@/lib/email";

const updateSchema = z.object({
  status: z.enum([
    "acknowledged",
    "in_progress",
    "resolved",
    "closed",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageCitizenReports(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
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
  await db
    .update(citizenReports)
    .set({
      status: parsed.data.status as CitizenReportStatus,
      updatedAt: new Date(),
    })
    .where(eq(citizenReports.id, id));
  await db.insert(citizenReportEvents).values({
    id: nanoid(),
    reportId: id,
    actorId: session.user.id,
    status: parsed.data.status,
    note: parsed.data.note || null,
  });
  if (report.reporterEmail) {
    await sendEmail({
      to: report.reporterEmail,
      kind: "report_status",
      subject: `Update for report ${report.reference}`,
      text: `Your service report is now ${parsed.data.status.replaceAll("_", " ")}. Track it at ${(process.env.NEXTAUTH_URL ?? new URL(req.url).origin)}/#track using reference ${report.reference}.`,
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
