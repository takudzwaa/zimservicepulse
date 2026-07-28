import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authorities = pgTable("authorities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  kind: varchar("kind", { length: 32 }).notNull().default("council"),
  province: text("province"),
  districts: jsonb("districts").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  role: varchar("role", { length: 40 }).notNull(),
  audience: varchar("audience", { length: 24 }),
  assignedDistricts: jsonb("assigned_districts").$type<string[]>().notNull().default([]),
  assignedProvinces: jsonb("assigned_provinces").$type<string[]>().notNull().default([]),
  emailVerifiedAt: timestamp("email_verified_at"),
  disabledAt: timestamp("disabled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authorityMemberships = pgTable(
  "authority_memberships",
  {
    authorityId: text("authority_id")
      .notNull()
      .references(() => authorities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 40 }).notNull(),
    assignedDistricts: jsonb("assigned_districts").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.authorityId, t.userId] })],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash)],
);

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  authorityId: text("authority_id").references(() => authorities.id),
  actorId: text("actor_id").references(() => users.id),
  action: varchar("action", { length: 80 }).notNull(),
  subjectType: varchar("subject_type", { length: 60 }).notNull(),
  subjectId: text("subject_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
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

export const actionItems = pgTable(
  "action_items",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    authorityId: text("authority_id").references(() => authorities.id),
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
  },
  (t) => [
    index("action_items_authority_idx").on(t.authorityId),
    index("action_items_assignee_idx").on(t.assigneeId),
  ],
);

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

export const citizenReports = pgTable(
  "citizen_reports",
  {
    id: text("id").primaryKey(),
    reference: varchar("reference", { length: 24 }).notNull().unique(),
    authorityId: text("authority_id").references(() => authorities.id),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    reporterEmail: text("reporter_email"),
    emailVerifiedAt: timestamp("email_verified_at"),
    province: text("province").notNull(),
    district: text("district").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    locationDetail: text("location_detail"),
    status: varchar("status", { length: 24 }).notNull().default("submitted"),
    aiPriority: varchar("ai_priority", { length: 16 }).default("medium"),
    aiScore: varchar("ai_score", { length: 8 }),
    aiRationale: text("ai_rationale"),
    workflowActionId: text("workflow_action_id").references(() => actionItems.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("citizen_reports_authority_idx").on(t.authorityId),
    index("citizen_reports_reporter_idx").on(t.reporterId),
    index("citizen_reports_district_idx").on(t.district),
  ],
);

/** Local-authority uploaded datasets for council-managed operational data. */
export const authorityDatasets = pgTable(
  "authority_datasets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorityId: text("authority_id").references(() => authorities.id),
    name: text("name").notNull(),
    description: text("description"),
    authorityName: text("authority_name").notNull(),
    province: text("province"),
    district: text("district"),
    filename: text("filename").notNull(),
    datasetType: varchar("dataset_type", { length: 40 }).notNull().default("service_requests"),
    version: integer("version").notNull().default(1),
    blobUrl: text("blob_url"),
    rowCount: varchar("row_count", { length: 16 }).notNull().default("0"),
    columns: jsonb("columns").$type<string[]>().notNull().default([]),
    qualityScore: varchar("quality_score", { length: 8 }).notNull().default("0"),
    validation: jsonb("validation").$type<Record<string, unknown>>().notNull().default({}),
    status: varchar("status", { length: 24 }).notNull().default("uploaded"),
    csvText: text("csv_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("authority_datasets_owner_idx").on(t.ownerId),
    index("authority_datasets_active_lookup_idx").on(
      t.authorityId,
      t.datasetType,
      t.status,
    ),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    authorityId: text("authority_id")
      .notNull()
      .references(() => authorities.id, { onDelete: "cascade" }),
    datasetId: text("dataset_id").references(() => authorityDatasets.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    assetType: text("asset_type").notNull(),
    name: text("name").notNull(),
    district: text("district").notNull(),
    ward: text("ward"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    condition: varchar("condition", { length: 32 }).notNull().default("unknown"),
    commissionedAt: timestamp("commissioned_at"),
    lastInspectedAt: timestamp("last_inspected_at"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("assets_authority_idx").on(t.authorityId)],
);

export const wards = pgTable(
  "wards",
  {
    id: text("id").primaryKey(),
    authorityId: text("authority_id")
      .notNull()
      .references(() => authorities.id, { onDelete: "cascade" }),
    datasetId: text("dataset_id").references(() => authorityDatasets.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    district: text("district").notNull(),
    boundary: jsonb("boundary").$type<Record<string, unknown>>(),
    councillorName: text("councillor_name"),
    portfolio: text("portfolio"),
    termStart: timestamp("term_start"),
    termEnd: timestamp("term_end"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("wards_authority_idx").on(t.authorityId)],
);

export const contactMessages = pgTable("contact_messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization"),
  message: text("message").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    kind: varchar("kind", { length: 48 }).notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    providerId: text("provider_id"),
    error: text("error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: text("id").primaryKey(),
    count: integer("count").notNull().default(1),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("rate_limits_expires_idx").on(t.expiresAt)],
);

export const citizenReportEvents = pgTable(
  "citizen_report_events",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => citizenReports.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 24 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("citizen_report_events_report_idx").on(t.reportId)],
);

export const dataAccessRequests = pgTable(
  "data_access_requests",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organization: text("organization").notNull(),
    purpose: text("purpose").notNull(),
    intendedUse: text("intended_use").notNull(),
    geographies: jsonb("geographies").$type<string[]>().notNull().default([]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    dateRange: text("date_range").notNull(),
    licenceAcceptedAt: timestamp("licence_accepted_at").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("submitted"),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("data_access_requests_requester_idx").on(t.requesterId)],
);

export const dataAccessRequestEvents = pgTable("data_access_request_events", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => dataAccessRequests.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  status: varchar("status", { length: 24 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dataAccessGrants = pgTable(
  "data_access_grants",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => dataAccessRequests.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csvText: text("csv_text").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("data_access_grants_request_idx").on(t.requestId)],
);

export type User = typeof users.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type FilterPreset = typeof filterPresets.$inferSelect;
export type AuthorityDataset = typeof authorityDatasets.$inferSelect;
export type CitizenReport = typeof citizenReports.$inferSelect;
