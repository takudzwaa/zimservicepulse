import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeDashboard, getRowsForUser } from "@/lib/data/dashboard";
import { toMarkdown } from "@/lib/insights";
import { buildBriefingPdf } from "@/lib/export/pdf";
import { EMPTY_FILTERS } from "@/lib/types";
import { canExportRawData, scopeRowsForUser } from "@/lib/access";
import { parseFilters } from "@/lib/data/dashboard";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ kind: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canExportRawData(session.user)) {
    return NextResponse.json(
      { error: "Raw exports require an internal operational role" },
      { status: 403 },
    );
  }
  const { kind } = await ctx.params;
  const { rows: allRows } = await getRowsForUser(session.user);
  const scopedRows = scopeRowsForUser(allRows, session.user);
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const filters = { ...EMPTY_FILTERS, ...parseFilters(query) };
  const dash = computeDashboard(scopedRows, filters);
  const rows = dash.filtered;

  if (kind === "csv") {
    const header = Object.keys(rows[0] ?? {}).join(",");
    const body = rows
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    return new NextResponse(`${header}\n${body}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="zimservicepulse-filtered.csv"',
      },
    });
  }

  if (kind === "markdown") {
    const md = toMarkdown(dash.insights, dash.kpi, dash.context);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="zimservicepulse-briefing.md"',
      },
    });
  }

  if (kind === "pdf") {
    const bytes = buildBriefingPdf(dash.insights, dash.kpi, dash.context);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="zimservicepulse-briefing.pdf"',
      },
    });
  }

  return NextResponse.json({ error: "Unknown export kind" }, { status: 400 });
}
