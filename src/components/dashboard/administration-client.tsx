"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Authority = { id: string; name: string; slug: string; kind: string; active: boolean };
type Invitation = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

const ROLE_OPTIONS = [
  { value: "district_manager", label: "District manager" },
  { value: "provincial_analyst", label: "Analyst" },
  { value: "channel_lead", label: "Channel lead" },
];

function invitationStatus(invite: Invitation): { label: string; variant: "secondary" | "outline" | "destructive" } {
  if (invite.usedAt) return { label: "Accepted", variant: "secondary" };
  if (new Date(invite.expiresAt) < new Date()) return { label: "Expired", variant: "destructive" };
  return { label: "Pending", variant: "outline" };
}

export function AdministrationClient({
  authorities,
  invitations,
}: {
  authorities: Authority[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [authorityId, setAuthorityId] = useState(authorities[0]?.id ?? "");
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [creatingAuthority, setCreatingAuthority] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function createAuthority(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingAuthority) return;
    setCreatingAuthority(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/authorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          province: form.get("province") || undefined,
          districts: String(form.get("districts") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        toast.error("Could not create authority");
        return;
      }
      toast.success("Authority created");
      event.currentTarget.reset();
      router.refresh();
    } finally {
      setCreatingAuthority(false);
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorityId,
          name: form.get("name"),
          email: form.get("email"),
          role,
          assignedDistricts: String(form.get("districts") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        toast.error("Could not send invitation");
        return;
      }
      toast.success("Invitation sent");
      event.currentTarget.reset();
      router.refresh();
    } finally {
      setInviting(false);
    }
  }

  async function toggleActive(item: Authority) {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      const response = await fetch(`/api/admin/authorities/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!response.ok) {
        toast.error("Could not update authority");
        return;
      }
      toast.success(item.active ? "Authority deactivated" : "Authority activated");
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">Platform administration</h1>
        <p className="text-sm text-muted-foreground">
          Create isolated authorities and invite accountable staff.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create authority</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createAuthority}>
              <div className="space-y-1.5">
                <Label htmlFor="authority-name">Name</Label>
                <Input id="authority-name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="authority-slug">URL slug</Label>
                <Input id="authority-slug" name="slug" pattern="[a-z0-9-]+" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="authority-province">Province</Label>
                <Input id="authority-province" name="province" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="authority-districts">Districts (comma separated)</Label>
                <Input id="authority-districts" name="districts" required />
              </div>
              <Button disabled={creatingAuthority}>
                {creatingAuthority ? "Creating…" : "Create authority"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite staff member</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={invite}>
              <div className="space-y-1.5">
                <Label htmlFor="invite-authority">Authority</Label>
                <Select
                  value={authorityId}
                  onValueChange={(value) => setAuthorityId(String(value ?? ""))}
                >
                  <SelectTrigger id="invite-authority" className="w-full">
                    <SelectValue placeholder="Select authority" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorities.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input id="invite-name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(String(value ?? ""))}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-districts">Assigned districts (comma separated)</Label>
                <Input id="invite-districts" name="districts" />
              </div>
              <Button disabled={!authorityId || inviting}>
                {inviting ? "Sending…" : "Send invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {authorities.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
            >
              <div>
                <strong>{item.name}</strong> · {item.kind} · {item.slug}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.active ? "secondary" : "outline"}>
                  {item.active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === item.id}
                  onClick={() => toggleActive(item)}
                >
                  {togglingId === item.id
                    ? "Updating…"
                    : item.active
                      ? "Deactivate"
                      : "Activate"}
                </Button>
              </div>
            </div>
          ))}
          {!authorities.length ? (
            <p className="text-sm text-muted-foreground">No authorities yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => {
                const status = invitationStatus(invite);
                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{new Date(invite.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(invite.expiresAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!invitations.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No invitations sent yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
