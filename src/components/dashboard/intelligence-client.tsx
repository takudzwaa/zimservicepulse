"use client";

import { useMemo, useState } from "react";
import { BrainCircuit, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LiveAlgorithmRun } from "@/lib/ai/algorithms";
import { InsightCards } from "@/components/dashboard/insight-cards";
import type { Insight } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IntelligenceClient({
  runs,
  insights,
}: {
  runs: LiveAlgorithmRun[];
  insights: Insight[];
}) {
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const ordered = useMemo(() => runs, [runs]);

  async function runAll() {
    setRunning(true);
    for (const run of ordered) {
      setActiveId(run.meta.id);
      await new Promise((r) => setTimeout(r, 450));
      setTick((t) => t + 1);
    }
    setActiveId(null);
    setRunning(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2 gap-1">
            <BrainCircuit className="size-3" />
            AI lab · named algorithms
          </Badge>
          <h1 className="font-brand text-3xl font-semibold text-brand">
            Intelligence engine
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI is not hidden. Every algorithm has a name, a formula, and live
            output on the current scoped dataset — so operators can see
            exactly where it is working.
          </p>
        </div>
        <Button onClick={runAll} disabled={running} className="gap-2">
          <Play className="size-4" />
          {running ? "Replaying…" : "Replay algorithm suite"}
        </Button>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Steps through each algorithm&apos;s output below, computed fresh from the
        current scoped dataset when this page loaded.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {ordered.map((run) => {
          const isActive = activeId === run.meta.id;
          return (
            <Card
              key={run.meta.id}
              className={cn(
                "transition-all",
                isActive && "ring-2 ring-accent shadow-lg shadow-accent/10",
              )}
            >
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-brand">{run.meta.name}</CardTitle>
                    <CardDescription>{run.meta.family}</CardDescription>
                  </div>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={cn(isActive && "bg-accent text-accent-foreground")}
                  >
                    {isActive ? "Highlighting…" : "Ready"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium text-foreground">{run.summary}</p>
                <p className="text-muted-foreground">{run.meta.whyItMatters}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {run.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <div className="text-[11px] text-muted-foreground">
                        {m.label}
                      </div>
                      <div className="font-semibold text-brand">{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-brand/10 bg-brand/[0.03] p-3 text-xs text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide text-brand">
                    <Sparkles className="size-3" />
                    Formula
                  </div>
                  {run.formula}
                </div>
                <p className="text-xs text-muted-foreground">
                  Runs in: {run.meta.whereItRuns}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-brand text-xl text-brand">
            Insights & recommendations
          </h2>
          <p className="text-sm text-muted-foreground">
            Live InsightForge output with recommended actions. Each card names
            the rule that fired.
            {tick > 0 ? ` · suite ticks: ${tick}` : ""}
          </p>
        </div>
        <InsightCards insights={insights} />
      </section>
    </div>
  );
}
