import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Categoria, FichaSemanal, RankingFila, RecordClub, SemanaClub } from "@/lib/types";

/**
 * "Semana actual" = la última fila sincronizada (por actualizado_en, no por
 * parsear el texto de la etiqueta — "Sem 9" vs "Sem 10" no ordena bien como
 * texto). El sync script siempre hace upsert de la semana que acaba de
 * procesar, así que la más recientemente tocada es la vigente.
 */
export async function obtenerSemanaActual(): Promise<SemanaClub | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("semanas_club")
    .select("*")
    .order("actualizado_en", { ascending: false })
    .limit(1)
    .maybeSingle<SemanaClub>();
  return data ?? null;
}

export async function obtenerRankings(etiquetaSemana: string): Promise<Record<string, RankingFila[]>> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("rankings")
    .select("*")
    .eq("etiqueta_semana", etiquetaSemana)
    .order("categoria", { ascending: true })
    .order("posicion", { ascending: true });

  const agrupado: Record<string, RankingFila[]> = {};
  for (const fila of (data as RankingFila[] | null) ?? []) {
    (agrupado[fila.categoria] ??= []).push(fila);
  }
  return agrupado;
}

export async function obtenerRankingCompletos(etiquetaSemana: string): Promise<RankingFila[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("rankings")
    .select("*")
    .eq("etiqueta_semana", etiquetaSemana)
    .eq("categoria", "completos" satisfies Categoria)
    .order("posicion", { ascending: true });
  return (data as RankingFila[] | null) ?? [];
}

export async function obtenerRecords(): Promise<RecordClub[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("records_club").select("*").order("metrica", { ascending: true });
  return (data as RecordClub[] | null) ?? [];
}

export async function obtenerFicha(etiquetaSemana: string, matchKey: string): Promise<FichaSemanal | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("fichas_semanales")
    .select("*")
    .eq("etiqueta_semana", etiquetaSemana)
    .eq("atleta_match_key", matchKey)
    .maybeSingle<FichaSemanal>();
  return data ?? null;
}
