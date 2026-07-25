import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  computeDashboard,
  getAllRows,
  loadProvinceGeojson,
  parseFilters,
} from "@/lib/data/dashboard";
import { ExploreClient } from "@/components/dashboard/explore-client";
import { ensureSchema, getDb } from "@/lib/db";
import { filterPresets } from "@/lib/db/schema";
import type { FilterState } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const filters = parseFilters(params);
  const { rows } = getAllRows();
  const dash = computeDashboard(rows, filters);
  const geojson = loadProvinceGeojson();

  await ensureSchema();
  const db = await getDb();
  const presetsRaw = await db
    .select()
    .from(filterPresets)
    .where(eq(filterPresets.userId, session!.user.id));

  const presets = presetsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    filters: { ...EMPTY_FILTERS, ...(p.filters as Partial<FilterState>) },
  }));

  return (
    <Suspense fallback={<div>Loading explorer…</div>}>
      <ExploreClient
        rows={rows}
        initialFilters={filters}
        kpi={dash.kpi}
        districts={dash.districts}
        categories={dash.categories}
        channels={dash.channels}
        settlements={dash.settlements}
        trends={dash.trends}
        insights={dash.insights}
        geojson={geojson}
        presets={presets}
      />
    </Suspense>
  );
}
