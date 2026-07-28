import { hash } from "bcryptjs";
import { ensureSchema, getDb } from "./index";
import { users } from "./schema";
import type { UserRole, WorkspaceAudience } from "@/lib/types";

const DEMO_PIN = process.env.DEMO_PIN ?? "Zim2026!";

const DEMO_USERS: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  audience: WorkspaceAudience | null;
  assignedDistricts: string[];
  assignedProvinces: string[];
}[] = [
  {
    id: "usr_dm_chinhoyi",
    name: "Tendai Moyo",
    email: "district@pulse.zw",
    role: "district_manager",
    audience: "council",
    assignedDistricts: ["Chinhoyi"],
    assignedProvinces: ["Mashonaland West"],
  },
  {
    id: "usr_pa_mashwest",
    name: "Rudo Ncube",
    email: "analyst@pulse.zw",
    role: "provincial_analyst",
    audience: "ministry",
    assignedDistricts: [],
    assignedProvinces: ["Mashonaland West", "Harare", "Bulawayo"],
  },
  {
    id: "usr_cl_digital",
    name: "Farai Dube",
    email: "channels@pulse.zw",
    role: "channel_lead",
    audience: "council",
    assignedDistricts: [],
    assignedProvinces: [],
  },
  {
    id: "usr_admin",
    name: "PulseForge Admin",
    email: "admin@pulse.zw",
    role: "admin",
    audience: null,
    assignedDistricts: [],
    assignedProvinces: [],
  },
  {
    id: "usr_business_demo",
    name: "Nyasha Mavhunga",
    email: "business@pulse.zw",
    role: "external_user",
    audience: "business",
    assignedDistricts: [],
    assignedProvinces: [],
  },
  {
    id: "usr_research_demo",
    name: "Dr. Tariro Zhou",
    email: "research@pulse.zw",
    role: "external_user",
    audience: "researcher",
    assignedDistricts: [],
    assignedProvinces: [],
  },
  {
    id: "usr_citizen_demo",
    name: "Kudzai Ndlovu",
    email: "citizen@pulse.zw",
    role: "external_user",
    audience: "citizen",
    assignedDistricts: [],
    assignedProvinces: [],
  },
];

declare global {
  // Ensures pin hashes are refreshed once per process when DEMO_PIN changes.
  var __zsp_demo_seeded: string | undefined;
}

export async function seedDemoUsers(): Promise<void> {
  if (
    process.env.ALLOW_DEMO_USERS !== "true" &&
    process.env.NODE_ENV === "production"
  ) {
    return;
  }
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
        audience: u.audience,
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
          audience: u.audience,
          assignedDistricts: u.assignedDistricts,
          assignedProvinces: u.assignedProvinces,
        },
      });
  }

  global.__zsp_demo_seeded = DEMO_PIN;
}

export { DEMO_USERS, DEMO_PIN };
