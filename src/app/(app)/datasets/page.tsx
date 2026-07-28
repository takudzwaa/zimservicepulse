import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageDatasets } from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import { authorityDatasets } from "@/lib/db/schema";
import {
  DatasetHubClient,
  type DatasetListItem,
} from "@/components/dashboard/dataset-hub-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DatasetsPage() {
  const session = await auth();
  const user = session!.user;
  if (!canManageDatasets(user)) {
    return (
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Local authority access
          </Badge>
          <CardTitle className="text-brand">Dataset hub</CardTitle>
          <CardDescription>
            District managers, channel leads, and admins upload and manage the
            operational CSVs their council wants to run on ZimServicePulse.
            Ask a platform administrator to assign your account to an authority.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Citizens use Complaints; analysts use Intelligence and Explore.
        </CardContent>
      </Card>
    );
  }

  await ensureSchema();
  const db = await getDb();
  const rows =
    user.role === "admin"
      ? await db
          .select()
          .from(authorityDatasets)
          .orderBy(desc(authorityDatasets.createdAt))
      : await db
          .select()
          .from(authorityDatasets)
          .where(eq(authorityDatasets.ownerId, user.id))
          .orderBy(desc(authorityDatasets.createdAt));

  const datasets: DatasetListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    authorityName: row.authorityName,
    province: row.province,
    district: row.district,
    filename: row.filename,
    datasetType: row.datasetType,
    version: row.version,
    rowCount: row.rowCount,
    columns: row.columns ?? [],
    qualityScore: row.qualityScore,
    status: row.status,
    validation: (row.validation ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));

  if (!session) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <Badge variant="secondary" className="mb-2">
          Local authority data
        </Badge>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Dataset hub
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Upload the datasets your council wants to manage — monthly service
          extracts, ward volumes, inspection logs.{" "}
          <strong>DataQuality Guard</strong> validates every file before you
          activate it for operations.
        </p>
      </div>
      <DatasetHubClient
        datasets={datasets}
        defaultAuthority={
          user.assignedDistricts[0]
            ? `${user.assignedDistricts[0]} Council`
            : user.name ?? "Local Authority"
        }
        defaultDistrict={user.assignedDistricts[0]}
        defaultProvince={user.assignedProvinces[0]}
      />
    </div>
  );
}
