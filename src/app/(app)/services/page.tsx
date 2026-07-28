import { ServiceCoverage } from "@/components/dashboard/service-coverage";

export default function ServicesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-brand text-3xl font-semibold text-brand">
          Municipal services
        </h1>
        <p className="text-sm text-muted-foreground">
          Operational service intelligence and clearly identified council-data integrations.
        </p>
      </div>
      <ServiceCoverage showIntro={false} />
    </div>
  );
}
