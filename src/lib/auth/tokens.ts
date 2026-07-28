import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ensureSchema, getDb } from "@/lib/db";
import { authTokens } from "@/lib/db/schema";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(input: {
  email: string;
  kind: "invite" | "password_reset" | "report_verification";
  userId?: string;
  payload?: Record<string, unknown>;
  ttlMinutes?: number;
}) {
  await ensureSchema();
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  await db.insert(authTokens).values({
    id: nanoid(),
    userId: input.userId,
    email: input.email.toLowerCase(),
    kind: input.kind,
    tokenHash: hashToken(token),
    payload: input.payload ?? {},
    expiresAt: new Date(Date.now() + (input.ttlMinutes ?? 60) * 60_000),
  });
  return token;
}

export async function consumeAuthToken(token: string, kind: string) {
  await ensureSchema();
  const db = await getDb();
  const [record] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.kind, kind),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) return null;
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, record.id));
  return record;
}
