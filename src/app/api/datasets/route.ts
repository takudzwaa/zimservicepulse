import { NextResponse } from "next/server";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canManageDatasets } from "@/lib/access";
import { validateAuthorityDataset } from "@/lib/ai/algorithms";
import { ensureSchema, getDb } from "@/lib/db";
import { authorityDatasets } from "@/lib/db/schema";
import { storeDatasetFile } from "@/lib/storage";

const uploadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  authorityName: z.string().trim().min(2).max(120),
  province: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  filename: z.string().trim().min(1).max(200),
  datasetType: z
    .enum(["service_requests", "assets", "wards"])
    .default("service_requests"),
  csvText: z.string().min(10).max(2_000_000),
});

const REQUIRED: Record<string, string[]> = {
  assets: ["asset_id", "asset_type", "name", "district", "condition"],
  wards: ["ward_id", "ward_name", "district"],
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDatasets(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureSchema();
  const db = await getDb();
  const user = session.user;
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

  return NextResponse.json({
    datasets: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      // Do not ship full CSV in list payloads
      csvText: undefined,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDatasets(session.user)) {
    return NextResponse.json(
      { error: "Local authority dataset access required" },
      { status: 403 },
    );
  }

  const parsed = uploadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dataset upload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const csv = Papa.parse<Record<string, string>>(parsed.data.csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (csv.errors.length) {
    return NextResponse.json(
      {
        error: "CSV parse failed",
        detail: csv.errors.map((e) => e.message).join("; "),
      },
      { status: 400 },
    );
  }

  const headers = csv.meta.fields ?? [];
  const missing = (REQUIRED[parsed.data.datasetType] ?? []).filter(
    (column) => !headers.includes(column),
  );
  const validation =
    parsed.data.datasetType === "service_requests"
      ? validateAuthorityDataset(headers, csv.data)
      : {
          algorithm: "DataQuality Guard",
          rowCount: csv.data.length,
          columns: headers,
          missingRequired: missing,
          issues: missing.length ? [`Missing required columns: ${missing.join(", ")}`] : [],
          score: missing.length ? 40 : csv.data.length ? 100 : 60,
          status: missing.length || !csv.data.length ? "needs_attention" : "validated",
        };
  const id = nanoid();

  await ensureSchema();
  const db = await getDb();
  const authorityId = session.user.authorityId;
  if (!authorityId && session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Your account is not assigned to a local authority" },
      { status: 403 },
    );
  }
  const storageAuthority = authorityId ?? "platform";
  const [current] = await db
    .select({ value: max(authorityDatasets.version) })
    .from(authorityDatasets)
    .where(
      and(
        authorityId
          ? eq(authorityDatasets.authorityId, authorityId)
          : isNull(authorityDatasets.authorityId),
        eq(authorityDatasets.datasetType, parsed.data.datasetType),
      ),
    );
  const blobUrl = await storeDatasetFile({
    authorityId: storageAuthority,
    filename: parsed.data.filename,
    body: parsed.data.csvText,
  });
  await db.insert(authorityDatasets).values({
    id,
    ownerId: session.user.id,
    authorityId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    authorityName: parsed.data.authorityName,
    province: parsed.data.province || null,
    district: parsed.data.district || null,
    filename: parsed.data.filename,
    datasetType: parsed.data.datasetType,
    version: (current?.value ?? 0) + 1,
    blobUrl,
    rowCount: String(validation.rowCount),
    columns: validation.columns,
    qualityScore: String(validation.score),
    validation: validation as unknown as Record<string, unknown>,
    status: validation.status,
    csvText: parsed.data.csvText,
  });

  return NextResponse.json(
    {
      id,
      status: validation.status,
      qualityScore: validation.score,
      algorithm: validation.algorithm,
      validation,
    },
    { status: 201 },
  );
}
