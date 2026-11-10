import "server-only";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { matchKey } from "@/lib/match-key";
import type { Atleta } from "@/lib/types";

const PASSWORD_MIN = 6;

export type ResultadoRegistro =
  | { ok: true; atletaId: string; matchKey: string; nombre: string }
  | { ok: false; error: string };

/**
 * Registro autoservicio: cualquiera que entre a /activar puede crear su
 * cuenta escribiendo su nombre (la misma llave — MatchKey — que usa todo
 * el sistema) y una contraseña. No hay token secreto de por medio a
 * propósito: el club es un grupo cerrado que se conoce entre sí, y el
 * costo de verificar identidad con tokens individuales no compensaba
 * frente a lo poco práctico que era mandarlos uno por uno (ver discusión
 * en el historial del proyecto). El único resguardo real: si el nombre ya
 * tiene una contraseña activa, no se puede "robar" pisándola.
 */
export async function registrarAtleta(nombre: string, password: string): Promise<ResultadoRegistro> {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    return { ok: false, error: "Escribe tu nombre." };
  }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` };
  }

  const key = matchKey(nombreLimpio);
  const db = supabaseAdmin();

  // Si ya hay al menos una semana sincronizada, el nombre tiene que coincidir
  // con alguien que de verdad aparece en los datos de Strava — si no, lo más
  // probable es que lo haya escrito distinto a su usuario real (con otro
  // apellido, abreviado, etc.) y su ficha nunca le va a mostrar datos.
  const { data: algunaFicha } = await db.from("fichas_semanales").select("atleta_match_key").limit(1);
  if (algunaFicha && algunaFicha.length > 0) {
    const { data: coincidencia } = await db
      .from("fichas_semanales")
      .select("atleta_match_key")
      .eq("atleta_match_key", key)
      .limit(1);
    if (!coincidencia || coincidencia.length === 0) {
      return {
        ok: false,
        error: `No encontramos "${nombreLimpio}" entre los atletas con datos de Strava. Escribe tu nombre exactamente igual a como aparece en tu cuenta de Strava e inténtalo de nuevo.`,
      };
    }
  }

  const { data: existentes } = await db.from("atletas").select("*").eq("match_key", key).limit(1);
  const atleta = (existentes as Atleta[] | null)?.[0] ?? null;

  const passwordHash = await bcrypt.hash(password, 10);

  if (atleta) {
    if (atleta.password_hash) {
      return {
        ok: false,
        error:
          "Ya existe una cuenta activa con ese nombre. Si eres tú, inicia sesión normalmente. Si no reconoces esto, avísale a quien administra el club.",
      };
    }
    const { error } = await db.from("atletas").update({ password_hash: passwordHash }).eq("id", atleta.id);
    if (error) {
      return { ok: false, error: `No se pudo activar tu cuenta: ${error.message}` };
    }
    return { ok: true, atletaId: atleta.id, matchKey: atleta.match_key, nombre: atleta.nombre };
  }

  const { data: creado, error } = await db
    .from("atletas")
    .insert({ nombre: nombreLimpio, match_key: key, password_hash: passwordHash })
    .select("*")
    .single();
  if (error || !creado) {
    return { ok: false, error: `No se pudo crear tu cuenta: ${error?.message ?? "error desconocido"}` };
  }
  return { ok: true, atletaId: creado.id, matchKey: creado.match_key, nombre: creado.nombre };
}
