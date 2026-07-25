import { hash } from "bcryptjs";
import { ensureSchema, getDb } from "./index";
import { users } from "./schema";
import type { UserRole } from "@/lib/types";

const DEMO_PIN = process.env.DEMO_PIN ?? "Zim2026!";

const DEMO_USERS: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedDistricts: string[];
  assignedProvinces: string[];
}[] = [
  {
    id: "usr_dm_chinhoyi",
    name: "Tendai Moyo",
    email: "district@pulse.zw",
    role: "district_manager",
    assignedDistricts: ["Chinhoyi"],
    assignedProvinces: ["Mashonaland West"],
  },
  {
    id: "usr_pa_mashwest",
    name: "Rudo Ncube",
    email: "analyst@pulse.zw",
    role: "provincial_analyst",
    assignedDistricts: [],
    assignedProvinces: ["Mashonaland West", "Harare", "Bulawayo"],
  },
  {
    id: "usr_cl_digital",
    name: "Farai Dube",
    email: "channels@pulse.zw",
    role: "channel_lead",
    assignedDistricts: [],
    assignedProvinces: [],
  },
  {
    id: "usr_admin",
    name: "PulseForge Admin",
    email: "admin@pulse.zw",
    role: "admin",
    assignedDistricts: [],
    assignedProvinces: [],
  },
];

declare global {
  // Ensures pin hashes are refreshed once per process when DEMO_PIN changes.
  // eslint-disable-next-line no-var
  var __zsp_demo_seeded: string | undefined;
}

export async function seedDemoUsers(): Promise<void> {
  // Skip when this process already seeded with the current PIN.
  if (global.__zsp_demo_seeded === DEMO_PIN) return;

  await ensureSchema();
  const db = await getDb();
  const pinHash = await hash(DEMO_PIN, 10);

  for (const u of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        pinHash,
        role: u.role,
        assignedDistricts: u.assignedDistricts,
        assignedProvinces: u.assignedProvinces,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: u.name,
          email: u.email,
          pinHash,
          role: u.role,
          assignedDistricts: u.assignedDistricts,
          assignedProvinces: u.assignedProvinces,
        },
      });
  }

  global.__zsp_demo_seeded = DEMO_PIN;
}

export { DEMO_USERS, DEMO_PIN };
