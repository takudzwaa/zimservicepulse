import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { scoreComplaintTriage } from "@/lib/ai/algorithms";
import { ensureSchema, getDb } from "@/lib/db";
import { authorities, citizenReports } from "@/lib/db/schema";

type Payload = {
  email: string;
  province: string;
  district: string;
  category: string;
  description: string;
  locationDetail?: string;
};

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const record = await consumeAuthToken(token, "report_verification");
  if (!record) {
    return NextResponse.redirect(new URL("/?report=invalid", req.url));
  }
  const data = record.payload as Payload;
  const triage = scoreComplaintTriage(data);
  await ensureSchema();
  const db = await getDb();
  const authority = (await db.select().from(authorities)).find(
    (item) => item.active && item.districts.includes(data.district),
  );
  const id = nanoid();
  const reference = `ZSP-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
  await db.insert(citizenReports).values({
    id,
    reference,
    authorityId: authority?.id ?? null,
    reporterEmail: record.email,
    emailVerifiedAt: new Date(),
    province: data.province,
    district: data.district,
    category: data.category,
    description: data.description,
    locationDetail: data.locationDetail ?? null,
    aiPriority: triage.priority,
    aiScore: String(triage.score),
    aiRationale: triage.rationale,
  });
  // Public reporters have no user row, so an actor-less status is represented by
  // the report itself until the council performs the first authenticated update.
  return NextResponse.redirect(new URL(`/?report=${encodeURIComponent(reference)}`, req.url));
}
