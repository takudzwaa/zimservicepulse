"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Insight } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function CommandCenterClient({
  alerts,
  readIds,
  rising,
}: {
  alerts: Insight[];
  readIds: string[];
  rising: { rising: boolean; delta: number; latest: number; previous: number } | null;
}) {
  const router = useRouter();
  const [severity, setSeverity] = useState<"all" | "high" | "medium">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const read = new Set(readIds);

  const filtered = alerts.filter((a) => {
    if (severity !== "all" && a.severity !== severity) return false;
    if (showUnreadOnly && read.has(a.id)) return false;
    return true;
  });

  async function markRead(alertId: string) {
    const res = await fetch("/api/alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    if (!res.ok) {
      toast.error("Could not mark read");
      return;
    }
    toast.success("Marked as read");
    router.refresh();
  }

  async function materialize(insight: Insight) {
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insight }),
    });
    if (!res.ok) {
      toast.error("Could not create action");
      return;
    }
    toast.success("Action created in workflow");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Command center
        </h1>
        <p className="text-sm text-muted-foreground">
          Alert inbox from the rules engine plus threshold monitors. Triage by
          severity, mark read, and push to workflow.
        </p>
      </div>

      {rising?.rising ? (
        <Card className="border-l-4 border-l-alert">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rising backlog alert</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Unresolved backlog increased by{" "}
            <strong className="text-foreground">
              {rising.delta.toLocaleString()}
            </strong>{" "}
            month-over-month ({rising.previous.toLocaleString()} →{" "}
            {rising.latest.toLocaleString()}).
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={severity}
          onValueChange={(v) => setSeverity(v as typeof severity)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly((v) => !v)}
        >
          {showUnreadOnly ? "Unread only" : "Show all"}
        </Button>
        <Badge variant="secondary">{filtered.length} alerts</Badge>
      </div>

      <div className="grid gap-3">
        {filtered.map((a) => (
          <Card
            key={a.id}
            className={`border-l-4 ${
              a.severity === "high" ? "border-l-alert" : "border-l-gold"
            } ${read.has(a.id) ? "opacity-70" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-sm">{a.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant={a.severity === "high" ? "destructive" : "secondary"}
                  >
                    {a.severity}
                  </Badge>
                  <Badge variant="outline">{a.kind}</Badge>
                  {read.has(a.id) ? (
                    <Badge variant="secondary">read</Badge>
                  ) : (
                    <Badge>new</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{a.body.replace(/\*\*/g, "")}</p>
              <div className="flex flex-wrap gap-2">
                {!read.has(a.id) ? (
                  <Button size="sm" variant="outline" onClick={() => markRead(a.id)}>
                    Mark read
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => materialize(a)}>
                  Send to workflow
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!filtered.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No alerts match the current triage filters.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
