"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  Check,
  Database,
  Landmark,
  Mail,
  MapPinned,
  Menu,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PublicReportForm } from "@/components/landing/public-report-form";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#services", label: "Services" },
  { href: "#ai", label: "AI Algorithms" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About Us" },
  { href: "#contact", label: "Contact Us" },
] as const;
const PUBLIC_REPORTING_ENABLED =
  process.env.NEXT_PUBLIC_PUBLIC_REPORTING_ENABLED === "true";

const FEATURES = [
  {
    icon: Database,
    title: "Council dataset hub",
    description:
      "Local authorities upload and manage their own CSVs. DataQuality Guard validates before activation.",
  },
  {
    icon: MessageSquareWarning,
    title: "Complaint send & track",
    description:
      "Citizens file issues and follow Pending → In progress → Resolved with a public ZSP reference.",
  },
  {
    icon: Sparkles,
    title: "Insights & recommendations",
    description:
      "InsightForge fires named rules and attaches a prioritised action for a named district or channel.",
  },
  {
    icon: BrainCircuit,
    title: "Named AI algorithms",
    description:
      "PulsePressure™, TrendCast OLS, HotspotRank, ChannelROI, ComplaintTriage — formulas shown live.",
  },
  {
    icon: MapPinned,
    title: "Hotspot intelligence map",
    description:
      "District pressure bubbles so managers see where service failure concentrates first.",
  },
  {
    icon: BarChart3,
    title: "Live operational KPIs",
    description:
      "Demand, backlog, on-time resolution, and weighted satisfaction — always filter-consistent.",
  },
  {
    icon: Workflow,
    title: "Workflow & triage",
    description:
      "Turn complaints and insights into accountable action items with comments and status.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based workspaces",
    description:
      "Citizens, councils, ministries, business, and research each get governed access.",
  },
];

const ALGORITHMS = [
  {
    name: "PulsePressure™ Score",
    family: "Scoring",
    formula: "50% backlog + 25% late + 25% low satisfaction (min–max)",
  },
  {
    name: "InsightForge Rules Engine",
    family: "Rules",
    formula: "BacklogLeader · ChannelGap · UrgentConcentration · SatisfactionFloor · SlowResolution",
  },
  {
    name: "TrendCast OLS",
    family: "Forecast",
    formula: "Ordinary least-squares over ≤6 monthly weighted KPIs",
  },
  {
    name: "HotspotRank",
    family: "Ranking",
    formula: "Sort by PulsePressure™ · urgent flag at P75",
  },
  {
    name: "ChannelROI Composite",
    family: "Scoring",
    formula: "resolution × on-time × satisfaction, min–max scaled",
  },
  {
    name: "ComplaintTriage Assist",
    family: "NLP assist",
    formula: "Keyword urgency + category pressure + clarity → High/Med/Low",
  },
  {
    name: "DataQuality Guard",
    family: "Quality",
    formula: "Required columns · nulls · bounds · consistency → 0–100 score",
  },
];

const SERVICES = [
  {
    icon: UsersRound,
    audience: "Citizens",
    title: "Report. Track. Get resolved.",
    points: [
      "Submit complaints in under a minute",
      "Track Pending / In progress / Resolved",
      "Public status lookup with ZSP reference",
      "ComplaintTriage Assist priority at submit",
    ],
    cta: "Open complaints",
    href: "/login?callbackUrl=/complaints",
  },
  {
    icon: Building2,
    audience: "Local Authorities",
    title: "Upload data. Run operations.",
    points: [
      "Dataset hub for council-managed CSVs",
      "Complaint inbox with status updates",
      "Hotspots, KPIs, insights, workflow",
      "Activate only quality-validated extracts",
    ],
    cta: "Council login",
    href: "/login?callbackUrl=/datasets",
  },
  {
    icon: Landmark,
    audience: "Government",
    title: "Compare. Prioritise. Coordinate.",
    points: [
      "Provincial & national analytics",
      "Named algorithms for defendable rankings",
      "Briefing packs and forecast desk",
      "Governance for external data access",
    ],
    cta: "Ministry login",
    href: "/login?callbackUrl=/intelligence",
  },
];

const PLANS = [
  {
    name: "Citizen",
    price: "Free",
    period: "",
    description: "Report issues and track resolution.",
    highlighted: false,
    features: [
      "Complaint submission",
      "Status tracking (Pending → Resolved)",
      "Public reference lookup",
      "Community service summary",
    ],
  },
  {
    name: "Council",
    price: "Pilot",
    period: " / council",
    description: "Full operations console for local authorities.",
    highlighted: true,
    features: [
      "Dataset upload & management",
      "Complaint inbox & triage",
      "AI Lab + InsightForge actions",
      "Hotspot maps, KPIs, briefing export",
      "Role-based district scope",
    ],
  },
  {
    name: "Government",
    price: "Enterprise",
    period: "",
    description: "Multi-council oversight and programmes.",
    highlighted: false,
    features: [
      "Cross-council benchmarking",
      "Named algorithm transparency",
      "Data access governance",
      "Partner & research sharing",
      "Onboarding support",
    ],
  },
];

type TrackResult = {
  reference: string;
  status: string;
  trackingBucket: string;
  category: string;
  district: string;
  province: string;
  aiPriority?: string | null;
  aiScore?: string | null;
  events: { status: string; note: string | null; createdAt: string }[];
};

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("#home");
  const [contactSent, setContactSent] = useState(false);
  const [trackRef, setTrackRef] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.slice(1));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(`#${id}`);
        },
        { rootMargin: "-35% 0px -50% 0px", threshold: 0.1 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  async function onContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        organization: form.get("organisation"),
        message: form.get("message"),
      }),
    });
    if (response.ok) setContactSent(true);
  }

  async function trackComplaint(e: React.FormEvent) {
    e.preventDefault();
    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await fetch(
        `/api/citizen-reports/track?ref=${encodeURIComponent(trackRef.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setTrackError(data.error ?? "Not found");
      } else {
        setTrackResult(data);
      }
    } catch {
      setTrackError("Could not reach tracking service");
    } finally {
      setTrackLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 shadow-[0_1px_0_rgba(11,46,89,.04)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <a href="#home" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_sidebar.png"
              alt="ZimServicePulse"
              className="h-8 w-auto"
            />
            <div className="hidden sm:block">
              <div className="font-brand text-lg font-semibold leading-none text-brand">
                ZimServicePulse
              </div>
              <div className="text-[11px] text-muted-foreground">
                See the pressure. Act with precision.
              </div>
            </div>
          </a>

          <nav className="ml-auto hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-sm transition-colors",
                  active === link.href
                    ? "bg-brand/10 font-medium text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Login
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
              )}
            >
              Get Started
              <ArrowRight className="size-3.5" />
            </Link>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="xl:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-border bg-white px-4 py-3 xl:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    active === link.href
                      ? "bg-brand/10 font-medium text-brand"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                Login
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        {/* Home / Hero */}
        <section
          id="home"
          className="relative overflow-hidden border-b border-border/60"
        >
          <div className="pointer-events-none absolute inset-0 surface-grid opacity-60" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="animate-in-up space-y-6">
              <Badge
                variant="secondary"
                className="border border-brand/10 bg-white/80"
              >
                Starts here · Landing → Data → Complaints → AI → Action
              </Badge>
              <h1 className="font-brand text-4xl font-semibold leading-tight text-brand md:text-5xl">
                See the pressure.
                <br />
                <span className="text-ink">Act with precision.</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                ZimServicePulse is Zimbabwe&apos;s citizen-service hotspot
                platform: councils upload datasets they manage, citizens send
                and track complaints, and named AI algorithms produce insights
                and recommendations you can defend.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 bg-accent px-5 text-sm text-accent-foreground shadow-md hover:bg-accent/90",
                  )}
                >
                  Get Started
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#track"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 px-5 text-sm",
                  )}
                >
                  Track a complaint
                </a>
              </div>
              <dl className="grid max-w-lg grid-cols-3 gap-4 pt-2">
                {[
                  { label: "Named algorithms", value: "7" },
                  { label: "Service areas", value: "6+" },
                  { label: "Stakeholder roles", value: "5" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-xs text-muted-foreground">
                      {stat.label}
                    </dt>
                    <dd className="font-brand text-2xl font-semibold text-brand">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-in-fade grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "1 · Land",
                  body: "Public landing with features, services, AI names, pricing.",
                },
                {
                  title: "2 · Data",
                  body: "Local authorities upload datasets to manage in the hub.",
                },
                {
                  title: "3 · Complaints",
                  body: "Citizens file cases and track Pending → Resolved.",
                },
                {
                  title: "4 · AI & act",
                  body: "Named algorithms → insights → recommendations → workflow.",
                },
              ].map((card) => (
                <Card
                  key={card.title}
                  className="border-white/60 bg-white/90 shadow-sm backdrop-blur"
                >
                  <CardHeader className="gap-1">
                    <CardTitle className="text-brand">{card.title}</CardTitle>
                    <CardDescription>{card.body}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Track complaint — public */}
        <section
          id="track"
          className="border-b border-border/60 bg-white/60 py-12"
        >
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                  Citizen tracking
                </p>
                <h2 className="mt-2 font-brand text-2xl font-semibold text-brand md:text-3xl">
                  Is my complaint pending or resolved?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your ZSP reference — no login required. Status buckets:
                  Pending, In progress, Resolved.
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={trackComplaint} className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      placeholder="e.g. ZSP-MXXXX-ABCD"
                      className="flex-1 font-mono"
                      required
                    />
                    <Button type="submit" disabled={trackLoading} className="gap-2">
                      <Search className="size-4" />
                      {trackLoading ? "Checking…" : "Track"}
                    </Button>
                  </form>
                  {trackError ? (
                    <p className="mt-3 text-sm text-alert">{trackError}</p>
                  ) : null}
                  {trackResult ? (
                    <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{trackResult.trackingBucket.replaceAll("_", " ")}</Badge>
                        <Badge variant="outline">
                          {trackResult.status.replaceAll("_", " ")}
                        </Badge>
                        {trackResult.aiPriority ? (
                          <Badge variant="secondary">
                            AI {trackResult.aiPriority}
                            {trackResult.aiScore
                              ? ` · ${trackResult.aiScore}`
                              : ""}
                          </Badge>
                        ) : null}
                      </div>
                      <p>
                        <strong>{trackResult.reference}</strong> ·{" "}
                        {trackResult.category} · {trackResult.district},{" "}
                        {trackResult.province}
                      </p>
                      {trackResult.events?.slice(0, 4).map((ev, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {ev.status.replaceAll("_", " ")} ·{" "}
                          {new Date(ev.createdAt).toLocaleString()}
                          {ev.note ? ` — ${ev.note}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {PUBLIC_REPORTING_ENABLED ? <section className="border-b border-border/60 py-12">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">Public reporting</p>
              <h2 className="mt-2 font-brand text-2xl font-semibold text-brand md:text-3xl">Report a service issue</h2>
              <p className="mt-2 text-sm text-muted-foreground">No account is required. We verify your email before routing the report and issuing its tracking reference.</p>
            </div>
            <Card><CardContent className="pt-6"><PublicReportForm /></CardContent></Card>
          </div>
        </section> : null}

        {/* Features */}
        <section id="features" className="border-b border-border/60 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                Features
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                What the platform can do
              </h2>
              <p className="mt-3 text-muted-foreground">
                Built for accountable council data ownership, citizen case
                tracking, and transparent operational intelligence.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="h-full transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="gap-3">
                      <span className="w-fit rounded-lg bg-brand/10 p-2.5 text-brand">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <CardTitle className="text-base text-brand">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Services */}
        <section
          id="services"
          className="border-b border-border/60 bg-white/50 py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                Services
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                Citizens · Local Authorities · Government
              </h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <Card key={service.audience} className="flex h-full flex-col">
                    <CardHeader className="gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-brand/10 p-2.5 text-brand">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <Badge variant="secondary">{service.audience}</Badge>
                      </div>
                      <CardTitle className="font-brand text-xl text-brand">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2.5">
                        {service.points.map((point) => (
                          <li
                            key={point}
                            className="flex gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Link
                        href={service.href}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full",
                        )}
                      >
                        {service.cta}
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Algorithms */}
        <section id="ai" className="border-b border-border/60 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                AI that is felt and named
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                Algorithms operators can inspect
              </h2>
              <p className="mt-3 text-muted-foreground">
                No black box. Each algorithm has a product name, family, and
                formula. Open the AI Lab after login to run them live on scoped
                data.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {ALGORITHMS.map((algo) => (
                <Card key={algo.name}>
                  <CardHeader className="gap-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-brand">{algo.name}</CardTitle>
                      <Badge variant="outline">{algo.family}</Badge>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {algo.formula}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/login?callbackUrl=/intelligence"
                className={cn(
                  buttonVariants(),
                  "bg-accent text-accent-foreground hover:bg-accent/90",
                )}
              >
                Open AI Lab after login
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-b border-border/60 bg-white/50 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                Pricing
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                Simple plans for every delivery layer
              </h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "flex h-full flex-col",
                    plan.highlighted &&
                      "shadow-lg shadow-accent/10 ring-2 ring-accent",
                  )}
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-brand">{plan.name}</CardTitle>
                      {plan.highlighted ? (
                        <Badge className="bg-accent text-accent-foreground">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-brand text-3xl font-semibold text-brand">
                        {plan.price}
                      </span>
                      {plan.period ? (
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      ) : null}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({
                          variant: plan.highlighted ? "default" : "outline",
                        }),
                        "w-full",
                        plan.highlighted &&
                          "bg-accent text-accent-foreground hover:bg-accent/90",
                      )}
                    >
                      {plan.highlighted ? "Get Started" : "Talk to us"}
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="border-b border-border/60 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                About Us
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                PulseForge Zimbabwe
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                ZimServicePulse is a Service Delivery Innovation project led by{" "}
                <strong className="text-foreground">Taku Gondo</strong> and the
                PulseForge Zimbabwe team. We turn public service request data
                into visual intelligence, citizen accountability loops, and
                prioritised actions — with algorithms decision-makers can explain.
              </p>
            </div>
            <Card className="bg-brand text-primary-foreground">
              <CardHeader>
                <CardTitle className="font-brand text-2xl text-white">
                  Design for the win criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/90">
                <p>
                  <strong className="text-white">Data</strong> — council dataset
                  hub + validated national extract + quality scores.
                </p>
                <p>
                  <strong className="text-white">Design</strong> — landing first,
                  clear journeys for citizens, councils, government.
                </p>
                <p>
                  <strong className="text-white">Development</strong> — live
                  complaints, AI lab, insights, workflow, maps, roles.
                </p>
                <p>
                  <strong className="text-white">Deployment</strong> — Next.js
                  app ready for Vercel with local PGlite or hosted Postgres.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/70">
                Contact Us
              </p>
              <h2 className="mt-2 font-brand text-3xl font-semibold text-brand md:text-4xl">
                Pilot with your council
              </h2>
            </div>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand">Reach the team</CardTitle>
                  <CardDescription>
                    PulseForge Zimbabwe · Service Delivery Innovation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-4 text-brand" />
                    <div>
                      <div className="font-medium">Email</div>
                      <a
                        href="mailto:hello@zimservicepulse.zw"
                        className="text-muted-foreground hover:text-brand"
                      >
                        hello@zimservicepulse.zw
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand">Send a message</CardTitle>
                </CardHeader>
                <CardContent>
                  {contactSent ? (
                    <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-6 text-sm text-brand">
                      Thank you — your message has been recorded. Email{" "}
                      <a
                        className="font-medium underline"
                        href="mailto:hello@zimservicepulse.zw"
                      >
                        hello@zimservicepulse.zw
                      </a>{" "}
                      for a live pilot.
                    </div>
                  ) : (
                    <form onSubmit={onContactSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="contact-name">Name</Label>
                          <Input id="contact-name" name="name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            name="email"
                            type="email"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-org">Organisation</Label>
                        <Input id="contact-org" name="organisation" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message">Message</Label>
                        <Textarea
                          id="contact-message"
                          name="message"
                          required
                          rows={4}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        Send message
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-brand py-14 text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
            <div>
                <h2 className="font-brand text-2xl font-semibold md:text-3xl">
                Start improving service delivery
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/85">
                Bring council data, citizen reports, operational intelligence,
                and accountable action into one governed platform.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-accent px-5 text-accent-foreground hover:bg-accent/90",
                )}
              >
                Get Started
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 border-white/30 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white",
                )}
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_sidebar.png" alt="" className="h-7 w-auto" />
            <div>
              <div className="text-sm font-semibold text-brand">
                ZimServicePulse
              </div>
              <div className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} PulseForge Zimbabwe
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-brand">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="hover:text-brand">
              Login
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
