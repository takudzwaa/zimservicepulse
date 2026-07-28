import type {
  ServiceRequestRow,
  UserRole,
  WorkspaceAudience,
} from "@/lib/types";

export type AccessUser = {
  id: string;
  role: UserRole;
  audience: WorkspaceAudience | null;
  assignedDistricts: string[];
  assignedProvinces: string[];
  authorityId?: string | null;
};

export function scopeRowsForUser(
  rows: ServiceRequestRow[],
  user: AccessUser,
): ServiceRequestRow[] {
  if (user.role === "district_manager" && user.assignedDistricts.length) {
    return rows.filter((row) => user.assignedDistricts.includes(row.district));
  }
  if (user.role === "provincial_analyst" && user.assignedProvinces.length) {
    return rows.filter((row) => user.assignedProvinces.includes(row.province));
  }
  return rows;
}

export function canManageCitizenReports(user: AccessUser): boolean {
  return user.role === "district_manager" || user.role === "admin";
}

export function canSubmitCitizenReports(user: AccessUser): boolean {
  // Any signed-in user may file a complaint (citizens + walk-in logging).
  return Boolean(user.id);
}

/** Local authorities (and admins) can upload/manage operational datasets. */
export function canManageDatasets(user: AccessUser): boolean {
  return (
    user.role === "district_manager" ||
    user.role === "channel_lead" ||
    user.role === "admin"
  );
}

export function canReviewDataAccess(user: AccessUser): boolean {
  return user.role === "admin";
}

export function canExportRawData(user: AccessUser): boolean {
  return user.role !== "external_user";
}

export function canOpenAudience(
  user: AccessUser,
  audience: WorkspaceAudience,
): boolean {
  return user.role === "admin" || user.audience === audience;
}

export function canSeeReportDistrict(
  user: AccessUser,
  district: string,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "district_manager") {
    return user.assignedDistricts.includes(district);
  }
  return false;
}

export function canSeeReport(
  user: AccessUser,
  report: { authorityId?: string | null; district: string },
): boolean {
  if (user.role === "admin") return true;
  if (user.authorityId || report.authorityId) {
    return Boolean(user.authorityId && user.authorityId === report.authorityId);
  }
  return canSeeReportDistrict(user, report.district);
}
