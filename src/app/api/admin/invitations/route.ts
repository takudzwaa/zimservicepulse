import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createAuthToken } from "@/lib/auth/tokens";
import { ensureSchema, getDb } from "@/lib/db";
import { auditEvents, authorityMemberships, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  authorityId: z.string().min(1),
  role: z.enum(["district_manager", "provincial_analyst", "channel_lead", "admin"]),
  assignedDistricts: z.array(z.string()).max(100).default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const userId = existing?.id ?? nanoid();
  if (!existing) {
    await db.insert(users).values({
      id: userId,
      name: parsed.data.name,
      email,
      pinHash: await hash(nanoid(48), 12),
      role: parsed.data.role,
      audience: parsed.data.role === "provincial_analyst" ? "ministry" : "council",
      assignedDistricts: parsed.data.assignedDistricts,
      assignedProvinces: [],
    });
  }
  await db
    .insert(authorityMemberships)
    .values({
      authorityId: parsed.data.authorityId,
      userId,
      role: parsed.data.role,
      assignedDistricts: parsed.data.assignedDistricts,
    })
    .onConflictDoUpdate({
      target: [authorityMemberships.authorityId, authorityMemberships.userId],
      set: { role: parsed.data.role, assignedDistricts: parsed.data.assignedDistricts },
    });
  const token = await createAuthToken({
    email,
    userId,
    kind: "invite",
    payload: { authorityId: parsed.data.authorityId },
    ttlMinutes: 24 * 60,
  });
  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  await sendEmail({
    to: email,
    userId,
    kind: "invite",
    subject: "Your ZimServicePulse invitation",
    text: `Create your password within 24 hours:\n\n${origin}/accept-invite?token=${encodeURIComponent(token)}`,
  });
  await db.insert(auditEvents).values({
    id: nanoid(),
    authorityId: parsed.data.authorityId,
    actorId: session.user.id,
    action: "member.invited",
    subjectType: "user",
    subjectId: userId,
    metadata: { role: parsed.data.role },
  });
  return NextResponse.json({ userId }, { status: 201 });
}
