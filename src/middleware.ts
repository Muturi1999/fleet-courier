import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, parseAuthCookie } from "@/lib/auth-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isClient = pathname.startsWith("/client");
  const isPlatform = pathname.startsWith("/platform") && !pathname.startsWith("/platform/login");

  if (!isAdmin && !isClient && !isPlatform) return NextResponse.next();

  const user = parseAuthCookie(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) {
    const login = new URL(isPlatform ? "/platform/login" : "/login", request.url);
    login.searchParams.set("from", pathname);
    if (!isPlatform && user === null) {
      const tenant = parseAuthCookie(request.cookies.get(AUTH_COOKIE)?.value)?.tenantSlug;
      if (tenant) login.searchParams.set("tenant", tenant);
    }
    return NextResponse.redirect(login);
  }

  if (isPlatform) {
    if (user.role !== "platform_admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (isAdmin && user.role !== "admin") {
    return NextResponse.redirect(new URL(user.role === "platform_admin" ? "/platform" : "/client", request.url));
  }
  if (isClient && user.role !== "client") {
    return NextResponse.redirect(new URL(user.role === "platform_admin" ? "/platform" : "/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/platform/:path*"],
};
