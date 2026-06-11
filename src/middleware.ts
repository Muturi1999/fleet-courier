import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, parseAuthCookie } from "@/lib/auth-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isClient = pathname.startsWith("/client");

  if (!isAdmin && !isClient) return NextResponse.next();

  const user = parseAuthCookie(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdmin && user.role !== "admin") {
    return NextResponse.redirect(new URL("/client", request.url));
  }
  if (isClient && user.role !== "client") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*"],
};
