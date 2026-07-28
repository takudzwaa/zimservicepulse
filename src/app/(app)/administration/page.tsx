import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureSchema, getDb } from "@/lib/db";
import { authorities, authTokens } from "@/lib/db/schema";
import { AdministrationClient } from "@/components/dashboard/administration-client";

export default async function AdministrationPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/dashboard");
  await ensureSchema();
  const db = await getDb();
  const rows = await db.select().from(authorities).orderBy(asc(authorities.name));
  const invitations = await db
    .select()
    .from(authTokens)
    .where(eq(authTokens.kind, "invite"))
    .orderBy(desc(authTokens.createdAt))
    .limit(20);
  return (
    <AdministrationClient
      authorities={rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        kind: row.kind,
        active: row.active,
      }))}
      invitations={invitations.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        usedAt: row.usedAt ? row.usedAt.toISOString() : null,
      }))}
    />
  );
}
