import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          404
        </Badge>
        <CardTitle className="text-brand">Page not found</CardTitle>
        <CardDescription>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/dashboard" className={cn(buttonVariants())}>
          Return home
        </Link>
      </CardContent>
    </Card>
  );
}
