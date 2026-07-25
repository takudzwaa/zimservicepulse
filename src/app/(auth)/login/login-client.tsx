"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEMO_PIN = "Zim2026!";

const DEMO_ACCOUNTS = [
  { email: "district@pulse.zw", role: "District Manager (Chinhoyi)" },
  { email: "analyst@pulse.zw", role: "Provincial Analyst" },
  { email: "channels@pulse.zw", role: "Channel Lead" },
  { email: "admin@pulse.zw", role: "Admin" },
];

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("district@pulse.zw");
  const [pin, setPin] = useState(DEMO_PIN);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      pin,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or PIN");
      return;
    }
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-t-4 border-t-brand shadow-lg animate-in-up">
        <CardHeader className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="ZimServicePulse"
            className="mx-auto mb-3 h-12 w-auto"
          />
          <CardTitle className="font-brand text-2xl text-brand">
            ZimServicePulse
          </CardTitle>
          <CardDescription>
            Sign in with your role account and PIN to open the operations
            console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-alert">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Demo accounts (PIN: {DEMO_PIN})
            </p>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="rounded-md border bg-secondary/40 px-3 py-2 text-left text-xs hover:bg-secondary"
                  onClick={() => {
                    setEmail(a.email);
                    setPin(DEMO_PIN);
                  }}
                >
                  <div className="font-medium">{a.role}</div>
                  <div className="text-muted-foreground">{a.email}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
