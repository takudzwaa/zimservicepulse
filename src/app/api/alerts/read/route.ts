import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { alertsRead } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { alertId } = await req.json();
  if (!alertId) {
    return NextResponse.json({ error: "alertId required" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  await db
    .insert(alertsRead)
    .values({ userId: session.user.id, alertId: String(alertId) })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
