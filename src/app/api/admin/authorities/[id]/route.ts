import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { auditEvents, authorities } from "@/lib/db/schema";

const schema = z.object({
  active: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id } = await params;
  await ensureSchema();
  const db = await getDb();
  const [existing] = await db.select().from(authorities).where(eq(authorities.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Authority not found" }, { status: 404 });
  }
  await db
    .update(authorities)
    .set({ active: parsed.data.active, updatedAt: new Date() })
    .where(eq(authorities.id, id));
  await db.insert(auditEvents).values({
    id: nanoid(),
    authorityId: id,
    actorId: session.user.id,
    action: parsed.data.active ? "authority.activated" : "authority.deactivated",
    subjectType: "authority",
    subjectId: id,
  });
  return NextResponse.json({ ok: true });
}
