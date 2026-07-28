import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  computeDashboard,
  getRowsForUser,
  parseFilters,
} from "@/lib/data/dashboard";
import { ExploreClient } from "@/components/dashboard/explore-client";
import { ConsoleSkeleton } from "@/components/dashboard/console-skeleton";
import { ensureSchema, getDb } from "@/lib/db";
import { filterPresets } from "@/lib/db/schema";
import type { FilterState } from "@/lib/types";
import { EMPTY_FILTERS } from "@/lib/types";
import { scopeRowsForUser } from "@/lib/access";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const filters = parseFilters(params);
  const { rows: allRows } = await getRowsForUser(session!.user);
  const rows = scopeRowsForUser(allRows, session!.user);
  const dash = computeDashboard(rows, filters);

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
    <Suspense fallback={<ConsoleSkeleton />}>
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
        presets={presets}
      />
    </Suspense>
  );
}
