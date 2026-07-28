import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/api/health",
  "/api/auth",
  "/api/contact",
  "/api/public",
  "/api/citizen-reports/track",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) =>
    p === "/"
      ? pathname === "/"
      : pathname === p || pathname.startsWith(`${p}/`),
  );

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Auth.js sets `__Secure-authjs.session-token` on HTTPS. Without
  // `secureCookie: true`, getToken looks for `authjs.session-token` and
  // always returns null — login appears to succeed then bounces to /login.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
