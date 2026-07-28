"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Kpis } from "@/lib/types";

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function KpiCard({
  title,
  value,
  suffix,
  hint,
  alert,
  decimals = 0,
}: {
  title: string;
  value: number;
  suffix?: string;
  hint?: string;
  alert?: boolean;
  decimals?: number;
}) {
  const animated = useCountUp(Number.isFinite(value) ? value : 0);
  return (
    <Card
      className={`animate-in-up border-l-4 shadow-sm ${
        alert ? "border-l-alert" : "border-l-brand"
      }`}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-brand text-2xl font-semibold tabular-nums md:text-3xl">
          {Number.isFinite(value)
            ? animated.toLocaleString("en-US", {
                maximumFractionDigits: decimals,
                minimumFractionDigits: decimals,
              })
            : "—"}
          {suffix ? (
            <span className="ml-1 text-base font-sans font-normal text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function KpiRibbon({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Total requests" value={kpis.total_requests} />
      <KpiCard
        title="Unresolved backlog"
        value={kpis.backlog}
        hint={`${kpis.backlog_pct.toFixed(1)}% of received`}
        alert={kpis.backlog_pct >= 18}
      />
      <KpiCard
        title="Avg satisfaction"
        value={kpis.satisfaction}
        suffix="/5"
        decimals={2}
        alert={kpis.satisfaction < 3.5}
      />
      <KpiCard
        title="Resolved on time"
        value={kpis.on_time_pct}
        suffix="%"
        decimals={1}
        alert={kpis.on_time_pct < 75}
      />
    </div>
  );
}
