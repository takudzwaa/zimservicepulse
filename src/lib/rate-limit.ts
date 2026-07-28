import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export async function checkRateLimit(input: {
  request: Request;
  namespace: string;
  identifier?: string;
  max: number;
  windowMinutes: number;
}): Promise<boolean> {
  const forwarded = input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = `${input.namespace}:${forwarded ?? "unknown"}:${input.identifier ?? ""}`;
  const bucketMs = input.windowMinutes * 60_000;
  const windowStart = Math.floor(Date.now() / bucketMs) * bucketMs;
  const id = createHash("sha256").update(`${raw}:${windowStart}`).digest("hex");
  await ensureSchema();
  const db = await getDb();
  await db
    .insert(rateLimits)
    .values({ id, count: 1, expiresAt: new Date(windowStart + bucketMs) })
    .onConflictDoUpdate({
      target: rateLimits.id,
      set: { count: sql`${rateLimits.count} + 1` },
    });
  const [record] = await db.select().from(rateLimits).where(eq(rateLimits.id, id)).limit(1);
  return Boolean(record && record.count <= input.max);
}
