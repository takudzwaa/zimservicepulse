import { getRowsForUser } from "@/lib/data/dashboard";
import { BriefingClient } from "./briefing-client";
import { auth } from "@/lib/auth";
import { scopeRowsForUser } from "@/lib/access";

export default async function BriefingPage() {
  const session = await auth();
  const { rows: allRows } = await getRowsForUser(session!.user);
  const rows = scopeRowsForUser(allRows, session!.user);
  return <BriefingClient rows={rows} />;
}
