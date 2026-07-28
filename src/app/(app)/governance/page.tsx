import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { dataAccessRequests } from "@/lib/db/schema";
import { GovernanceReviewClient } from "@/components/dashboard/stakeholder-workspace-client";

export default async function GovernancePage() {
  const session = await auth();
  if (session!.user.role !== "admin") redirect("/stakeholders");
  await ensureSchema();
  const db = await getDb();
  const requests = await db
    .select()
    .from(dataAccessRequests)
    .orderBy(desc(dataAccessRequests.createdAt));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Data-access governance
        </h1>
        <p className="text-sm text-muted-foreground">
          Review governed Business and Researcher requests with an auditable decision note.
        </p>
      </div>
      <GovernanceReviewClient
        requests={requests.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
