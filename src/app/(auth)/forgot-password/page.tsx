"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset your password</CardTitle></CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">If the account exists, a reset link has been emailed. <Link className="text-brand underline" href="/login">Return to login</Link>.</p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <Button className="w-full">Send reset link</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
