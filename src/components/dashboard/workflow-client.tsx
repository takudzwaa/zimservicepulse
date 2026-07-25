"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ActionStatus } from "@/lib/types";

type ActionRow = {
  id: string;
  title: string;
  body: string;
  severity: string;
  kind: string;
  status: ActionStatus;
  assigneeId: string | null;
  comments: { id: string; body: string; userName: string; createdAt: string }[];
};

export function WorkflowClient({
  actions,
  users,
}: {
  actions: ActionRow[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  async function updateAction(
    id: string,
    patch: { status?: ActionStatus; assigneeId?: string | null },
  ) {
    const res = await fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success("Updated");
    router.refresh();
  }

  async function addComment(actionId: string) {
    const body = commentDrafts[actionId]?.trim();
    if (!body) return;
    const res = await fetch("/api/actions/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, body }),
    });
    if (!res.ok) {
      toast.error("Comment failed");
      return;
    }
    setCommentDrafts((d) => ({ ...d, [actionId]: "" }));
    toast.success("Comment added");
    router.refresh();
  }

  async function syncFromInsights() {
    const res = await fetch("/api/actions/sync", { method: "POST" });
    if (!res.ok) {
      toast.error("Sync failed");
      return;
    }
    const data = await res.json();
    toast.success(`Synced ${data.created} new action(s)`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-brand text-3xl font-semibold text-brand">
            Workflow
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign insight actions, track status, comment, and export briefing
            packs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={syncFromInsights}>
            Sync from insights
          </Button>
          <Link
            href="/api/export/csv"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
          >
            Export CSV
          </Link>
          <Link
            href="/api/export/markdown"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
          >
            Export Markdown
          </Link>
          <Link
            href="/api/export/pdf"
            className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm text-primary-foreground hover:bg-primary/80"
          >
            Export PDF pack
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {actions.map((a) => (
          <Card key={a.id} className="border-l-4 border-l-brand">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{a.title}</CardTitle>
                  <CardDescription>{a.body}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={a.severity === "high" ? "destructive" : "secondary"}
                  >
                    {a.severity}
                  </Badge>
                  <Badge variant="outline">{a.kind}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Select
                  value={a.status}
                  onValueChange={(v) =>
                    updateAction(a.id, { status: v as ActionStatus })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={a.assigneeId ?? "unassigned"}
                  onValueChange={(v) =>
                    updateAction(a.id, {
                      assigneeId: v === "unassigned" ? null : v,
                    })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-md bg-secondary/40 p-3">
                <div className="text-xs font-semibold uppercase text-brand">
                  Comments
                </div>
                {a.comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.userName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {new Date(c.createdAt).toLocaleString()}
                    </span>
                    <p>{c.body}</p>
                  </div>
                ))}
                {!a.comments.length ? (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                ) : null}
                <Textarea
                  placeholder="Add a comment…"
                  value={commentDrafts[a.id] ?? ""}
                  onChange={(e) =>
                    setCommentDrafts((d) => ({ ...d, [a.id]: e.target.value }))
                  }
                />
                <Button size="sm" onClick={() => addComment(a.id)}>
                  Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!actions.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No action items yet. Click <strong>Sync from insights</strong> or
              push alerts from the command center.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
