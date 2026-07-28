export type MunicipalService = {
  slug: string;
  title: string;
  description: string;
  state: "Operational" | "Integration ready";
  href: string;
  category?: string;
};

export const MUNICIPAL_SERVICES: MunicipalService[] = [
  {
    slug: "requests",
    title: "Service request management",
    description:
      "Triage reported cases, track status and route priority work into accountable actions.",
    state: "Operational",
    href: "/workflow",
  },
  {
    slug: "assets",
    title: "Asset management",
    description:
      "Connect roads, pipes, vehicles and other council assets to service history and lifecycle planning.",
    state: "Integration ready",
    href: "/services/assets",
  },
  {
    slug: "roads",
    title: "Road & infrastructure inspections",
    description:
      "Investigate road and transport pressure with category-specific hotspots, trends and actions.",
    state: "Operational",
    href: "/services/roads",
    category: "Roads & transport",
  },
  {
    slug: "waste",
    title: "Waste collection tracking",
    description:
      "Monitor unresolved waste demand, collection pressure and district performance.",
    state: "Operational",
    href: "/services/waste",
    category: "Waste management",
  },
  {
    slug: "water",
    title: "Water outage reporting",
    description:
      "Surface water and sanitation reports, prioritise outages and follow resolution performance.",
    state: "Operational",
    href: "/services/water",
    category: "Water & sanitation",
  },
  {
    slug: "performance",
    title: "Performance dashboards",
    description:
      "Track demand, backlog, on-time resolution and satisfaction from national to district level.",
    state: "Operational",
    href: "/explore",
  },
  {
    slug: "wards",
    title: "Ward & councillor analytics",
    description:
      "Connect ward boundaries and elected-member portfolios for representative performance reporting.",
    state: "Integration ready",
    href: "/services/wards",
  },
  {
    slug: "gis",
    title: "GIS mapping of issues",
    description:
      "Map demand and pressure hotspots to pinpoint where crews and interventions are needed.",
    state: "Operational",
    href: "/explore#hotspot-map",
  },
  {
    slug: "forecast",
    title: "AI-powered demand forecasting",
    description:
      "Project next-month demand and backlog from observed trends with a transparent formula.",
    state: "Operational",
    href: "/analysis#forecast",
  },
];

export const INTEGRATION_CONTRACTS: Record<
  "assets" | "wards",
  { source: string; fields: string[]; enables: string[] }
> = {
  assets: {
    source: "Council asset register",
    fields: [
      "asset_id",
      "asset_type",
      "name",
      "district",
      "ward",
      "latitude",
      "longitude",
      "condition",
      "commissioned_at",
      "last_inspected_at",
    ],
    enables: [
      "Case-to-asset repair history",
      "Condition and inspection dashboards",
      "Lifecycle and maintenance planning",
    ],
  },
  wards: {
    source: "Ward boundary and councillor portfolio records",
    fields: [
      "ward_id",
      "ward_name",
      "district",
      "boundary_geojson",
      "councillor_name",
      "portfolio",
      "term_start",
      "term_end",
    ],
    enables: [
      "Ward-level service performance",
      "Councillor portfolio dashboards",
      "Representative briefing packs",
    ],
  },
};
