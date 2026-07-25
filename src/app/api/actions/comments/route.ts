import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { actionComments } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { actionId, body } = await req.json();
  if (!actionId || !body?.trim()) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  await db.insert(actionComments).values({
    id,
    actionId,
    userId: session.user.id,
    body: String(body).trim(),
  });
  return NextResponse.json({ id });
}
