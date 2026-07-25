"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChannelRoi, AgingBucket, CohortCompareResult } from "@/lib/analysis";
import type { ForecastResult } from "@/lib/forecast";
import type { ServiceRequestRow } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uniqueSorted } from "@/lib/data/filter-utils";

export function AnalysisClient({
  rows,
  channelRoiData,
  aging,
  forecast,
  initialCompare,
}: {
  rows: ServiceRequestRow[];
  channelRoiData: ChannelRoi[];
  aging: AgingBucket[];
  forecast: ForecastResult;
  initialCompare: CohortCompareResult;
}) {
  const [dim, setDim] = useState<"province" | "district" | "settlement_type">(
    "province",
  );
  const options = useMemo(() => uniqueSorted(rows, dim), [rows, dim]);
  const [a, setA] = useState(initialCompare.a.label);
  const [b, setB] = useState(initialCompare.b.label);

  const compare = useMemo(() => {
    const rowsA = rows.filter((r) => r[dim] === a);
    const rowsB = rows.filter((r) => r[dim] === b);
    const kpisA = {
      total_requests: rowsA.reduce((s, r) => s + r.requests_received, 0),
      backlog: rowsA.reduce((s, r) => s + r.unresolved_backlog, 0),
      backlog_pct: 0,
      resolution_rate: 0,
      satisfaction: 0,
      on_time_pct: 0,
    };
    // Use server-computed style via lightweight client calc
    const sumSat = (rs: ServiceRequestRow[]) => {
      let w = 0;
      let s = 0;
      let o = 0;
      for (const r of rs) {
        w += r.requests_received;
        s += r.citizen_satisfaction_1_5 * r.requests_received;
        o += r.pct_resolved_on_time * r.requests_received;
      }
      return {
        satisfaction: w ? s / w : 0,
        on_time_pct: w ? o / w : 0,
        total: w,
        backlog: rs.reduce((x, r) => x + r.unresolved_backlog, 0),
      };
    };
    const ca = sumSat(rowsA);
    const cb = sumSat(rowsB);
    return {
      a: {
        label: a,
        kpis: {
          ...kpisA,
          total_requests: ca.total,
          backlog: ca.backlog,
          backlog_pct: ca.total ? (ca.backlog / ca.total) * 100 : 0,
          satisfaction: ca.satisfaction,
          on_time_pct: ca.on_time_pct,
        },
      },
      b: {
        label: b,
        kpis: {
          total_requests: cb.total,
          backlog: cb.backlog,
          backlog_pct: cb.total ? (cb.backlog / cb.total) * 100 : 0,
          resolution_rate: 0,
          satisfaction: cb.satisfaction,
          on_time_pct: cb.on_time_pct,
        },
      },
      deltas: {
        backlog_pct:
          (ca.total ? (ca.backlog / ca.total) * 100 : 0) -
          (cb.total ? (cb.backlog / cb.total) * 100 : 0),
        satisfaction: ca.satisfaction - cb.satisfaction,
        on_time_pct: ca.on_time_pct - cb.on_time_pct,
        total_requests: ca.total - cb.total,
      },
    };
  }, [rows, dim, a, b]);

  const forecastChart = [
    ...forecast.history.map((h) => ({
      month: h.month,
      backlog: h.unresolved_backlog,
      forecast: null as number | null,
    })),
    {
      month: forecast.nextMonth.month,
      backlog: null as number | null,
      forecast: forecast.nextMonth.unresolved_backlog,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Deeper analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Cohort compare, channel ROI, backlog aging proxy, and transparent
          next-month forecast.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand">Cohort compare</CardTitle>
          <CardDescription>
            Side-by-side weighted KPIs for two slices of the official dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Dimension</Label>
              <Select
                value={dim}
                onValueChange={(v) => {
                  const next = v as typeof dim;
                  setDim(next);
                  const opts = uniqueSorted(rows, next);
                  setA(opts[0] ?? "");
                  setB(opts[1] ?? opts[0] ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="province">Province</SelectItem>
                  <SelectItem value="district">District</SelectItem>
                  <SelectItem value="settlement_type">Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cohort A</Label>
              <Select value={a} onValueChange={(v) => setA(String(v ?? ""))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cohort B</Label>
              <Select value={b} onValueChange={(v) => setB(String(v ?? ""))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[compare.a, compare.b].map((c) => (
              <div key={c.label} className="rounded-lg border p-3">
                <div className="font-semibold">{c.label}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>Requests: {c.kpis.total_requests.toLocaleString()}</div>
                  <div>Backlog %: {c.kpis.backlog_pct.toFixed(1)}</div>
                  <div>Satisfaction: {c.kpis.satisfaction.toFixed(2)}</div>
                  <div>On-time: {c.kpis.on_time_pct.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Δ backlog pp: {compare.deltas.backlog_pct.toFixed(1)} · Δ
            satisfaction: {compare.deltas.satisfaction.toFixed(2)} · Δ on-time:{" "}
            {compare.deltas.on_time_pct.toFixed(1)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-brand">Channel ROI</CardTitle>
            <CardDescription>
              Normalised score = resolution × on-time × satisfaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelRoiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="roi_score" fill="#007018" name="ROI score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-brand">Backlog aging proxy</CardTitle>
            <CardDescription>
              Buckets by average resolution days on aggregate rows (transparent
              proxy — not ticket-level age).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="unresolved_backlog" fill="#E80010" name="Backlog" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand">Forecast next month</CardTitle>
          <CardDescription>{forecast.formula}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="backlog"
                stroke="#007018"
                name="History"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#E80010"
                strokeDasharray="6 4"
                name="Forecast"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
