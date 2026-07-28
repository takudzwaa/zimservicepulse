"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  MessageSquareWarning,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { CitizenReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ComplaintView = {
  id: string;
  reference: string;
  province: string;
  district: string;
  category: string;
  description: string;
  locationDetail: string | null;
  status: string;
  aiPriority?: string | null;
  aiScore?: string | null;
  aiRationale?: string | null;
  workflowActionId: string | null;
  createdAt: string;
  events?: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }[];
};

const PIPELINE: Array<{
  key: string;
  label: string;
  match: (status: string) => boolean;
  icon: typeof Clock3;
}> = [
  {
    key: "pending",
    label: "Pending",
    match: (s) => s === "submitted" || s === "acknowledged",
    icon: Clock3,
  },
  {
    key: "in_progress",
    label: "In progress",
    match: (s) => s === "in_progress",
    icon: CircleDot,
  },
  {
    key: "resolved",
    label: "Resolved",
    match: (s) => s === "resolved" || s === "closed",
    icon: CheckCircle2,
  },
];

function bucketFor(status: string) {
  return (
    PIPELINE.find((step) => step.match(status))?.key ?? "pending"
  );
}

export function ComplaintsClient({
  mode,
  reports,
  places,
  categories,
}: {
  mode: "citizen" | "manage" | "mixed";
  reports: ComplaintView[];
  places: { province: string; district: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const canSubmit = mode === "citizen" || mode === "mixed";
  const canManage = mode === "manage" || mode === "mixed";

  const provinces = useMemo(
    () => Array.from(new Set(places.map((p) => p.province))).sort(),
    [places],
  );
  const [province, setProvince] = useState(provinces[0] ?? "");
  const districts = places
    .filter((p) => p.province === province)
    .map((p) => p.district);
  const [district, setDistrict] = useState(districts[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "resolved">(
    "all",
  );
  const [lastAi, setLastAi] = useState<{
    score: number;
    priority: string;
    rationale: string;
    algorithm: string;
  } | null>(null);

  const counts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, resolved: 0 };
    for (const r of reports) {
      const b = bucketFor(r.status) as keyof typeof c;
      if (b in c) c[b] += 1;
    }
    return c;
  }, [reports]);

  const filtered = reports.filter((r) =>
    filter === "all" ? true : bucketFor(r.status) === filter,
  );

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const res = await fetch("/api/citizen-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        province,
        district,
        category,
        description,
        locationDetail,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not submit complaint");
      return;
    }
    if (data.ai) setLastAi(data.ai);
    toast.success(`Complaint filed: ${data.reference} · status Pending`);
    setDescription("");
    setLocationDetail("");
    router.refresh();
  }

  async function updateReport(id: string, status: CitizenReportStatus) {
    const res = await fetch(`/api/citizen-reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: `Status changed to ${status}` }),
    });
    if (!res.ok) {
      toast.error("Could not update status");
      return;
    }
    toast.success("Complaint status updated");
    router.refresh();
  }

  async function triageReport(id: string) {
    const res = await fetch(`/api/citizen-reports/${id}/triage`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Could not triage complaint");
      return;
    }
    const data = await res.json();
    toast.success(data.created ? "Added to workflow" : "Already in workflow");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {PIPELINE.map((step) => {
          const Icon = step.icon;
          const count = counts[step.key as keyof typeof counts] ?? 0;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() =>
                setFilter((f) =>
                  f === step.key
                    ? "all"
                    : (step.key as "pending" | "in_progress" | "resolved"),
                )
              }
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md",
                filter === step.key && "ring-2 ring-brand/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-brand">
                  <Icon className="size-4" />
                  {step.label}
                </span>
                <span className="font-brand text-2xl font-semibold text-brand">
                  {count}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap to filter ·{" "}
                {step.key === "pending"
                  ? "submitted or acknowledged"
                  : step.key === "in_progress"
                    ? "crew working the case"
                    : "resolved or closed"}
              </p>
            </button>
          );
        })}
      </div>

      {canSubmit ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="size-4 text-brand" />
                <CardTitle className="text-brand">
                  Send a service complaint
                </CardTitle>
              </div>
              <CardDescription>
                File a water, roads, waste, licensing, or documentation issue.
                You get a reference number and can track Pending → In progress →
                Resolved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={submitReport}
                className="grid gap-4 md:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select
                    value={province}
                    onValueChange={(value) => {
                      const next = String(value ?? "");
                      setProvince(next);
                      setDistrict(
                        places.find((p) => p.province === next)?.district ?? "",
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Select
                    value={district}
                    onValueChange={(value) =>
                      setDistrict(String(value ?? ""))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Service category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) =>
                      setCategory(String(value ?? ""))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complaint-description">
                    What is happening?
                  </Label>
                  <Textarea
                    id="complaint-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minLength={10}
                    maxLength={2000}
                    required
                    placeholder="Describe the problem clearly so ComplaintTriage Assist can prioritise it."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complaint-location">Location detail</Label>
                  <Input
                    id="complaint-location"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="Street, landmark, or neighbourhood"
                    maxLength={300}
                  />
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? "Submitting…" : "Submit complaint"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand" />
                <CardTitle className="text-brand">
                  ComplaintTriage Assist
                </CardTitle>
              </div>
              <CardDescription>
                Named AI assist that scores urgency from language, category
                pressure, and description clarity — visible at submit time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lastAi ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-accent text-accent-foreground">
                      {lastAi.priority} priority
                    </Badge>
                    <Badge variant="secondary">{lastAi.score}/100</Badge>
                    <Badge variant="outline">{lastAi.algorithm}</Badge>
                  </div>
                  <p className="text-muted-foreground">{lastAi.rationale}</p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Submit a complaint to see ComplaintTriage Assist score it live
                  (High / Medium / Low) with a human-readable rationale.
                </p>
              )}
              <p className="rounded-lg border bg-white/80 p-3 text-xs text-muted-foreground">
                Public tracking: anyone with a reference (ZSP-…) can check
                status from the landing page — no login required.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-brand text-xl text-brand">
          {canManage ? "Complaint inbox & tracking" : "My complaints"}
        </h2>
        <div className="flex flex-wrap gap-1">
          {(["all", "pending", "in_progress", "resolved"] as const).map(
            (key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "All" : key.replaceAll("_", " ")}
              </Button>
            ),
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((report) => {
          const bucket = bucketFor(report.status);
          return (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {report.reference}
                    </CardTitle>
                    <CardDescription>
                      {report.category} · {report.district}, {report.province}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={
                        bucket === "resolved"
                          ? "secondary"
                          : bucket === "in_progress"
                            ? "default"
                            : "outline"
                      }
                    >
                      {bucket === "pending"
                        ? "Pending"
                        : bucket.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {report.status.replaceAll("_", " ")}
                    </Badge>
                    {report.aiPriority ? (
                      <Badge className="bg-brand/10 text-brand">
                        AI {report.aiPriority}
                        {report.aiScore ? ` · ${report.aiScore}` : ""}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{report.description}</p>
                {report.locationDetail ? (
                  <p className="text-xs text-muted-foreground">
                    Location: {report.locationDetail}
                  </p>
                ) : null}
                {report.aiRationale ? (
                  <p className="rounded-md bg-secondary/50 p-2 text-xs text-muted-foreground">
                    {report.aiRationale}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {PIPELINE.map((step) => {
                    const active = step.match(report.status);
                    const Icon = step.icon;
                    return (
                      <span
                        key={step.key}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                          active
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3" />
                        {step.label}
                      </span>
                    );
                  })}
                </div>

                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={report.status}
                      onValueChange={(value) =>
                        updateReport(
                          report.id,
                          value as CitizenReportStatus,
                        )
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "submitted",
                            "acknowledged",
                            "in_progress",
                            "resolved",
                            "closed",
                          ] as CitizenReportStatus[]
                        ).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => triageReport(report.id)}
                      disabled={Boolean(report.workflowActionId)}
                    >
                      {report.workflowActionId
                        ? "In workflow"
                        : "Triage to workflow"}
                    </Button>
                    {report.workflowActionId ? (
                      <Link
                        href="/workflow"
                        className="self-center text-sm text-brand underline"
                      >
                        Open workflow
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {report.events?.length ? (
                  <ol className="border-l pl-4 text-xs text-muted-foreground">
                    {report.events.map((event) => (
                      <li key={event.id} className="mb-2">
                        <span className="font-medium text-foreground">
                          {event.status.replaceAll("_", " ")}
                        </span>
                        {" · "}
                        {new Date(event.createdAt).toLocaleString()}
                        {event.note ? <div>{event.note}</div> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {!filtered.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {filter === "all"
                ? "No complaints yet. Submit one to start tracking."
                : `No ${filter.replaceAll("_", " ")} complaints in this view.`}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
