"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  Presentation,
  Workflow,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/command-center", label: "Command Center", icon: Inbox },
  { href: "/explore", label: "Explore", icon: Map },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/workflow", label: "Workflow", icon: Workflow },
  { href: "/briefing", label: "AI4I Briefing", icon: Presentation },
];

const ROLE_LABEL: Record<UserRole, string> = {
  district_manager: "District Manager",
  provincial_analyst: "Provincial Analyst",
  channel_lead: "Channel Lead",
  admin: "Admin",
};

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/90 shadow-[0_1px_0_rgba(11,46,89,.04)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_sidebar.png" alt="ZimServicePulse" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <div className="font-brand text-lg font-semibold leading-none text-brand">
                ZimServicePulse
              </div>
              <div className="text-[11px] text-muted-foreground">
                See the pressure. Act with precision.
              </div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 border border-brand/10">
              <Activity className="size-3 text-brand" />
              {ROLE_LABEL[user.role]}
            </Badge>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {user.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-4" />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-0 md:gap-4">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-sidebar-border bg-sidebar/80 p-3 md:block">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 animate-in-fade">
          <div className="mb-4 flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1 text-xs",
                  pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
