import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { auditEvents, dataAccessGrants } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const db = await getDb();
  const { id } = await ctx.params;
  const [grant] = await db
    .select()
    .from(dataAccessGrants)
    .where(
      and(
        eq(dataAccessGrants.id, id),
        gt(dataAccessGrants.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!grant || (session.user.role !== "admin" && grant.requesterId !== session.user.id)) {
    return NextResponse.json({ error: "Grant not found or expired" }, { status: 404 });
  }
  await db
    .update(dataAccessGrants)
    .set({ downloadCount: sql`${dataAccessGrants.downloadCount} + 1` })
    .where(eq(dataAccessGrants.id, id));
  await db.insert(auditEvents).values({
    id: nanoid(),
    actorId: session.user.id,
    action: "grant.downloaded",
    subjectType: "data_access_grant",
    subjectId: id,
  });
  return new NextResponse(grant.csvText, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zimservicepulse-grant-${id}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
