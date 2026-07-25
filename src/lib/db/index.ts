import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import * as schema from "./schema";

export type AppDb =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

declare global {
  var __zsp_db: AppDb | undefined;
  var __zsp_pglite: PGlite | undefined;
  var __zsp_ready: Promise<void> | undefined;
}

async function createDb(): Promise<AppDb> {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    const sql = neon(url);
    return drizzleNeon(sql, { schema });
  }

  const dataDir = path.join(process.cwd(), "data", "pglite");
  const client = global.__zsp_pglite ?? new PGlite(dataDir);
  global.__zsp_pglite = client;
  await client.waitReady;
  return drizzlePglite(client, { schema });
}

export async function getDb(): Promise<AppDb> {
  if (!global.__zsp_db) {
    global.__zsp_db = await createDb();
  }
  return global.__zsp_db;
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL,
  assigned_districts JSONB NOT NULL DEFAULT '[]',
  assigned_provinces JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS filter_presets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS alerts_read (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  read_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, alert_id)
)`,
  `CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity VARCHAR(16) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  assignee_id TEXT REFERENCES users(id),
  district TEXT,
  category TEXT,
  channel TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS action_comments (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
];

export async function ensureSchema(): Promise<void> {
  if (global.__zsp_ready) return global.__zsp_ready;
  global.__zsp_ready = (async () => {
    const url = process.env.DATABASE_URL;
    if (url && url.startsWith("postgres")) {
      const sql = neon(url);
      for (const stmt of STATEMENTS) {
        // neon HTTP client exposes .query for raw DDL strings
        await (sql as unknown as { query: (q: string) => Promise<unknown> }).query(
          stmt,
        );
      }
      return;
    }
    const dataDir = path.join(process.cwd(), "data", "pglite");
    const client = global.__zsp_pglite ?? new PGlite(dataDir);
    global.__zsp_pglite = client;
    await client.waitReady;
    for (const stmt of STATEMENTS) {
      await client.exec(stmt);
    }
  })();
  return global.__zsp_ready;
}
