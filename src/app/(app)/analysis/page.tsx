import { computeDashboard, compareCohorts, getAllRows } from "@/lib/data/dashboard";
import { AnalysisClient } from "@/components/dashboard/analysis-client";
import { EMPTY_FILTERS } from "@/lib/types";
import { uniqueSorted } from "@/lib/data/filter-utils";

export default async function AnalysisPage() {
  const { rows } = getAllRows();
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
