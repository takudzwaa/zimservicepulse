import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function StakeholdersPage() {
  const session = await auth();
  if (session!.user.role === "admin") redirect("/governance");
  redirect(`/stakeholders/${session!.user.audience ?? "council"}`);
}
