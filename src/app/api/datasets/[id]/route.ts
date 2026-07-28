import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canManageDatasets } from "@/lib/access";
import { ensureSchema, getDb } from "@/lib/db";
import { assets, authorityDatasets, auditEvents, wards } from "@/lib/db/schema";

const patchSchema = z.object({
  status: z.enum(["uploaded", "validated", "active", "archived", "needs_attention"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDatasets(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await ensureSchema();
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(authorityDatasets)
    .where(eq(authorityDatasets.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    session.user.role !== "admin" &&
    existing.ownerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.status === "active") {
    const score = Number(existing.qualityScore);
    if (!Number.isFinite(score) || score < 70) {
      return NextResponse.json(
        {
          error:
            "DataQuality Guard blocks activation when quality score is below 70",
        },
        { status: 400 },
      );
    }
    if (!existing.authorityId) {
      return NextResponse.json(
        { error: "Assign this dataset to an authority before activation" },
        { status: 400 },
      );
    }

    await db
      .update(authorityDatasets)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(authorityDatasets.authorityId, existing.authorityId),
          eq(authorityDatasets.datasetType, existing.datasetType),
          eq(authorityDatasets.status, "active"),
        ),
      );

    const csv = Papa.parse<Record<string, string>>(existing.csvText, {
      header: true,
      skipEmptyLines: true,
    }).data;
    if (existing.datasetType === "assets") {
      await db.delete(assets).where(eq(assets.authorityId, existing.authorityId));
      if (csv.length) {
        await db.insert(assets).values(
          csv.map((row) => ({
            id: nanoid(),
            authorityId: existing.authorityId!,
            datasetId: existing.id,
            externalId: row.asset_id,
            assetType: row.asset_type,
            name: row.name,
            district: row.district,
            ward: row.ward || null,
            latitude: row.latitude || null,
            longitude: row.longitude || null,
            condition: row.condition || "unknown",
            commissionedAt: row.commissioned_at ? new Date(row.commissioned_at) : null,
            lastInspectedAt: row.last_inspected_at ? new Date(row.last_inspected_at) : null,
          })),
        );
      }
    }
    if (existing.datasetType === "wards") {
      await db.delete(wards).where(eq(wards.authorityId, existing.authorityId));
      if (csv.length) {
        await db.insert(wards).values(
          csv.map((row) => {
            let boundary: Record<string, unknown> | null = null;
            if (row.boundary_geojson) {
              try {
                boundary = JSON.parse(row.boundary_geojson);
              } catch {
                boundary = null;
              }
            }
            return {
              id: nanoid(),
              authorityId: existing.authorityId!,
              datasetId: existing.id,
              externalId: row.ward_id,
              name: row.ward_name,
              district: row.district,
              boundary,
              councillorName: row.councillor_name || null,
              portfolio: row.portfolio || null,
              termStart: row.term_start ? new Date(row.term_start) : null,
              termEnd: row.term_end ? new Date(row.term_end) : null,
            };
          }),
        );
      }
    }
  }

  await db
    .update(authorityDatasets)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(authorityDatasets.id, id));

  await db.insert(auditEvents).values({
    id: nanoid(),
    authorityId: existing.authorityId,
    actorId: session.user.id,
    action: `dataset.${parsed.data.status}`,
    subjectType: "dataset",
    subjectId: id,
    metadata: { type: existing.datasetType, version: existing.version },
  });

  return NextResponse.json({ id, status: parsed.data.status });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDatasets(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await ensureSchema();
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(authorityDatasets)
    .where(eq(authorityDatasets.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    session.user.role !== "admin" &&
    existing.ownerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(authorityDatasets).where(eq(authorityDatasets.id, id));
  return NextResponse.json({ ok: true });
}
