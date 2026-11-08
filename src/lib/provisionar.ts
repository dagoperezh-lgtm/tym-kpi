import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { matchKey } from "@/lib/match-key";
import type { Activacion, Atleta } from "@/lib/types";

const DIAS_VALIDEZ_TOKEN = 14;

export interface ResultadoProvision {
  nombre: string;
  yaActivado: boolean;
  link: string | null;
  mensaje: string;
}

/**
 * Misma lógica que admin/provisionar_atletas.py, pero corriendo del lado
 * del servidor de esta misma app web (Next.js), para no depender de que
 * alguien tenga que abrir una terminal. Crea al atleta si no existe, y
 * reusa su link de activación vigente en vez de generar uno nuevo cada vez.
 */
export async function provisionarAtleta(nombre: string, baseUrl: string): Promise<ResultadoProvision> {
  const db = supabaseAdmin();
  const key = matchKey(nombre);

  const { data: existentes } = await db.from("atletas").select("*").eq("match_key", key).limit(1);
  let atleta = (existentes as Atleta[] | null)?.[0] ?? null;

  if (!atleta) {
    const { data: creado, error } = await db
      .from("atletas")
      .insert({ nombre, match_key: key })
      .select("*")
      .single();
    if (error || !creado) {
      return { nombre, yaActivado: false, link: null, mensaje: `Error creando la cuenta: ${error?.message ?? "desconocido"}` };
    }
    atleta = creado as Atleta;
  }

  if (atleta.password_hash) {
    return { nombre, yaActivado: true, link: null, mensaje: "Ya activó su cuenta — no se genera link." };
  }

  const { data: vigentes } = await db
    .from("activaciones")
    .select("*")
    .eq("atleta_id", atleta.id)
    .is("usado_en", null)
    .order("creado_en", { ascending: false })
    .limit(1);

  const pendiente = (vigentes as Activacion[] | null)?.[0];
  if (pendiente && new Date(pendiente.expira_en).getTime() > Date.now()) {
    return {
      nombre,
      yaActivado: false,
      link: `${baseUrl}/activar/${pendiente.token}`,
      mensaje: "Reusando link vigente.",
    };
  }

  const expiraEn = new Date(Date.now() + DIAS_VALIDEZ_TOKEN * 24 * 60 * 60 * 1000).toISOString();
  const { data: nueva, error: errorActivacion } = await db
    .from("activaciones")
    .insert({ atleta_id: atleta.id, expira_en: expiraEn })
    .select("*")
    .single();

  if (errorActivacion || !nueva) {
    return { nombre, yaActivado: false, link: null, mensaje: `Error generando el link: ${errorActivacion?.message ?? "desconocido"}` };
  }

  return {
    nombre,
    yaActivado: false,
    link: `${baseUrl}/activar/${(nueva as Activacion).token}`,
    mensaje: `Link nuevo (vence en ${DIAS_VALIDEZ_TOKEN} días).`,
  };
}
