import { auth } from "@/lib/auth";
import { scopeRowsForUser } from "@/lib/access";
import { runLiveAlgorithms } from "@/lib/ai/algorithms";
import { getRowsForUser } from "@/lib/data/dashboard";
import { generateInsights } from "@/lib/insights";
import { IntelligenceClient } from "@/components/dashboard/intelligence-client";

export default async function IntelligencePage() {
  const session = await auth();
  const user = session!.user;
  const { rows } = await getRowsForUser(user);
  const scoped = scopeRowsForUser(rows, user);
  const runs = runLiveAlgorithms(scoped);
  const insights = generateInsights(scoped);

  // Serialize for client (strip non-serializable if any)
  const serialRuns = runs.map((run) => ({
    ...run,
    outputs: undefined,
  }));

  return <IntelligenceClient runs={serialRuns} insights={insights} />;
}
