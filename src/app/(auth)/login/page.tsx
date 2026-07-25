import { Suspense } from "react";
import LoginClient from "./login-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
