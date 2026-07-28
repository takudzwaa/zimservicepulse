"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Options = {
  provinces: string[];
  districts: Record<string, string[]>;
  categories: string[];
};

export function PublicReportForm() {
  const [options, setOptions] = useState<Options>({ provinces: [], districts: {}, categories: [] });
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/public/options")
      .then((response) => response.json())
      .then((data) => setOptions(data));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/public/citizen-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        province,
        district,
        category: form.get("category"),
        description: form.get("description"),
        locationDetail: form.get("locationDetail"),
        website: form.get("website"),
      }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Could not submit report");
    setSent(true);
  }

  if (sent) {
    return <p className="rounded-lg border border-brand/20 bg-brand/5 p-4 text-sm">Check your email and verify the report within 30 minutes. A tracking reference is created only after verification.</p>;
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="report-email">Email</Label><Input id="report-email" name="email" type="email" required /></div>
      <div className="space-y-1"><Label htmlFor="report-province">Province</Label><select id="report-province" required value={province} onChange={(e) => { setProvince(e.target.value); setDistrict(""); }} className="h-9 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Select province</option>{options.provinces.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="report-district">District</Label><select id="report-district" required value={district} onChange={(e) => setDistrict(e.target.value)} className="h-9 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Select district</option>{(options.districts[province] ?? []).map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="report-category">Service category</Label><select id="report-category" name="category" required className="h-9 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Select category</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="report-description">What is happening?</Label><Textarea id="report-description" name="description" minLength={10} required /></div>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="report-location">Location detail</Label><Input id="report-location" name="locationDetail" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error ? <p className="text-sm text-alert sm:col-span-2">{error}</p> : null}
      <Button className="sm:col-span-2">Email verification link</Button>
    </form>
  );
}
