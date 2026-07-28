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
  `CREATE TABLE IF NOT EXISTS authorities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  kind VARCHAR(32) NOT NULL DEFAULT 'council',
  province TEXT,
  districts JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL,
  audience VARCHAR(24),
  assigned_districts JSONB NOT NULL DEFAULT '[]',
  assigned_provinces JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS audience VARCHAR(24)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP`,
  `CREATE TABLE IF NOT EXISTS authority_memberships (
  authority_id TEXT NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL,
  assigned_districts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (authority_id, user_id)
)`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  kind VARCHAR(32) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  authority_id TEXT REFERENCES authorities(id),
  actor_id TEXT REFERENCES users(id),
  action VARCHAR(80) NOT NULL,
  subject_type VARCHAR(60) NOT NULL,
  subject_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
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
  `ALTER TABLE action_items ADD COLUMN IF NOT EXISTS authority_id TEXT REFERENCES authorities(id)`,
  `CREATE TABLE IF NOT EXISTS action_comments (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS citizen_reports (
  id TEXT PRIMARY KEY,
  reference VARCHAR(24) NOT NULL UNIQUE,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location_detail TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'submitted',
  ai_priority VARCHAR(16) DEFAULT 'medium',
  ai_score VARCHAR(8),
  ai_rationale TEXT,
  workflow_action_id TEXT REFERENCES action_items(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `ALTER TABLE citizen_reports ALTER COLUMN reporter_id DROP NOT NULL`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS authority_id TEXT REFERENCES authorities(id)`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS reporter_email TEXT`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(16) DEFAULT 'medium'`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS ai_score VARCHAR(8)`,
  `ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS ai_rationale TEXT`,
  `CREATE TABLE IF NOT EXISTS authority_datasets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  authority_name TEXT NOT NULL,
  province TEXT,
  district TEXT,
  filename TEXT NOT NULL,
  row_count VARCHAR(16) NOT NULL DEFAULT '0',
  columns JSONB NOT NULL DEFAULT '[]',
  quality_score VARCHAR(16) NOT NULL DEFAULT '0',
  validation JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(24) NOT NULL DEFAULT 'uploaded',
  csv_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `ALTER TABLE authority_datasets ADD COLUMN IF NOT EXISTS authority_id TEXT REFERENCES authorities(id)`,
  `ALTER TABLE authority_datasets ADD COLUMN IF NOT EXISTS dataset_type VARCHAR(40) NOT NULL DEFAULT 'service_requests'`,
  `ALTER TABLE authority_datasets ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE authority_datasets ADD COLUMN IF NOT EXISTS blob_url TEXT`,
  `CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  authority_id TEXT NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
  dataset_id TEXT REFERENCES authority_datasets(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  ward TEXT,
  latitude TEXT,
  longitude TEXT,
  condition VARCHAR(32) NOT NULL DEFAULT 'unknown',
  commissioned_at TIMESTAMP,
  last_inspected_at TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS wards (
  id TEXT PRIMARY KEY,
  authority_id TEXT NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
  dataset_id TEXT REFERENCES authority_datasets(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  boundary JSONB,
  councillor_name TEXT,
  portfolio TEXT,
  term_start TIMESTAMP,
  term_end TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  message TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  kind VARCHAR(48) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  provider_id TEXT,
  error TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS citizen_report_events (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES citizen_reports(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  status VARCHAR(24) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS data_access_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization TEXT NOT NULL,
  purpose TEXT NOT NULL,
  intended_use TEXT NOT NULL,
  geographies JSONB NOT NULL DEFAULT '[]',
  categories JSONB NOT NULL DEFAULT '[]',
  date_range TEXT NOT NULL,
  licence_accepted_at TIMESTAMP NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'submitted',
  reviewer_id TEXT REFERENCES users(id),
  review_note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS data_access_request_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES data_access_requests(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  status VARCHAR(24) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS data_access_grants (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES data_access_requests(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csv_text TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
)`,
  // Indexes on foreign-key/filter columns — Postgres does not auto-index
  // FKs, and these back real WHERE clauses used across the app.
  `CREATE INDEX IF NOT EXISTS action_items_authority_idx ON action_items (authority_id)`,
  `CREATE INDEX IF NOT EXISTS action_items_assignee_idx ON action_items (assignee_id)`,
  `CREATE INDEX IF NOT EXISTS citizen_reports_authority_idx ON citizen_reports (authority_id)`,
  `CREATE INDEX IF NOT EXISTS citizen_reports_reporter_idx ON citizen_reports (reporter_id)`,
  `CREATE INDEX IF NOT EXISTS citizen_reports_district_idx ON citizen_reports (district)`,
  `CREATE INDEX IF NOT EXISTS authority_datasets_owner_idx ON authority_datasets (owner_id)`,
  `CREATE INDEX IF NOT EXISTS authority_datasets_active_lookup_idx ON authority_datasets (authority_id, dataset_type, status)`,
  `CREATE INDEX IF NOT EXISTS assets_authority_idx ON assets (authority_id)`,
  `CREATE INDEX IF NOT EXISTS wards_authority_idx ON wards (authority_id)`,
  `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)`,
  `CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at)`,
  `CREATE INDEX IF NOT EXISTS citizen_report_events_report_idx ON citizen_report_events (report_id)`,
  `CREATE INDEX IF NOT EXISTS data_access_requests_requester_idx ON data_access_requests (requester_id)`,
  `CREATE INDEX IF NOT EXISTS data_access_grants_request_idx ON data_access_grants (request_id)`,
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
