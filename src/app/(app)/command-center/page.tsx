import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import { CommandCenterClient } from "@/components/dashboard/command-center-client";
import { ensureSchema, getDb } from "@/lib/db";
import { alertsRead } from "@/lib/db/schema";
import { EMPTY_FILTERS } from "@/lib/types";
import { scopeRowsForUser } from "@/lib/access";

export default async function CommandCenterPage() {
  const session = await auth();
  const { rows: allRows } = await getRowsForUser(session!.user);
  const rows = scopeRowsForUser(allRows, session!.user);
  const dash = computeDashboard(rows, EMPTY_FILTERS);

  await ensureSchema();
  const db = await getDb();
  const readRows = await db
    .select()
    .from(alertsRead)
    .where(eq(alertsRead.userId, session!.user.id));

  return (
    <CommandCenterClient
      alerts={dash.insights}
      readIds={readRows.map((r) => r.alertId)}
      rising={dash.rising}
    />
  );
}
