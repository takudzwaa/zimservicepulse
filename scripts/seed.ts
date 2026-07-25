import { ensureSchema } from "../src/lib/db";
import { seedDemoUsers, DEMO_PIN } from "../src/lib/db/seed";

async function main() {
  await ensureSchema();
  await seedDemoUsers();
  console.log(`Seeded demo users (PIN: ${DEMO_PIN})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
