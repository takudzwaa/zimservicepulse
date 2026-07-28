CREATE INDEX "action_items_authority_idx" ON "action_items" USING btree ("authority_id");--> statement-breakpoint
CREATE INDEX "action_items_assignee_idx" ON "action_items" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "assets_authority_idx" ON "assets" USING btree ("authority_id");--> statement-breakpoint
CREATE INDEX "authority_datasets_owner_idx" ON "authority_datasets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "authority_datasets_active_lookup_idx" ON "authority_datasets" USING btree ("authority_id","dataset_type","status");--> statement-breakpoint
CREATE INDEX "citizen_report_events_report_idx" ON "citizen_report_events" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "citizen_reports_authority_idx" ON "citizen_reports" USING btree ("authority_id");--> statement-breakpoint
CREATE INDEX "citizen_reports_reporter_idx" ON "citizen_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "citizen_reports_district_idx" ON "citizen_reports" USING btree ("district");--> statement-breakpoint
CREATE INDEX "data_access_grants_request_idx" ON "data_access_grants" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "data_access_requests_requester_idx" ON "data_access_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "wards_authority_idx" ON "wards" USING btree ("authority_id");