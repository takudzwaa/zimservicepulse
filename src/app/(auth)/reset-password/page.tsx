"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormSkeleton } from "@/components/dashboard/console-skeleton";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Password updated." : data.error ?? "Reset failed");
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Choose a new password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {message ? <p className="text-sm">{message} {message === "Password updated." ? <Link className="text-brand underline" href="/login">Sign in</Link> : null}</p> : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={!token}>Update password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<AuthFormSkeleton />}><ResetPasswordForm /></Suspense>;
}
