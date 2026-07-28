import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ensureSchema, getDb } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(200),
  organization: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the contact form" }, { status: 400 });
  }
  if (
    !(await checkRateLimit({
      request: req,
      namespace: "contact",
      identifier: parsed.data.email.toLowerCase(),
      max: 5,
      windowMinutes: 60,
    }))
  ) {
    return NextResponse.json({ error: "Too many messages; try again later" }, { status: 429 });
  }
  await ensureSchema();
  const db = await getDb();
  await db.insert(contactMessages).values({
    id: nanoid(),
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    organization: parsed.data.organization || null,
    message: parsed.data.message,
  });
  const destination = process.env.CONTACT_TO_EMAIL;
  if (destination) {
    await sendEmail({
      to: destination,
      kind: "contact",
      subject: `ZimServicePulse enquiry from ${parsed.data.name}`,
      text: `${parsed.data.name} <${parsed.data.email}>\n${parsed.data.organization ?? ""}\n\n${parsed.data.message}`,
    });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
