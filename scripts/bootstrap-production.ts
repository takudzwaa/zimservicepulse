import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ensureSchema, getDb } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function main() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Set NODE_ENV=production to bootstrap a production administrator");
  }
  const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("INITIAL_ADMIN_EMAIL and a 12+ character INITIAL_ADMIN_PASSWORD are required");
  }
  await ensureSchema();
  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new Error("Administrator already exists; use password recovery instead");
  }
  await db.insert(users).values({
    id: nanoid(),
    name: "Platform Administrator",
    email,
    pinHash: await hash(password, 12),
    role: "admin",
    audience: null,
    assignedDistricts: [],
    assignedProvinces: [],
    emailVerifiedAt: new Date(),
  });
  console.log(`Created production administrator ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
