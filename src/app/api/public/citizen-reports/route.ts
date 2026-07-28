import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthToken } from "@/lib/auth/tokens";
import { getAllRows } from "@/lib/data/dashboard";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(200),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(2000),
  locationDetail: z.string().trim().max(300).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  if (process.env.PUBLIC_REPORTING_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Public reporting is temporarily unavailable" },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the report details" }, { status: 400 });
  }
  if (
    !(await checkRateLimit({
      request: req,
      namespace: "public-report",
      identifier: parsed.data.email.toLowerCase(),
      max: 5,
      windowMinutes: 60,
    }))
  ) {
    return NextResponse.json({ error: "Too many reports; try again later" }, { status: 429 });
  }
  const { rows } = getAllRows();
  const validPlace = rows.some(
    (row) => row.province === parsed.data.province && row.district === parsed.data.district,
  );
  const validCategory = rows.some((row) => row.service_category === parsed.data.category);
  if (!validPlace || !validCategory) {
    return NextResponse.json({ error: "Unknown service area or category" }, { status: 400 });
  }
  const token = await createAuthToken({
    email: parsed.data.email,
    kind: "report_verification",
    ttlMinutes: 30,
    payload: parsed.data,
  });
  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  await sendEmail({
    to: parsed.data.email,
    kind: "report_verification",
    subject: "Verify your ZimServicePulse report",
    text: `Verify and submit your service report within 30 minutes:\n\n${origin}/api/public/citizen-reports/verify?token=${encodeURIComponent(token)}`,
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
