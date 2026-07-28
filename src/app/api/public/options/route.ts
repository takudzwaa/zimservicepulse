import { NextResponse } from "next/server";
import { getAllRows } from "@/lib/data/dashboard";

export async function GET() {
  const { rows } = getAllRows();
  const provinces = [...new Set(rows.map((row) => row.province))].sort();
  const districts = rows.reduce<Record<string, string[]>>((result, row) => {
    result[row.province] ??= [];
    if (!result[row.province].includes(row.district)) result[row.province].push(row.district);
    return result;
  }, {});
  Object.values(districts).forEach((items) => items.sort());
  const categories = [...new Set(rows.map((row) => row.service_category))].sort();
  return NextResponse.json({ provinces, districts, categories });
}
