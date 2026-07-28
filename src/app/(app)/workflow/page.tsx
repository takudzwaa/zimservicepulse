import {
  actionComments,
  actionItems,
  authorityMemberships,
  users,
} from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { WorkflowClient } from "@/components/dashboard/workflow-client";
import type { ActionStatus } from "@/lib/types";

export default async function WorkflowPage() {
  const session = await auth();
  await ensureSchema();
  const db = await getDb();
  const allUsers =
    session!.user.role === "admin"
      ? await db.select().from(users)
      : session!.user.authorityId
        ? (
            await db
              .select({ user: users })
              .from(authorityMemberships)
              .innerJoin(users, eq(authorityMemberships.userId, users.id))
              .where(eq(authorityMemberships.authorityId, session!.user.authorityId))
          ).map((row) => row.user)
        : [];
  const actions =
    session!.user.role === "admin"
      ? await db.select().from(actionItems)
      : session!.user.authorityId
        ? await db
            .select()
            .from(actionItems)
            .where(eq(actionItems.authorityId, session!.user.authorityId))
        : await db.select().from(actionItems).where(isNull(actionItems.authorityId));
  const comments = await db.select().from(actionComments);

  const userName = new Map(allUsers.map((u) => [u.id, u.name]));

  const enriched = actions.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    kind: a.kind,
    status: a.status as ActionStatus,
    assigneeId: a.assigneeId,
    comments: comments
      .filter((c) => c.actionId === a.id)
      .map((c) => ({
        id: c.id,
        body: c.body,
        userName: userName.get(c.userId) ?? "Unknown",
        createdAt: c.createdAt.toISOString(),
      })),
  }));

  return (
    <WorkflowClient
      actions={enriched}
      users={allUsers.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
