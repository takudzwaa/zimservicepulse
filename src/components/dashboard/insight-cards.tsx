"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight } from "@/lib/types";
import { severityBadgeVariant, severityBorderClass } from "@/lib/severity";

function renderBody(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (!insights.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No insights for the current selection.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {insights.map((ins) => (
        <Card
          key={ins.id}
          className={`border-l-4 shadow-sm ${severityBorderClass(ins.severity)}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm leading-snug">{ins.title}</CardTitle>
              <Badge variant={severityBadgeVariant(ins.severity)}>
                {ins.severity}
              </Badge>
            </div>
            {ins.algorithm ? (
              <Badge variant="outline" className="w-fit border-brand/20 text-[10px] text-brand">
                {ins.algorithm}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{renderBody(ins.body)}</p>
            <div className="rounded-md bg-secondary/60 p-2 text-foreground">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                Recommended action
              </div>
              <div className="font-medium">{ins.action_title}</div>
              <p className="text-xs text-muted-foreground">{ins.action_body}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
