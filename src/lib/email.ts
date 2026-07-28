import { nanoid } from "nanoid";
import { ensureSchema, getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  kind: string;
  userId?: string;
};

export async function sendEmail(input: EmailInput): Promise<void> {
  await ensureSchema();
  const db = await getDb();
  const id = nanoid();
  await db.insert(notifications).values({
    id,
    userId: input.userId,
    email: input.to.toLowerCase(),
    kind: input.kind,
    subject: input.subject,
    body: input.text,
  });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      await db
        .update(notifications)
        .set({ status: "failed", error: "Email provider is not configured" })
        .where((await import("drizzle-orm")).eq(notifications.id, id));
      throw new Error("Email provider is not configured");
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
  });
  const result = (await response.json()) as { id?: string; message?: string };
  await db
    .update(notifications)
    .set(
      response.ok
        ? { status: "sent", providerId: result.id, sentAt: new Date() }
        : { status: "failed", error: result.message ?? "Email delivery failed" },
    )
    .where((await import("drizzle-orm")).eq(notifications.id, id));
  if (!response.ok) throw new Error(result.message ?? "Email delivery failed");
}
