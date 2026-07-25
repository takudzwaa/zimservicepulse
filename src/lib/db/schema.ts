import {
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  role: varchar("role", { length: 40 }).notNull(),
  assignedDistricts: jsonb("assigned_districts").$type<string[]>().notNull().default([]),
  assignedProvinces: jsonb("assigned_provinces").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const filterPresets = pgTable("filter_presets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, string[]>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alertsRead = pgTable(
  "alerts_read",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    alertId: text("alert_id").notNull(),
    readAt: timestamp("read_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.alertId] })],
);

export const actionItems = pgTable("action_items", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  assigneeId: text("assignee_id").references(() => users.id),
  district: text("district"),
  category: text("category"),
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const actionComments = pgTable("action_comments", {
  id: text("id").primaryKey(),
  actionId: text("action_id")
    .notNull()
    .references(() => actionItems.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type FilterPreset = typeof filterPresets.$inferSelect;
