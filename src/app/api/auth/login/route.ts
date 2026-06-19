import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_TOKEN_COOKIE,
  authCookieValue,
  validateLogin,
} from "@/lib/auth-config";
import { backendEnabled, backendLogin } from "@/lib/backend-client";

const secure = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    username?: string;
    password?: string;
    tenantSlug?: string;
  };

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (backendEnabled()) {
    const tenantSlug = body.tenantSlug ?? process.env.FLEET_BACKEND_TENANT ?? "g4s-kenya";
    const res = await backendLogin({ tenantSlug, username, password });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const user = {
      username: json.user.username as string,
      role: json.user.role as "admin" | "client",
      displayName: json.user.displayName as string,
      tenantSlug: json.user.tenant?.slug as string | undefined,
      tenantName: json.user.tenant?.name as string | undefined,
    };

    const response = NextResponse.json({ user, backend: true });
    response.cookies.set(AUTH_TOKEN_COOKIE, json.accessToken as string, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    response.cookies.set(AUTH_COOKIE, authCookieValue(user), {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  const authUser = validateLogin(username, password);
  if (!authUser) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const response = NextResponse.json({ user: authUser, backend: false });
  response.cookies.set(AUTH_COOKIE, authCookieValue(authUser), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
