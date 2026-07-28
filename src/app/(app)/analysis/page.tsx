import { computeDashboard, compareCohorts, getRowsForUser } from "@/lib/data/dashboard";
import { AnalysisClient } from "@/components/dashboard/analysis-client";
import { EMPTY_FILTERS } from "@/lib/types";
import { uniqueSorted } from "@/lib/data/filter-utils";
import { auth } from "@/lib/auth";
import { scopeRowsForUser } from "@/lib/access";

export default async function AnalysisPage() {
  const session = await auth();
  const { rows: allRows } = await getRowsForUser(session!.user);
  const rows = scopeRowsForUser(allRows, session!.user);
  const dash = computeDashboard(rows, EMPTY_FILTERS);
  const provinces = uniqueSorted(rows, "province");
  const initialCompare = compareCohorts(
    rows,
    "province",
    provinces[0] ?? "Harare",
    provinces[1] ?? provinces[0] ?? "Harare",
  );

  return (
    <AnalysisClient
      rows={rows}
      channelRoiData={dash.channelRoi}
      aging={dash.aging}
      forecast={dash.forecast}
      initialCompare={initialCompare}
    />
  );
}
