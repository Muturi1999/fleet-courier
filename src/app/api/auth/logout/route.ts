import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_TOKEN_COOKIE } from "@/lib/auth-config";

const secure = process.env.NODE_ENV === "production";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0, secure, sameSite: "lax" });
  response.cookies.set(AUTH_TOKEN_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, secure, sameSite: "lax" });
  return response;
}
