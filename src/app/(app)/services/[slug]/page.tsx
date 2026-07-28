import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/lib/db";
import { assets, wards } from "@/lib/db/schema";
import { scopeRowsForUser } from "@/lib/access";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import {
  INTEGRATION_CONTRACTS,
  MUNICIPAL_SERVICES,
} from "@/lib/municipal-services";
import { KpiRibbon } from "@/components/dashboard/kpi-ribbon";
import { HotspotMap } from "@/components/map/hotspot-map";
import { RankingCharts } from "@/components/charts/ranking-charts";
import { InsightCards } from "@/components/dashboard/insight-cards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_FILTERS } from "@/lib/types";

export default async function MunicipalServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = MUNICIPAL_SERVICES.find((item) => item.slug === slug);
  if (!service || !["roads", "waste", "water", "assets", "wards"].includes(slug)) {
    notFound();
  }

  if (slug === "assets" || slug === "wards") {
    const contract = INTEGRATION_CONTRACTS[slug];
    const session = await auth();
    const authorityId = session?.user.authorityId;
    await ensureSchema();
    const db = await getDb();
    const records = authorityId
      ? slug === "assets"
        ? await db.select().from(assets).where(eq(assets.authorityId, authorityId))
        : await db.select().from(wards).where(eq(wards.authorityId, authorityId))
      : [];
    return (
      <div className="space-y-5">
        <div>
          <Badge variant={records.length ? "default" : "secondary"}>
            {records.length ? "Operational" : "Awaiting active dataset"}
          </Badge>
          <h1 className="mt-2 font-brand text-3xl font-semibold text-brand">
            {service.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {records.length
              ? `${records.length.toLocaleString()} authoritative records from your council's active ${slug} dataset.`
              : "Upload and activate the authoritative council dataset to operate this module."}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand">
                {records.length ? "Current records" : "Required source"}
              </CardTitle>
              <CardDescription>{contract.source}</CardDescription>
            </CardHeader>
            <CardContent>
              {records.length ? (
                <div className="max-h-80 space-y-2 overflow-auto">
                  {records.slice(0, 100).map((record) => (
                    <div key={record.id} className="rounded border p-2 text-sm">
                      <strong>{"name" in record ? record.name : ""}</strong>
                      <span className="text-muted-foreground">
                        {"district" in record ? ` · ${record.district}` : ""}
                        {"condition" in record ? ` · ${record.condition}` : ""}
                        {"councillorName" in record && record.councillorName
                          ? ` · ${record.councillorName}`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contract.fields.map((field) => (
                    <code key={field} className="rounded bg-secondary px-2 py-1 text-xs">
                      {field}
                    </code>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-brand">Available after connection</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {contract.enables.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Link href="/datasets" className={cn(buttonVariants())}>
          Manage dataset versions
        </Link>
        <Link href="/services" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to municipal services
        </Link>
      </div>
    );
  }

  const session = await auth();
  const { rows } = await getRowsForUser(session!.user);
  const scopedRows = scopeRowsForUser(rows, session!.user);
  const dash = computeDashboard(scopedRows, {
    ...EMPTY_FILTERS,
    categories: [service.category!],
  });
  const exploreHref = `/explore?categories=${encodeURIComponent(service.category!)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge>Operational</Badge>
          <h1 className="mt-2 font-brand text-3xl font-semibold text-brand">
            {service.title}
          </h1>
          <p className="text-sm text-muted-foreground">{service.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={exploreHref} className={cn(buttonVariants({ variant: "outline" }))}>
            Open full explorer
          </Link>
          <Link href="/workflow" className={cn(buttonVariants())}>
            Manage actions
          </Link>
        </div>
      </div>
      <KpiRibbon kpis={dash.kpi} />
      <div className="grid gap-4 xl:grid-cols-2">
        <HotspotMap districts={dash.districts} />
        <RankingCharts
          categories={dash.categories}
          channels={dash.channels}
          settlements={dash.settlements}
          trends={dash.trends}
        />
      </div>
      <section>
        <h2 className="mb-3 font-brand text-xl text-brand">Priority signals</h2>
        <InsightCards insights={dash.insights.slice(0, 4)} />
      </section>
    </div>
  );
}
