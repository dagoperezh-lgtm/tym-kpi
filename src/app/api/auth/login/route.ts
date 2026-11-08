import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { matchKey } from "@/lib/match-key";
import { firmarSesion, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import type { Atleta } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const nombreIngresado = typeof body?.usuario === "string" ? body.usuario : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!nombreIngresado.trim() || !password) {
    return NextResponse.json({ error: "Ingresa tu usuario y tu contraseña." }, { status: 400 });
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
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos, o tu cuenta todavía no está activada." },
      { status: 401 }
    );
  }

  const coincide = await bcrypt.compare(password, atleta.password_hash);
  if (!coincide) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const token = await firmarSesion({
    atletaId: atleta.id,
    matchKey: atleta.match_key,
    nombre: atleta.nombre,
  });

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return respuesta;
}
