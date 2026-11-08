import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verificarSesion } from "@/lib/session";

const RUTAS_PROTEGIDAS = ["/club", "/mi-ficha"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esProtegida = RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
  if (!esProtegida) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sesion = token ? await verificarSesion(token) : null;

  if (!sesion) {
    const urlLogin = new URL("/login", request.url);
    urlLogin.searchParams.set("next", pathname);
    return NextResponse.redirect(urlLogin);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/club/:path*", "/mi-ficha/:path*"],
};
