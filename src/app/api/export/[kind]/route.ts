import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeDashboard, getAllRows } from "@/lib/data/dashboard";
import { toMarkdown } from "@/lib/insights";
import { buildBriefingPdf } from "@/lib/export/pdf";
import { EMPTY_FILTERS } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ kind: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { kind } = await ctx.params;
  const { rows } = getAllRows();
  const dash = computeDashboard(rows, EMPTY_FILTERS);

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
