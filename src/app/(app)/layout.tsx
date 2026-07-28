import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { ensureSchema } from "@/lib/db";
import { seedDemoUsers } from "@/lib/db/seed";

/** Authenticated console — always request-time (session + PGlite/Neon). */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSchema();
  if (
    process.env.ALLOW_DEMO_USERS === "true" ||
    process.env.NODE_ENV !== "production"
  ) {
    await seedDemoUsers();
  }
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        audience: session.user.audience,
      }}
    >
      {children}
    </AppShell>
  );
}
