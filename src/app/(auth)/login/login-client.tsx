"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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

const ALLOW_DEMO_USERS = process.env.NEXT_PUBLIC_ALLOW_DEMO_USERS === "true";
const DEMO_PIN = "Zim2026!";

const DEMO_ACCOUNTS = [
  { email: "district@pulse.zw", role: "Council · District Manager" },
  { email: "analyst@pulse.zw", role: "Ministry · Provincial Analyst" },
  { email: "channels@pulse.zw", role: "Council · Channel Lead" },
  { email: "business@pulse.zw", role: "Business stakeholder" },
  { email: "research@pulse.zw", role: "Researcher stakeholder" },
  { email: "citizen@pulse.zw", role: "Citizen stakeholder" },
  { email: "admin@pulse.zw", role: "Admin" },
];

export default function LoginClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState(ALLOW_DEMO_USERS ? "district@pulse.zw" : "");
  const [pin, setPin] = useState(ALLOW_DEMO_USERS ? DEMO_PIN : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        pin,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      // Full navigation so middleware always sees the new session cookie.
      const dest = params.get("callbackUrl") || "/dashboard";
      window.location.assign(dest);
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
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
            Sign in with your work email and password to open the operations
            console.
          </CardDescription>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            <Link href="/" className="text-brand underline-offset-2 hover:underline">
              ← Back to home
            </Link>
          </p>
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
              <Label htmlFor="pin">Password</Label>
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
            <p className="text-center text-xs">
              <Link href="/forgot-password" className="text-brand hover:underline">
                Forgot your password?
              </Link>
            </p>
          </form>
          {ALLOW_DEMO_USERS ? <div className="mt-6 space-y-2">
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
          </div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
