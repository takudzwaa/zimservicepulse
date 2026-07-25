import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { loadRequests } from "@/lib/data/loadRequests";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.npm_package_version ?? "0.1.0";
  let dbOk = false;
  let dataRows = 0;
  let error: string | undefined;

  try {
    const { rows } = loadRequests();
    dataRows = rows.length;
  } catch (e) {
    error = e instanceof Error ? e.message : "data load failed";
  }

  try {
    await ensureSchema();
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (e) {
    error = error ?? (e instanceof Error ? e.message : "db failed");
  }

  const ok = dbOk && dataRows > 0;
  return NextResponse.json(
    { ok, db: dbOk, dataRows, version, error },
    { status: ok ? 200 : 503 },
  );
}
