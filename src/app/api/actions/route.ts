import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { actionItems } from "@/lib/db/schema";
import type { Insight } from "@/lib/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { insight } = (await req.json()) as { insight: Insight };
  if (!insight?.id) {
    return NextResponse.json({ error: "insight required" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const key = `insight:${insight.id}`;
  const existing = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.idempotencyKey, key))
    .limit(1);
  if (existing.length) {
    return NextResponse.json({ id: existing[0]!.id, created: false });
  }
  const id = nanoid();
  await db.insert(actionItems).values({
    id,
    idempotencyKey: key,
    title: insight.action_title,
    body: insight.action_body,
    severity: insight.severity,
    kind: insight.kind,
    status: "open",
  });
  return NextResponse.json({ id, created: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) patch.status = body.status;
  if ("assigneeId" in body) patch.assigneeId = body.assigneeId;
  await db.update(actionItems).set(patch).where(eq(actionItems.id, id));
  return NextResponse.json({ ok: true });
}
