import Link from "next/link";
import {
  BarChart3,
  BrainCircuit,
  Droplets,
  HardHat,
  MapPinned,
  PackageCheck,
  Route,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MUNICIPAL_SERVICES } from "@/lib/municipal-services";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const presentation: Record<string, {
  icon: LucideIcon;
}> = {
  requests: { icon: HardHat },
  assets: { icon: PackageCheck },
  roads: { icon: Route },
  waste: { icon: Trash2 },
  water: { icon: Droplets },
  performance: { icon: BarChart3 },
  wards: { icon: UserRoundCheck },
  gis: { icon: MapPinned },
  forecast: { icon: BrainCircuit },
};

const capabilities: Array<{
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  state: "Operational" | "Integration ready";
  href: string;
}> = MUNICIPAL_SERVICES.map((service) => ({
  ...service,
  icon: presentation[service.slug]!.icon,
}));

export function ServiceCoverage({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <section aria-labelledby="service-coverage-title" className="space-y-3">
      {showIntro ? <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="service-coverage-title" className="font-brand text-xl text-brand">
            Municipal service coverage
          </h2>
          <p className="text-sm text-muted-foreground">
            One operational picture for resident reports, field work and council performance.
          </p>
        </div>
        <div className="flex gap-1.5 text-xs text-muted-foreground">
          <Badge>Operational</Badge>
          <Badge variant="secondary">Integration ready</Badge>
        </div>
      </div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          const content = (
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-brand/10 p-2 text-brand">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <Badge variant={capability.state === "Operational" ? "default" : "secondary"}>
                    {capability.state}
                  </Badge>
                </div>
                <CardTitle className="text-brand">{capability.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{capability.description}</CardDescription>
              </CardContent>
            </Card>
          );
          return (
            <Link key={capability.title} href={capability.href} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
              {content}
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Integration-ready modules publish their source-data contracts and remain
        unpopulated until authoritative council records are connected.
      </p>
    </section>
  );
}
