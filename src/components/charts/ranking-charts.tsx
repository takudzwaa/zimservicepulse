"use client";

import { useState, type ReactNode } from "react";
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
import type { GroupSummary, MonthTrend } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChartSelection =
  | { dimension: "categories"; value: string }
  | { dimension: "channels"; value: string }
  | { dimension: "settlements"; value: string }
  | { dimension: "months"; value: string };

type TabKey = "categories" | "channels" | "settlements" | "trends";

const CHART_HEIGHT = 288;

const gridStroke = "#dbe3ee";
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #dbe3ee",
  boxShadow: "0 12px 30px rgba(11, 46, 89, .14)",
};

function selectedPayload(
  event: unknown,
): { key?: string; month?: string } | null {
  const active = event as {
    activePayload?: Array<{ payload?: { key?: string; month?: string } }>;
  };
  return active.activePayload?.[0]?.payload ?? null;
}

function ChartFrame({ children }: { children: ReactNode }) {
  // Explicit pixel height — ResponsiveContainer with height="100%" collapses
  // inside Base UI tab panels (and flex parents) and renders an empty chart.
  return (
    <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function RankingCharts({
  categories,
  channels,
  settlements,
  trends,
  onSelect,
}: {
  categories: GroupSummary[];
  channels: GroupSummary[];
  settlements: GroupSummary[];
  trends: MonthTrend[];
  onSelect?: (selection: ChartSelection) => void;
}) {
  const [tab, setTab] = useState<TabKey>("categories");
  const empty =
    categories.length + channels.length + settlements.length + trends.length ===
    0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-brand">Rankings & trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TabKey)}
        >
          <TabsList className="mb-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
        </Tabs>

        {empty ? (
          <p className="grid h-72 place-items-center text-sm text-muted-foreground">
            No ranking data for the current filters.
          </p>
        ) : null}

        {!empty && tab === "categories" ? (
          <ChartFrame>
            <BarChart
              data={categories}
              layout="vertical"
              margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
              onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.key)
                  onSelect?.({ dimension: "categories", value: payload.key });
              }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="key"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#edf3fa" }}
                formatter={(value) => Number(value).toLocaleString()}
              />
              <Bar
                dataKey="unresolved_backlog"
                fill="#2D619B"
                name="Backlog"
                radius={[0, 7, 7, 0]}
              />
            </BarChart>
          </ChartFrame>
        ) : null}

        {!empty && tab === "channels" ? (
          <ChartFrame>
            <BarChart
              data={channels}
              margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
              onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.key)
                  onSelect?.({ dimension: "channels", value: payload.key });
              }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#edf3fa" }}
              />
              <Legend />
              <Bar
                dataKey="on_time_pct"
                fill="#2D619B"
                name="On-time %"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="satisfaction"
                fill="#C9962D"
                name="Satisfaction"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartFrame>
        ) : null}

        {!empty && tab === "settlements" ? (
          <ChartFrame>
            <BarChart
              data={settlements}
              margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
              onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.key)
                  onSelect?.({ dimension: "settlements", value: payload.key });
              }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#edf3fa" }}
                formatter={(value) => Number(value).toLocaleString()}
              />
              <Bar
                dataKey="unresolved_backlog"
                fill="#C63D37"
                name="Backlog"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartFrame>
        ) : null}

        {!empty && tab === "trends" ? (
          <ChartFrame>
            <LineChart
              data={trends}
              margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
              onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.month)
                  onSelect?.({ dimension: "months", value: payload.month });
              }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="unresolved_backlog"
                stroke="#C63D37"
                name="Backlog"
                strokeWidth={3}
                dot={{ r: 3, fill: "#C63D37" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="on_time_pct"
                stroke="#2D619B"
                name="On-time %"
                strokeWidth={3}
                dot={{ r: 3, fill: "#2D619B" }}
              />
            </LineChart>
          </ChartFrame>
        ) : null}

        <p className="mt-2 text-[11px] text-muted-foreground">
          Select a bar or trend point to focus the full dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
