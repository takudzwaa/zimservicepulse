import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canReviewDataAccess } from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import {
  dataAccessGrants,
  dataAccessRequestEvents,
  dataAccessRequests,
} from "@/lib/db/schema";

const accessRequestSchema = z.object({
  organization: z.string().trim().min(2).max(200),
  purpose: z.string().trim().min(20).max(2000),
  intendedUse: z.string().trim().min(20).max(2000),
  geographies: z.array(z.string().trim().min(1)).max(20).default([]),
  categories: z.array(z.string().trim().min(1)).max(20).default([]),
  dateRange: z.string().trim().min(3).max(100),
  licenceAccepted: z.literal(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const db = await getDb();
  const requests = canReviewDataAccess(session.user)
    ? await db
        .select()
        .from(dataAccessRequests)
        .orderBy(desc(dataAccessRequests.createdAt))
    : await db
        .select()
        .from(dataAccessRequests)
        .where(eq(dataAccessRequests.requesterId, session.user.id))
        .orderBy(desc(dataAccessRequests.createdAt));
  const grants = canReviewDataAccess(session.user)
    ? await db.select().from(dataAccessGrants)
    : await db
        .select()
        .from(dataAccessGrants)
        .where(eq(dataAccessGrants.requesterId, session.user.id));
  return NextResponse.json({
    requests,
    grants: grants.map((grant) => ({
      id: grant.id,
      requestId: grant.requestId,
      requesterId: grant.requesterId,
      expiresAt: grant.expiresAt,
      downloadCount: grant.downloadCount,
      createdAt: grant.createdAt,
      downloadUrl: `/api/data-access-grants/${grant.id}/download`,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    session.user.audience !== "business" &&
    session.user.audience !== "researcher"
  ) {
    return NextResponse.json(
      { error: "Business or researcher workspace access required" },
      { status: 403 },
    );
  }
  const parsed = accessRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid access request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  await db.insert(dataAccessRequests).values({
    id,
    requesterId: session.user.id,
    organization: parsed.data.organization,
    purpose: parsed.data.purpose,
    intendedUse: parsed.data.intendedUse,
    geographies: parsed.data.geographies,
    categories: parsed.data.categories,
    dateRange: parsed.data.dateRange,
    licenceAcceptedAt: new Date(),
  });
  await db.insert(dataAccessRequestEvents).values({
    id: nanoid(),
    requestId: id,
    actorId: session.user.id,
    status: "submitted",
    note: "Data-access request submitted",
  });
  return NextResponse.json({ id, status: "submitted" }, { status: 201 });
}
