import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "ZimServicePulse — See the pressure. Act with precision.",
  description:
    "Citizen Service Hotspot & Channel Optimizer for local authorities and government in Zimbabwe. Hotspots, KPIs, insights, and prioritised actions.",
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
