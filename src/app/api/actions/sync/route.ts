import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import { ensureSchema, getDb } from "@/lib/db";
import { actionItems } from "@/lib/db/schema";
import { EMPTY_FILTERS } from "@/lib/types";
import { scopeRowsForUser } from "@/lib/access";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "external_user") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { rows: allRows } = await getRowsForUser(session.user);
  const rows = scopeRowsForUser(allRows, session.user);
  const { insights } = computeDashboard(rows, EMPTY_FILTERS);
  await ensureSchema();
  const db = await getDb();

  const keyed = insights.map((insight) => ({
    insight,
    key: `insight:${session.user.authorityId ?? "platform"}:${insight.id}`,
  }));
  const keys = keyed.map(({ key }) => key);
  const existing = keys.length
    ? await db
        .select({ key: actionItems.idempotencyKey })
        .from(actionItems)
        .where(inArray(actionItems.idempotencyKey, keys))
    : [];
  const existingKeys = new Set(existing.map((row) => row.key));
  const toInsert = keyed.filter(({ key }) => !existingKeys.has(key));

  if (toInsert.length) {
    await db
      .insert(actionItems)
      .values(
        toInsert.map(({ insight, key }) => ({
          id: nanoid(),
          authorityId: session.user.authorityId,
          idempotencyKey: key,
          title: insight.action_title,
          body: insight.action_body,
          severity: insight.severity,
          kind: insight.kind,
          status: "open",
        })),
      )
      .onConflictDoNothing({ target: actionItems.idempotencyKey });
  }

  return NextResponse.json({ created: toInsert.length });
}
