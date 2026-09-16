import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const STORE_ROUTES = ["/dashboard", "/monitor", "/pedidos", "/catalogo", "/configuracoes"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (nextUrl.pathname === "/login") {
    if (isLoggedIn) {
      const dest = role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (nextUrl.pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (STORE_ROUTES.some((p) => nextUrl.pathname.startsWith(p)) && role !== "STORE_USER") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/webhook|api/cron|api/images|_next/static|_next/image|favicon.ico).*)",
  ],
};
