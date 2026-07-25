"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChartSelection =
  | { dimension: "categories"; value: string }
  | { dimension: "channels"; value: string }
  | { dimension: "settlements"; value: string }
  | { dimension: "months"; value: string };

const gridStroke = "#dbe3ee";
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #dbe3ee",
  boxShadow: "0 12px 30px rgba(11, 46, 89, .14)",
};

function selectedPayload(event: unknown): { key?: string; month?: string } | null {
  const active = event as { activePayload?: Array<{ payload?: { key?: string; month?: string } }> };
  return active.activePayload?.[0]?.payload ?? null;
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
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-brand">Rankings & trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories">
          <TabsList className="mb-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categories}
                layout="vertical"
                margin={{ left: 20, right: 12 }}
                onClick={(event) => {
                  const payload = selectedPayload(event);
                  if (payload?.key) onSelect?.({ dimension: "categories", value: payload.key });
                }}
              >
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="key" width={110} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#edf3fa" }} formatter={(value) => Number(value).toLocaleString()} />
                <Bar dataKey="unresolved_backlog" fill="#2D619B" name="Backlog" radius={[0, 7, 7, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="channels" className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channels} onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.key) onSelect?.({ dimension: "channels", value: payload.key });
              }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#edf3fa" }} />
                <Legend />
                <Bar dataKey="on_time_pct" fill="#2D619B" name="On-time %" radius={[6, 6, 0, 0]} />
                <Bar dataKey="satisfaction" fill="#C9962D" name="Satisfaction" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="settlements" className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={settlements} onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.key) onSelect?.({ dimension: "settlements", value: payload.key });
              }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#edf3fa" }} formatter={(value) => Number(value).toLocaleString()} />
                <Bar dataKey="unresolved_backlog" fill="#C63D37" name="Backlog" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="trends" className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} onClick={(event) => {
                const payload = selectedPayload(event);
                if (payload?.month) onSelect?.({ dimension: "months", value: payload.month });
              }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
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
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Select a bar or trend point to focus the full dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
