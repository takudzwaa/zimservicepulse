export function severityBadgeVariant(severity: string): "destructive" | "secondary" {
  return severity === "high" ? "destructive" : "secondary";
}

export function severityBorderClass(severity: string): string {
  return severity === "high" ? "border-l-alert" : "border-l-gold";
}
