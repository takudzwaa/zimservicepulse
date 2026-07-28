import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { actionComments, actionItems } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "external_user") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { actionId, body } = await req.json();
  if (!actionId || !body?.trim()) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const [action] = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.id, actionId))
    .limit(1);
  if (
    !action ||
    (session.user.role !== "admin" &&
      action.authorityId !== (session.user.authorityId ?? null))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const id = nanoid();
  await db.insert(actionComments).values({
    id,
    actionId,
    userId: session.user.id,
    body: String(body).trim(),
  });
  return NextResponse.json({ id });
}
