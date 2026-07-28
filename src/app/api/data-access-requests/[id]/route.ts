import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
import { getAllRows } from "@/lib/data/dashboard";

const reviewSchema = z.object({
  status: z.enum(["changes_requested", "approved", "rejected"]),
  note: z.string().trim().min(3).max(1000),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReviewDataAccess(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const { id } = await ctx.params;
  const found = await db
    .select()
    .from(dataAccessRequests)
    .where(eq(dataAccessRequests.id, id))
    .limit(1);
  if (!found.length) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  await db
    .update(dataAccessRequests)
    .set({
      status: parsed.data.status,
      reviewerId: session.user.id,
      reviewNote: parsed.data.note,
      updatedAt: new Date(),
    })
    .where(eq(dataAccessRequests.id, id));
  await db.insert(dataAccessRequestEvents).values({
    id: nanoid(),
    requestId: id,
    actorId: session.user.id,
    status: parsed.data.status,
    note: parsed.data.note,
  });
  let grantId: string | undefined;
  if (parsed.data.status === "approved") {
    const request = found[0]!;
    const geographies = request.geographies ?? [];
    const categories = request.categories ?? [];
    const { rows } = getAllRows();
    const scoped = rows.filter(
      (row) =>
        (!geographies.length ||
          geographies.includes(row.province) ||
          geographies.includes(row.district)) &&
        (!categories.length || categories.includes(row.service_category)),
    );
    const header = Object.keys(scoped[0] ?? {}).join(",");
    const csv = scoped
      .map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    grantId = nanoid();
    await db.insert(dataAccessGrants).values({
      id: grantId,
      requestId: request.id,
      requesterId: request.requesterId,
      csvText: `${header}\n${csv}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    });
  }
  return NextResponse.json({ ok: true, grantId });
}
