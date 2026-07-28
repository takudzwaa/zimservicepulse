"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg border-alert/30">
      <CardHeader>
        <Badge variant="secondary" className="w-fit border border-alert/20 text-alert">
          Something went wrong
        </Badge>
        <CardTitle className="text-brand">This page hit an error</CardTitle>
        <CardDescription>
          The console couldn&apos;t finish loading this view. You can try again or head
          back to your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          Return home
        </Link>
      </CardContent>
    </Card>
  );
}
