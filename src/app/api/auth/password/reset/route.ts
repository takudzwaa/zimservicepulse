import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { ensureSchema, getDb } from "@/lib/db";
import { auditEvents, users } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(12).max(128),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
  }
  const record = await consumeAuthToken(parsed.data.token, "password_reset");
  if (!record?.userId) {
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  await db
    .update(users)
    .set({ pinHash: await hash(parsed.data.password, 12), emailVerifiedAt: new Date() })
    .where(eq(users.id, record.userId));
  await db.insert(auditEvents).values({
    id: nanoid(),
    actorId: record.userId,
    action: "password.reset",
    subjectType: "user",
    subjectId: record.userId,
  });
  return NextResponse.json({ ok: true });
}
