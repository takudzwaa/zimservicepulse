import {
  actionComments,
  actionItems,
  users,
} from "@/lib/db/schema";
import { ensureSchema, getDb } from "@/lib/db";
import { WorkflowClient } from "@/components/dashboard/workflow-client";
import type { ActionStatus } from "@/lib/types";

export default async function WorkflowPage() {
  await ensureSchema();
  const db = await getDb();
  const allUsers = await db.select().from(users);
  const actions = await db.select().from(actionItems);
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
