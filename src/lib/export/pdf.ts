import { jsPDF } from "jspdf";
import type { Insight, Kpis } from "@/lib/types";

function plain(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/–/g, "-")
    .replace(/×/g, "x");
}

export function buildBriefingPdf(
  insights: Insight[],
  kpi: Kpis,
  context: string,
  focusLabel = "Balanced (default severity)",
): Uint8Array {
  const pdf = new jsPDF();
  const margin = 14;
  let y = 20;

  pdf.setFillColor(24, 24, 28);
  pdf.rect(0, 0, 210, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("ZimServicePulse", margin, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Insight & Action Briefing", margin, 20);

  y = 38;
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(10);
  pdf.text(`Scope: ${plain(context)}`, margin, y);
  y += 6;
  pdf.text(`Action priority focus: ${plain(focusLabel)}`, margin, y);
  y += 10;

  const section = (title: string) => {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 112, 24);
    pdf.setFontSize(12);
    pdf.text(title, margin, y);
    y += 7;
    pdf.setTextColor(40, 40, 40);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
  };

  section("Key figures");
  for (const line of [
    `Total requests: ${kpi.total_requests.toLocaleString()}`,
    `Unresolved backlog: ${kpi.backlog.toLocaleString()} (${kpi.backlog_pct.toFixed(1)}%)`,
    `Avg citizen satisfaction: ${kpi.satisfaction.toFixed(2)}/5`,
    `Resolved on time: ${kpi.on_time_pct.toFixed(1)}%`,
  ]) {
    pdf.text(line, margin, y);
    y += 5;
  }
  y += 4;

  section("Insights");
  if (!insights.length) {
    pdf.setFont("helvetica", "italic");
    pdf.text("No insights for the current selection.", margin, y);
    y += 6;
  } else {
    insights.forEach((ins, i) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFont("helvetica", "bold");
      const title = `${i + 1}. [${ins.severity.toUpperCase()}] ${plain(ins.title)}`;
      const titleLines = pdf.splitTextToSize(title, 182);
      pdf.text(titleLines, margin, y);
      y += titleLines.length * 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const bodyLines = pdf.splitTextToSize(plain(ins.body), 182);
      pdf.text(bodyLines, margin, y);
      y += bodyLines.length * 4.5 + 3;
      pdf.setFontSize(10);
    });
  }

  y += 2;
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }
  section("Recommended actions");
  if (!insights.length) {
    pdf.setFont("helvetica", "italic");
    pdf.text("No actions for the current selection.", margin, y);
  } else {
    insights.forEach((ins, i) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      const priority = ins.severity === "high" ? "HIGH" : "MEDIUM";
      pdf.setFont("helvetica", "bold");
      const t = `${i + 1}. [${priority}] ${plain(ins.action_title)}`;
      const tLines = pdf.splitTextToSize(t, 182);
      pdf.text(tLines, margin, y);
      y += tLines.length * 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const bLines = pdf.splitTextToSize(plain(ins.action_body), 182);
      pdf.text(bLines, margin, y);
      y += bLines.length * 4.5 + 3;
      pdf.setFontSize(10);
    });
  }

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    "All figures computed from 01_public_service_requests.csv - nothing hardcoded.",
    margin,
    285,
  );

  return pdf.output("arraybuffer") as unknown as Uint8Array;
}
