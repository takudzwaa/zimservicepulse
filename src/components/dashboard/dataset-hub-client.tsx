"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, FileUp, ShieldCheck, Sparkles } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DatasetListItem = {
  id: string;
  name: string;
  description: string | null;
  authorityName: string;
  province: string | null;
  district: string | null;
  filename: string;
  datasetType: string;
  version: number;
  rowCount: string;
  columns: string[];
  qualityScore: string;
  status: string;
  validation: Record<string, unknown>;
  createdAt: string;
};

export function DatasetHubClient({
  datasets,
  defaultAuthority,
  defaultDistrict,
  defaultProvince,
}: {
  datasets: DatasetListItem[];
  defaultAuthority: string;
  defaultDistrict?: string;
  defaultProvince?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("Monthly service extract");
  const [description, setDescription] = useState(
    "Council operational dataset for service-request management",
  );
  const [authorityName, setAuthorityName] = useState(defaultAuthority);
  const [province, setProvince] = useState(defaultProvince ?? "");
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const [filename, setFilename] = useState("");
  const [datasetType, setDatasetType] = useState("service_requests");
  const [csvText, setCsvText] = useState("");
  const [pending, setPending] = useState(false);
  const [lastValidation, setLastValidation] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DatasetListItem | null>(null);

  const activeCount = useMemo(
    () => datasets.filter((d) => d.status === "active").length,
    [datasets],
  );

  async function onFile(file: File | null) {
    if (!file) return;
    setFilename(file.name);
    const text = await file.text();
    setCsvText(text);
    if (!name || name === "Monthly service extract") {
      setName(file.name.replace(/\.csv$/i, ""));
    }
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!csvText.trim()) {
      toast.error("Choose a CSV file or paste CSV content");
      return;
    }
    setPending(true);
    const res = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        authorityName,
        province: province || undefined,
        district: district || undefined,
        filename: filename || "upload.csv",
        datasetType,
        csvText,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    setLastValidation(data.validation ?? null);
    toast.success(
      `DataQuality Guard scored ${data.qualityScore}/100 · status ${data.status}`,
    );
    setCsvText("");
    setFilename("");
    router.refresh();
  }

  async function withRowBusy(key: string, run: () => Promise<void>) {
    if (rowBusy.has(key)) return;
    setRowBusy((prev) => new Set(prev).add(key));
    try {
      await run();
    } finally {
      setRowBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function setStatus(id: string, status: string) {
    return withRowBusy(`${status}:${id}`, async () => {
      const res = await fetch(`/api/datasets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update dataset");
        return;
      }
      toast.success(`Dataset marked ${status}`);
      router.refresh();
    });
  }

  function remove(id: string) {
    return withRowBusy(`delete:${id}`, async () => {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete dataset");
        return;
      }
      toast.success("Dataset removed");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Managed datasets</CardDescription>
            <CardTitle className="text-2xl text-brand">{datasets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active for operations</CardDescription>
            <CardTitle className="text-2xl text-brand">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Validation algorithm</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base text-brand">
              <ShieldCheck className="size-4" />
              DataQuality Guard
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="size-4 text-brand" />
              <CardTitle className="text-brand">
                Upload council dataset
              </CardTitle>
            </div>
            <CardDescription>
              Local authorities add CSV extracts they want to manage — service
              requests, inspections, ward volumes. DataQuality Guard validates
              before activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={upload} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ds-file">CSV file</Label>
                <Input
                  id="ds-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-type">Dataset type</Label>
                <Select
                  value={datasetType}
                  onValueChange={(value) => setDatasetType(String(value ?? ""))}
                >
                  <SelectTrigger id="ds-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_requests">Service requests</SelectItem>
                    <SelectItem value="assets">Asset register</SelectItem>
                    <SelectItem value="wards">Wards & councillors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-name">Dataset name</Label>
                <Input
                  id="ds-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-authority">Local authority</Label>
                <Input
                  id="ds-authority"
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-province">Province</Label>
                <Input
                  id="ds-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-district">District</Label>
                <Input
                  id="ds-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ds-desc">What will you manage with this?</Label>
                <Textarea
                  id="ds-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ds-csv">Or paste CSV</Label>
                <Textarea
                  id="ds-csv"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={6}
                  placeholder="month,province,district,service_category,requests_received,unresolved_backlog,..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={pending} className="gap-2">
                  <Database className="size-4" />
                  {pending ? "Validating…" : "Upload & validate"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-brand/20 bg-brand/[0.03]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <CardTitle className="text-brand">
                DataQuality Guard (live)
              </CardTitle>
            </div>
            <CardDescription>
              Named algorithm checks required columns, empty cells, coordinate
              bounds, and resolved ≤ received consistency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lastValidation ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge>Score {String(lastValidation.score)}/100</Badge>
                  <Badge variant="secondary">
                    {String(lastValidation.status)}
                  </Badge>
                  <Badge variant="outline">
                    {String(lastValidation.rowCount)} rows
                  </Badge>
                </div>
                {"missingRequired" in lastValidation &&
                Array.isArray(lastValidation.missingRequired) &&
                lastValidation.missingRequired.length ? (
                  <p className="text-alert">
                    Missing: {(lastValidation.missingRequired as string[]).join(", ")}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Required columns present. Activate when you are ready to
                    manage this extract.
                  </p>
                )}
                {"issues" in lastValidation &&
                Array.isArray(lastValidation.issues) &&
                (lastValidation.issues as string[]).length ? (
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {(lastValidation.issues as string[]).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                Upload a CSV to see a transparent quality score and issue list.
                Activation is blocked below 70/100.
              </p>
            )}
            <div className="rounded-lg border bg-white p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Expected core columns:</strong>{" "}
              month, province, district, service_category, requests_received,
              unresolved_backlog — plus optional lat/lon, channels, satisfaction.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand">Your managed datasets</CardTitle>
          <CardDescription>
            Activate validated extracts for operational use, or archive retired
            files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell>
                    <div className="font-medium">{ds.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ds.datasetType.replaceAll("_", " ")} v{ds.version} · {ds.filename}
                      {ds.district ? ` · ${ds.district}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>{ds.authorityName}</TableCell>
                  <TableCell>{Number(ds.rowCount).toLocaleString()}</TableCell>
                  <TableCell>{ds.qualityScore}/100</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ds.status === "active"
                          ? "default"
                          : ds.status === "needs_attention"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {ds.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={rowBusy.has(`active:${ds.id}`)}
                        onClick={() => setStatus(ds.id, "active")}
                      >
                        {rowBusy.has(`active:${ds.id}`) ? "Activating…" : "Activate"}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={rowBusy.has(`archived:${ds.id}`)}
                        onClick={() => setStatus(ds.id, "archived")}
                      >
                        {rowBusy.has(`archived:${ds.id}`) ? "Archiving…" : "Archive"}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(ds)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!datasets.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No council datasets yet. Upload the first extract to start
                    managing your own operational data.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete dataset?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" (${deleteTarget.filename}) will be permanently removed. This can't be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(deleteTarget) && rowBusy.has(`delete:${deleteTarget!.id}`)}
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              {deleteTarget && rowBusy.has(`delete:${deleteTarget.id}`)
                ? "Deleting…"
                : "Delete dataset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
