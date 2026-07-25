import { getAllRows, loadProvinceGeojson } from "@/lib/data/dashboard";
import { BriefingClient } from "./briefing-client";

export default async function BriefingPage() {
  const { rows } = getAllRows();
  const geojson = loadProvinceGeojson();
  return <BriefingClient rows={rows} geojson={geojson} />;
}
