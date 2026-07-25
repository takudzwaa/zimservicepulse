import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { computeDashboard, getAllRows } from "@/lib/data/dashboard";
import { ensureSchema, getDb } from "@/lib/db";
import { actionItems } from "@/lib/db/schema";
import { EMPTY_FILTERS } from "@/lib/types";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rows } = getAllRows();
  const { insights } = computeDashboard(rows, EMPTY_FILTERS);
  await ensureSchema();
  const db = await getDb();
  let created = 0;
  for (const insight of insights) {
    const key = `insight:${insight.id}`;
    const existing = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.idempotencyKey, key))
      .limit(1);
    if (existing.length) continue;
    await db.insert(actionItems).values({
      id: nanoid(),
      idempotencyKey: key,
      title: insight.action_title,
      body: insight.action_body,
      severity: insight.severity,
      kind: insight.kind,
      status: "open",
    });
    created += 1;
  }
  return NextResponse.json({ created });
}
