"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import type {
  CitizenReportStatus,
  DataAccessRequestStatus,
} from "@/lib/types";

type ReportView = {
  id: string;
  reference: string;
  province: string;
  district: string;
  category: string;
  description: string;
  locationDetail: string | null;
  status: string;
  workflowActionId: string | null;
  createdAt: string;
  events?: { id: string; status: string; note: string | null; createdAt: string }[];
};

export function CitizenReportsClient({
  mode,
  reports,
  places,
  categories,
}: {
  mode: "citizen" | "manage";
  reports: ReportView[];
  places: { province: string; district: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const provinces = useMemo(
    () => Array.from(new Set(places.map((place) => place.province))).sort(),
    [places],
  );
  const [province, setProvince] = useState(provinces[0] ?? "");
  const districts = places
    .filter((place) => place.province === province)
    .map((place) => place.district);
  const [district, setDistrict] = useState(districts[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [pending, setPending] = useState(false);

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
      toast.error(data.error ?? "Could not submit report");
      return;
    }
    toast.success(`Report submitted: ${data.reference}`);
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
      toast.error("Could not update report");
      return;
    }
    toast.success("Report updated");
    router.refresh();
  }

  async function triageReport(id: string) {
    const res = await fetch(`/api/citizen-reports/${id}/triage`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Could not triage report");
      return;
    }
    const data = await res.json();
    toast.success(data.created ? "Added to workflow" : "Already in workflow");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {mode === "citizen" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-brand">Report a service problem</CardTitle>
            <CardDescription>
              Submit a council service issue and keep the generated reference for tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitReport} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Province</Label>
                <Select
                  value={province}
                  onValueChange={(value) => {
                    const next = String(value ?? "");
                    setProvince(next);
                    setDistrict(
                      places.find((place) => place.province === next)?.district ?? "",
                    );
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Select value={district} onValueChange={(value) => setDistrict(String(value ?? ""))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {districts.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Service category</Label>
                <Select value={category} onValueChange={(value) => setCategory(String(value ?? ""))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="report-description">What is happening?</Label>
                <Textarea
                  id="report-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location-detail">Location detail (optional)</Label>
                <Input
                  id="location-detail"
                  value={locationDetail}
                  onChange={(event) => setLocationDetail(event.target.value)}
                  placeholder="Street, landmark, or neighbourhood"
                  maxLength={300}
                />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Submitting…" : "Submit service report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{report.reference}</CardTitle>
                  <CardDescription>
                    {report.category} · {report.district}, {report.province}
                  </CardDescription>
                </div>
                <Badge variant={report.status === "resolved" || report.status === "closed" ? "secondary" : "default"}>
                  {report.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{report.description}</p>
              {report.locationDetail ? (
                <p className="text-xs text-muted-foreground">Location: {report.locationDetail}</p>
              ) : null}
              {mode === "manage" ? (
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={report.status}
                    onValueChange={(value) =>
                      updateReport(report.id, value as CitizenReportStatus)
                    }
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["acknowledged", "in_progress", "resolved", "closed"].map((status) => (
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
                    {report.workflowActionId ? "In workflow" : "Triage to workflow"}
                  </Button>
                  {report.workflowActionId ? <Link href="/workflow" className="self-center text-sm text-brand underline">Open workflow</Link> : null}
                </div>
              ) : report.events?.length ? (
                <ol className="border-l pl-4 text-xs text-muted-foreground">
                  {report.events.map((event) => (
                    <li key={event.id} className="mb-2">
                      <span className="font-medium text-foreground">{event.status.replaceAll("_", " ")}</span>
                      {" · "}{new Date(event.createdAt).toLocaleString()}
                      {event.note ? <div>{event.note}</div> : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!reports.length ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
            {mode === "citizen" ? "You have not submitted any reports yet." : "No citizen reports are waiting in your assigned area."}
          </CardContent></Card>
        ) : null}
      </div>
    </div>
  );
}

type AccessRequestView = {
  id: string;
  organization: string;
  purpose: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
};

type GrantView = {
  id: string;
  requestId: string;
  expiresAt: string;
  downloadCount: number;
  downloadUrl: string;
};

export function DataAccessRequestClient({
  requests,
  grants = [],
}: {
  requests: AccessRequestView[];
  grants?: GrantView[];
}) {
  const router = useRouter();
  const [organization, setOrganization] = useState("");
  const [purpose, setPurpose] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [geographies, setGeographies] = useState("");
  const [categories, setCategories] = useState("");
  const [dateRange, setDateRange] = useState("January–June 2026");
  const [accepted, setAccepted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const res = await fetch("/api/data-access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization,
        purpose,
        intendedUse,
        geographies: split(geographies),
        categories: split(categories),
        dateRange,
        licenceAccepted: accepted,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not submit request");
      return;
    }
    toast.success("Data-access request submitted");
    setPurpose("");
    setIntendedUse("");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-brand">Request governed data access</CardTitle>
          <CardDescription>
            Requests are reviewed for purpose, proportionality, anonymization and licensing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2"><Label htmlFor="organization">Organization</Label><Input id="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="purpose">Research or business purpose</Label><Textarea id="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} minLength={20} required /></div>
            <div className="space-y-2"><Label htmlFor="intended-use">Intended outputs and users</Label><Textarea id="intended-use" value={intendedUse} onChange={(event) => setIntendedUse(event.target.value)} minLength={20} required /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="geographies">Geographies</Label><Input id="geographies" value={geographies} onChange={(event) => setGeographies(event.target.value)} placeholder="Harare, Bulawayo" /></div>
              <div className="space-y-2"><Label htmlFor="categories">Categories</Label><Input id="categories" value={categories} onChange={(event) => setCategories(event.target.value)} placeholder="Water, waste" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="date-range">Date range</Label><Input id="date-range" value={dateRange} onChange={(event) => setDateRange(event.target.value)} required /></div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required className="mt-1" />
              I acknowledge that access is subject to governance review, anonymization controls, and an appropriate data-sharing licence.
            </label>
            <Button type="submit">Submit access request</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-brand">Your requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => {
            const grant = grants.find((g) => g.requestId === request.id);
            const grantExpired = grant ? new Date(grant.expiresAt) < new Date() : false;
            return (
              <div key={request.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-2"><strong>{request.organization}</strong><Badge variant="secondary">{request.status.replaceAll("_", " ")}</Badge></div>
                <p className="mt-2 text-muted-foreground">{request.purpose}</p>
                {request.reviewNote ? <p className="mt-2"><strong>Review note:</strong> {request.reviewNote}</p> : null}
                {grant ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-secondary/40 p-2">
                    {grantExpired ? (
                      <Badge variant="destructive">Download expired</Badge>
                    ) : (
                      <a
                        href={grant.downloadUrl}
                        className="text-sm font-medium text-brand underline"
                      >
                        Download governed CSV
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {grantExpired ? "Expired" : "Expires"}{" "}
                      {new Date(grant.expiresAt).toLocaleString()} ·{" "}
                      {grant.downloadCount} download{grant.downloadCount === 1 ? "" : "s"} so far
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!requests.length ? <p className="text-sm text-muted-foreground">No requests submitted yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function GovernanceReviewClient({
  requests,
}: {
  requests: AccessRequestView[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function review(id: string, status: DataAccessRequestStatus) {
    const res = await fetch(`/api/data-access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: notes[id] ?? "" }),
    });
    if (!res.ok) {
      toast.error("Review requires a note of at least three characters");
      return;
    }
    toast.success("Decision recorded");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex justify-between gap-3">
              <div><CardTitle className="text-brand">{request.organization}</CardTitle><CardDescription>{request.purpose}</CardDescription></div>
              <Badge>{request.status.replaceAll("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Decision note" value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => review(request.id, "approved")}>Approve</Button>
              <Button variant="outline" onClick={() => review(request.id, "changes_requested")}>Request changes</Button>
              <Button variant="destructive" onClick={() => review(request.id, "rejected")}>Reject</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!requests.length ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No access requests to review.</CardContent></Card> : null}
    </div>
  );
}
