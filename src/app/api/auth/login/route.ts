import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { matchKey } from "@/lib/match-key";
import { firmarSesion, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import type { Atleta } from "@/lib/types";

/** Formulario clásico (sin fetch): ver la nota en /api/auth/registrar. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const nombreIngresado = String(form.get("usuario") ?? "");
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/club";

  function conError(mensaje: string) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", mensaje);
    if (nombreIngresado) url.searchParams.set("usuario", nombreIngresado);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!nombreIngresado.trim() || !password) {
    return conError("Ingresa tu usuario y tu contraseña.");
  }

  const db = supabaseAdmin();
  const { data: atleta } = await db
    .from("atletas")
    .select("*")
    .eq("match_key", matchKey(nombreIngresado))
    .eq("activo", true)
    .maybeSingle<Atleta>();

  if (!atleta || !atleta.password_hash) {
    // Mismo mensaje tanto si el usuario no existe como si no ha activado su
    // cuenta todavía: no revelamos cuál de las dos cosas pasó.
    return conError("Usuario o contraseña incorrectos, o todavía no creaste tu cuenta.");
  }

  const coincide = await bcrypt.compare(password, atleta.password_hash);
  if (!coincide) {
    return conError("Usuario o contraseña incorrectos.");
  }

  const token = await firmarSesion({
    atletaId: atleta.id,
    matchKey: atleta.match_key,
    nombre: atleta.nombre,
  });

  const respuesta = NextResponse.redirect(new URL(destino, request.url), { status: 303 });
  respuesta.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return respuesta;
}
