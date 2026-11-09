import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const respuesta = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  respuesta.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return respuesta;
}
