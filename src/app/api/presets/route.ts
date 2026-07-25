import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { filterPresets } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const filters = body.filters ?? {};
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  await db.insert(filterPresets).values({
    id,
    userId: session.user.id,
    name,
    filters,
  });
  return NextResponse.json({ id });
}
