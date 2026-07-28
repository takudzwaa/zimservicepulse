import { asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { auditEvents, authorities } from "@/lib/db/schema";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100),
  kind: z.enum(["council", "ministry", "national_baseline"]).default("council"),
  province: z.string().trim().max(100).optional(),
  districts: z.array(z.string().trim().min(1)).max(100).default([]),
});

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureSchema();
  const db = await getDb();
  return NextResponse.json({
    authorities: await db.select().from(authorities).orderBy(asc(authorities.name)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid authority" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  await db.insert(authorities).values({ id, ...parsed.data, province: parsed.data.province || null });
  await db.insert(auditEvents).values({
    id: nanoid(),
    actorId: session.user.id,
    authorityId: id,
    action: "authority.created",
    subjectType: "authority",
    subjectId: id,
  });
  return NextResponse.json({ id }, { status: 201 });
}
