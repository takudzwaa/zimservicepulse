export type PriorityFlag = "Urgent" | "Watch" | "Normal";

export type UserRole =
  | "district_manager"
  | "provincial_analyst"
  | "channel_lead"
  | "admin";

export type ActionStatus = "open" | "in_progress" | "done" | "dismissed";

export type InsightSeverity = "high" | "medium";

export type InsightKind =
  | "backlog"
  | "channel"
  | "urgent"
  | "satisfaction"
  | "slow"
  | "general"
  | "trend";

export interface ServiceRequestRow {
  month: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  settlement_type: string;
  service_category: string;
  primary_channel: string;
  requests_received: number;
  requests_resolved: number;
  avg_resolution_days: number;
  pct_resolved_on_time: number;
  unresolved_backlog: number;
  citizen_satisfaction_1_5: number;
  priority_flag: PriorityFlag;
}

export interface FilterState {
  provinces: string[];
  districts: string[];
  settlementTypes: string[];
  categories: string[];
  channels: string[];
  priorities: string[];
  months: string[];
}

export interface Kpis {
  total_requests: number;
  backlog: number;
  backlog_pct: number;
  resolution_rate: number;
  satisfaction: number;
  on_time_pct: number;
}

export interface DistrictSummary {
  district: string;
  province: string;
  settlement_type: string;
  latitude: number;
  longitude: number;
  requests_received: number;
  unresolved_backlog: number;
  satisfaction: number;
  on_time_pct: number;
  avg_resolution_days: number;
  urgent_backlog: number;
  urgent_flag: string;
  pressure_score: number;
  urgent_share: number;
  has_urgent: boolean;
}

export interface GroupSummary {
  key: string;
  requests_received: number;
  unresolved_backlog: number;
  satisfaction: number;
  on_time_pct: number;
  avg_resolution_days: number;
}

export interface MonthTrend {
  month: string;
  requests_received: number;
  unresolved_backlog: number;
  satisfaction: number;
  on_time_pct: number;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  action_title: string;
  action_body: string;
  kind: InsightKind;
}

export const PRIORITY_ORDER: PriorityFlag[] = ["Urgent", "Watch", "Normal"];

export const EMPTY_FILTERS: FilterState = {
  provinces: [],
  districts: [],
  settlementTypes: [],
  categories: [],
  channels: [],
  priorities: [],
  months: [],
};

export const FOCUS_OPTIONS: Record<string, InsightKind | null> = {
  "Balanced (default severity)": null,
  "Clear urgent backlog first": "urgent",
  "Cut category backlog first": "backlog",
  "Improve digital channels first": "channel",
  "Raise citizen satisfaction first": "satisfaction",
  "Fix slowest processes first": "slow",
};
