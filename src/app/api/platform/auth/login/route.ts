import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  PLATFORM_TOKEN_COOKIE,
  authCookieValue,
} from "@/lib/auth-config";
import { backendEnabled, platformLogin } from "@/lib/backend-client";

const secure = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (!backendEnabled()) {
    return NextResponse.json({ error: "Platform admin requires backend" }, { status: 503 });
  }

  const res = await platformLogin({ username, password });
  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = {
    username: json.user.username as string,
    role: "platform_admin" as const,
    displayName: json.user.displayName as string,
    email: json.user.email as string | undefined,
  };

  const response = NextResponse.json({ user });
  response.cookies.set(PLATFORM_TOKEN_COOKIE, json.accessToken as string, {
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
