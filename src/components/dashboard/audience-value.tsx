import {
  Building2,
  ChartNoAxesCombined,
  FlaskConical,
  Landmark,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const audiences: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}> = [
  {
    title: "Councils",
    description:
      "Dashboards showing requests, response times, hotspots and departmental performance.",
    icon: Building2,
    href: "/stakeholders/council",
  },
  {
    title: "Ministries",
    description:
      "National and provincial analytics comparing service delivery across councils.",
    icon: Landmark,
    href: "/stakeholders/ministry",
  },
  {
    title: "Businesses",
    description:
      "Anonymized infrastructure and market insights, shared where appropriate.",
    icon: ChartNoAxesCombined,
    href: "/stakeholders/business",
  },
  {
    title: "Researchers",
    description:
      "Access to anonymized historical datasets under licence.",
    icon: FlaskConical,
    href: "/stakeholders/researcher",
  },
  {
    title: "Citizens",
    description:
      "Free reporting tools, with premium community features available if desired.",
    icon: UsersRound,
    href: "/stakeholders/citizen",
  },
];

export function AudienceValue() {
  return (
    <section aria-labelledby="audience-value-title" className="space-y-3">
      <div>
        <h2 id="audience-value-title" className="font-brand text-xl text-brand">
          Built for every service-delivery stakeholder
        </h2>
        <p className="text-sm text-muted-foreground">
          A shared intelligence layer, with access and data use matched to each audience.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {audiences.map((audience) => {
          const Icon = audience.icon;
          return (
            <Link key={audience.title} href={audience.href} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="gap-2">
                <span className="w-fit rounded-md bg-brand/10 p-2 text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-brand">{audience.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{audience.description}</CardDescription>
              </CardContent>
            </Card>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        External insight and research access should use anonymization, governance review and the relevant data-sharing licence.
      </p>
    </section>
  );
}
