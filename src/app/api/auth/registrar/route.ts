import { NextRequest, NextResponse } from "next/server";
import { registrarAtleta } from "@/lib/registro";
import { firmarSesion, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

/** Formulario clásico (sin fetch): evita que un fallo silencioso de
 * JavaScript en el navegador del atleta le impida ver si su registro
 * funcionó o no. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const nombre = String(form.get("nombre") ?? "");
  const password = String(form.get("password") ?? "");

  const resultado = await registrarAtleta(nombre, password);

  if (!resultado.ok) {
    const url = new URL("/activar", request.url);
    url.searchParams.set("error", resultado.error);
    if (nombre) url.searchParams.set("nombre", nombre);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await firmarSesion({
    atletaId: resultado.atletaId,
    matchKey: resultado.matchKey,
    nombre: resultado.nombre,
  });

  const respuesta = NextResponse.redirect(new URL("/club", request.url), { status: 303 });
  respuesta.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return respuesta;
}
