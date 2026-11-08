import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { firmarSesion, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import type { Activacion, Atleta } from "@/lib/types";

const PASSWORD_MIN = 6;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Falta el token de activación." }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN) {
    return NextResponse.json(
      { error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: activacion } = await db
    .from("activaciones")
    .select("*")
    .eq("token", token)
    .maybeSingle<Activacion>();

  if (!activacion) {
    return NextResponse.json({ error: "Link de activación inválido." }, { status: 404 });
  }
  if (activacion.usado_en) {
    return NextResponse.json(
      { error: "Este link de activación ya fue usado. Si ya definiste tu contraseña, inicia sesión normalmente." },
      { status: 410 }
    );
  }
  if (new Date(activacion.expira_en).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Este link de activación venció. Pídele uno nuevo a quien administra el club." },
      { status: 410 }
    );
  }

  const { data: atleta } = await db
    .from("atletas")
    .select("*")
    .eq("id", activacion.atleta_id)
    .maybeSingle<Atleta>();

  if (!atleta) {
    return NextResponse.json({ error: "No se encontró el atleta asociado a este link." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { error: errorUpdate } = await db
    .from("atletas")
    .update({ password_hash: passwordHash })
    .eq("id", atleta.id);
  if (errorUpdate) {
    return NextResponse.json({ error: "No se pudo guardar tu contraseña. Intenta de nuevo." }, { status: 500 });
  }

  await db.from("activaciones").update({ usado_en: new Date().toISOString() }).eq("token", token);

  const sesionToken = await firmarSesion({
    atletaId: atleta.id,
    matchKey: atleta.match_key,
    nombre: atleta.nombre,
  });

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(SESSION_COOKIE, sesionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return respuesta;
}
