CREATE TABLE "action_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"action_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"authority_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" varchar(16) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"district" text,
	"category" text,
	"channel" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "action_items_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "alerts_read" (
	"user_id" text NOT NULL,
	"alert_id" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_read_user_id_alert_id_pk" PRIMARY KEY("user_id","alert_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"authority_id" text NOT NULL,
	"dataset_id" text,
	"external_id" text NOT NULL,
	"asset_type" text NOT NULL,
	"name" text NOT NULL,
	"district" text NOT NULL,
	"ward" text,
	"latitude" text,
	"longitude" text,
	"condition" varchar(32) DEFAULT 'unknown' NOT NULL,
	"commissioned_at" timestamp,
	"last_inspected_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"authority_id" text,
	"actor_id" text,
	"action" varchar(80) NOT NULL,
	"subject_type" varchar(60) NOT NULL,
	"subject_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"kind" varchar(32) NOT NULL,
	"token_hash" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"kind" varchar(32) DEFAULT 'council' NOT NULL,
	"province" text,
	"districts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authorities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "authority_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"authority_id" text,
	"name" text NOT NULL,
	"description" text,
	"authority_name" text NOT NULL,
	"province" text,
	"district" text,
	"filename" text NOT NULL,
	"dataset_type" varchar(40) DEFAULT 'service_requests' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"blob_url" text,
	"row_count" varchar(16) DEFAULT '0' NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quality_score" varchar(8) DEFAULT '0' NOT NULL,
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'uploaded' NOT NULL,
	"csv_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_memberships" (
	"authority_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(40) NOT NULL,
	"assigned_districts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authority_memberships_authority_id_user_id_pk" PRIMARY KEY("authority_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "citizen_report_events" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"status" varchar(24) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citizen_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" varchar(24) NOT NULL,
	"authority_id" text,
	"reporter_id" text,
	"reporter_email" text,
	"email_verified_at" timestamp,
	"province" text NOT NULL,
	"district" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"location_detail" text,
	"status" varchar(24) DEFAULT 'submitted' NOT NULL,
	"ai_priority" varchar(16) DEFAULT 'medium',
	"ai_score" varchar(8),
	"ai_rationale" text,
	"workflow_action_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "citizen_reports_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"organization" text,
	"message" text NOT NULL,
	"status" varchar(24) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"csv_text" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_access_request_events" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"status" varchar(24) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"organization" text NOT NULL,
	"purpose" text NOT NULL,
	"intended_use" text NOT NULL,
	"geographies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_range" text NOT NULL,
	"licence_accepted_at" timestamp NOT NULL,
	"status" varchar(24) DEFAULT 'submitted' NOT NULL,
	"reviewer_id" text,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"kind" varchar(48) NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"provider_id" text,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"pin_hash" text NOT NULL,
	"role" varchar(40) NOT NULL,
	"audience" varchar(24),
	"assigned_districts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_provinces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email_verified_at" timestamp,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" text PRIMARY KEY NOT NULL,
	"authority_id" text NOT NULL,
	"dataset_id" text,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"district" text NOT NULL,
	"boundary" jsonb,
	"councillor_name" text,
	"portfolio" text,
	"term_start" timestamp,
	"term_end" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_action_id_action_items_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."action_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts_read" ADD CONSTRAINT "alerts_read_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_dataset_id_authority_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."authority_datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_datasets" ADD CONSTRAINT "authority_datasets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_datasets" ADD CONSTRAINT "authority_datasets_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_memberships" ADD CONSTRAINT "authority_memberships_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_memberships" ADD CONSTRAINT "authority_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen_report_events" ADD CONSTRAINT "citizen_report_events_report_id_citizen_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."citizen_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen_report_events" ADD CONSTRAINT "citizen_report_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_workflow_action_id_action_items_id_fk" FOREIGN KEY ("workflow_action_id") REFERENCES "public"."action_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_grants" ADD CONSTRAINT "data_access_grants_request_id_data_access_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."data_access_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_grants" ADD CONSTRAINT "data_access_grants_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_request_events" ADD CONSTRAINT "data_access_request_events_request_id_data_access_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."data_access_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_request_events" ADD CONSTRAINT "data_access_request_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_presets" ADD CONSTRAINT "filter_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_authority_id_authorities_id_fk" FOREIGN KEY ("authority_id") REFERENCES "public"."authorities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_dataset_id_authority_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."authority_datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_idx" ON "auth_tokens" USING btree ("token_hash");