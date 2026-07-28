import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthToken } from "@/lib/auth/tokens";
import { ensureSchema, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: true });
  if (
    !(await checkRateLimit({
      request: req,
      namespace: "password-reset",
      identifier: parsed.data.email.toLowerCase(),
      max: 3,
      windowMinutes: 60,
    }))
  ) return NextResponse.json({ ok: true });
  await ensureSchema();
  const db = await getDb();
  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user && !user.disabledAt) {
    const token = await createAuthToken({
      email,
      userId: user.id,
      kind: "password_reset",
      ttlMinutes: 30,
    });
    const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    await sendEmail({
      to: email,
      userId: user.id,
      kind: "password_reset",
      subject: "Reset your ZimServicePulse password",
      text: `Reset your password within 30 minutes:\n\n${origin}/reset-password?token=${encodeURIComponent(token)}`,
    });
  }
  return NextResponse.json({ ok: true });
}
