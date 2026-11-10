import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { matchKey } from "@/lib/match-key";
import {
  buscarHoja,
  columnaIdentidad,
  columnasSemana,
  etiquetaSemanaMasReciente,
  hhmmAMinutos,
  leerLibro,
  numeroOCero,
  numeroSemana,
  textoOVacio,
  type Hoja,
  type LibroHojas,
} from "@/lib/planilla";
import type { Categoria } from "@/lib/types";

/**
 * Versión TypeScript de sync/sync_maestro_a_supabase.py — ver ese archivo
 * (o el historial del proyecto) para el diseño original. Se portó para que
 * la sincronización se pueda disparar desde la propia app web (/sincronizar)
 * sin depender de una terminal.
 *
 * Limitaciones conocidas (datos que el Maestro no guarda históricamente):
 *   - Pulso y potencia: solo existen en el reporte Word de la semana en que
 *     se generaron, nunca se escriben en una hoja del Maestro.
 *   - TPI por disciplina (Natación/Ciclismo/Trote): el Maestro solo guarda
 *     el histórico del TPI Global, no el desglose por disciplina.
 */

const METRICAS_NUMERICAS: [string, string, Categoria][] = [
  ["Distancia_Natación", "km_natacion", "natacion_distancia"],
  ["Distancia_Ciclismo", "km_ciclismo", "ciclismo_distancia"],
  ["Distancia_Trote", "km_trote", "trote_distancia"],
  ["Salida_Mas_Larga_Ciclismo", "salida_mas_larga_ciclismo_km", "ciclismo_salida_larga"],
  ["Salida_Mas_Larga_Trote", "salida_mas_larga_trote_km", "trote_salida_larga"],
  ["Velocidad_Prom_Ciclismo", "vel_prom_ciclismo_kmh", "ciclismo_vel_prom"],
  ["Velocidad_Prom_Trote", "vel_prom_trote_kmh", "trote_vel_prom"],
  ["Velocidad_Max_Ciclismo", "vel_max_ciclismo_kmh", "ciclismo_vel_max"],
  ["Velocidad_Max_Trote", "vel_max_trote_kmh", "trote_vel_max"],
  ["Desnivel_Ciclismo", "desnivel_ciclismo_m", "ciclismo_desnivel"],
  ["Desnivel_Trote", "desnivel_trote_m", "trote_desnivel"],
];

const CATEGORIA_POR_METRICA_RECORD: Record<string, Categoria> = {
  "TPI Global": "tpi_global",
  "Tiempo Total": "tiempo_total",
  "Tiempo Natación": "natacion_tiempo",
  "Tiempo Ciclismo": "ciclismo_tiempo",
  "Tiempo Trote": "trote_tiempo",
  "Distancia Natación": "natacion_distancia",
  "Distancia Ciclismo": "ciclismo_distancia",
  "Distancia Trote": "trote_distancia",
  "Salida Más Larga Ciclismo": "ciclismo_salida_larga",
  "Salida Más Larga Trote": "trote_salida_larga",
  "Velocidad Promedio Ciclismo": "ciclismo_vel_prom",
  "Velocidad Promedio Trote": "trote_vel_prom",
  "Velocidad Máxima Ciclismo": "ciclismo_vel_max",
  "Velocidad Máxima Trote": "trote_vel_max",
  "Desnivel Ciclismo": "ciclismo_desnivel",
  "Desnivel Trote": "trote_desnivel",
};

interface DatosAtleta {
  atleta_match_key: string;
  atleta_nombre: string;
  minutos_total: number;
  minutos_natacion: number;
  minutos_ciclismo: number;
  minutos_trote: number;
  tpi_global: number | null;
  tpi_natacion: null;
  tpi_ciclismo: null;
  tpi_trote: null;
  es_completo: boolean;
  racha_completo: number;
  pulso_promedio: null;
  pulso_maximo: null;
  potencia_promedio: null;
  potencia_maxima: null;
  [campoMetricaNumerica: string]: unknown;
}

function valorSemana<T>(
  hoja: Hoja | null,
  etiqueta: string,
  matchKeyAtleta: string,
  parser: (v: unknown) => T
): T | null {
  if (hoja === null || !hoja.columnas.includes(etiqueta)) return null;
  const colId = columnaIdentidad(hoja);
  const fila = hoja.filas.find((f) => matchKey(String(f[colId] ?? "")) === matchKeyAtleta);
  if (!fila) return null;
  return parser(fila[etiqueta]);
}

function calcularRacha(
  hojaNat: Hoja | null,
  hojaBici: Hoja | null,
  hojaTrote: Hoja | null,
  etiqueta: string,
  matchKeyAtleta: string
): number {
  const semanaObjetivo = numeroSemana(etiqueta);
  if (semanaObjetivo === null) return 0;

  const numerosDisponibles = new Set<number>();
  for (const hoja of [hojaNat, hojaBici, hojaTrote]) {
    if (!hoja) continue;
    for (const col of columnasSemana(hoja)) {
      const n = numeroSemana(col);
      if (n !== null) numerosDisponibles.add(n);
    }
  }

  let racha = 0;
  let semanaActual = semanaObjetivo;
  while (numerosDisponibles.has(semanaActual)) {
    let colReal: string | null = null;
    for (const hoja of [hojaNat, hojaBici, hojaTrote]) {
      if (!hoja) continue;
      const encontrada = columnasSemana(hoja).find((c) => numeroSemana(c) === semanaActual);
      if (encontrada) {
        colReal = encontrada;
        break;
      }
    }
    if (!colReal) break;

    const n = valorSemana(hojaNat, colReal, matchKeyAtleta, hhmmAMinutos) ?? 0;
    const b = valorSemana(hojaBici, colReal, matchKeyAtleta, hhmmAMinutos) ?? 0;
    const t = valorSemana(hojaTrote, colReal, matchKeyAtleta, hhmmAMinutos) ?? 0;
    if (n > 0 && b > 0 && t > 0) {
      racha += 1;
      semanaActual -= 1;
    } else {
      break;
    }
  }
  return racha;
}

function formatoHHMM(mins: number): string {
  const total = Math.round(mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function formatoKm(v: number): string {
  return `${v.toFixed(1)} km`.replace(".", ",");
}
function formatoKmh(v: number): string {
  return `${v.toFixed(1)} km/h`.replace(".", ",");
}
function formatoM(v: number): string {
  return `${Math.round(v)} m`;
}
function formatoPorcentaje(v: number): string {
  return `${v.toFixed(1)}%`;
}

const FORMATEADORES_NUMERICOS: Record<string, (v: number) => string> = {
  natacion_distancia: formatoKm,
  ciclismo_distancia: formatoKm,
  trote_distancia: formatoKm,
  ciclismo_salida_larga: formatoKm,
  trote_salida_larga: formatoKm,
  ciclismo_vel_prom: formatoKmh,
  trote_vel_prom: formatoKmh,
  ciclismo_vel_max: formatoKmh,
  trote_vel_max: formatoKmh,
  ciclismo_desnivel: formatoM,
  trote_desnivel: formatoM,
};

export interface ResumenSincronizacion {
  etiquetaSemana: string;
  atletas: number;
  rankings: number;
  records: number;
}

interface FilaRanking {
  etiqueta_semana: string;
  categoria: Categoria;
  posicion: number;
  atleta_match_key: string;
  atleta_nombre: string;
  valor_mostrado: string;
  valor_numerico: number;
}

interface FilaRecord {
  metrica: string;
  categoria: Categoria;
  valor_mostrado: string | null;
  valor_numerico: number;
  atleta_nombre: string | null;
  fecha: string | null;
  semana_record: string | null;
}

export interface ResultadoCalculo {
  etiqueta: string;
  semanaClub: {
    etiqueta_semana: string;
    atletas_activos: number;
    horas_totales_equipo: number;
    tpi_promedio_equipo: number | null;
    promedio_natacion_mins: number | null;
    promedio_ciclismo_mins: number | null;
    promedio_trote_mins: number | null;
  };
  rankings: FilaRanking[];
  records: FilaRecord[];
  fichas: (DatosAtleta & { etiqueta_semana: string })[];
}

/** Parte pura: a partir de las hojas ya leídas, calcula todo lo que hay que
 * subir a Supabase. No toca la red — se puede probar con datos sintéticos. */
export function calcularSincronizacion(hojas: LibroHojas): ResultadoCalculo {
  const etiquetaEncontrada = etiquetaSemanaMasReciente(hojas);
  if (etiquetaEncontrada === null) {
    throw new Error("No se encontró ninguna columna 'Sem NN' en el Maestro. Nada que sincronizar.");
  }
  const etiqueta: string = etiquetaEncontrada;

  const hojaTotal = buscarHoja(hojas, "TIEMPO TOTAL");
  const hojaNat = buscarHoja(hojas, "NATACION", "NATACIÓN");
  const hojaBici = buscarHoja(hojas, "BICICLETA", "CICLISMO");
  const hojaTrote = buscarHoja(hojas, "TROTE", "RUNNING");
  const hojaTpi = buscarHoja(hojas, "HISTORICO_TPI", "HISTÓRICO_TPI", "HISTORICOTPI");
  const hojaRecords = buscarHoja(hojas, "RECORDS_CLUB");

  if (!hojaTotal) {
    throw new Error("No se encontró la hoja 'TIEMPO TOTAL' en el Maestro. Abortando.");
  }

  const colId = columnaIdentidad(hojaTotal);
  const atletas: DatosAtleta[] = [];

  for (const fila of hojaTotal.filas) {
    const nombre = textoOVacio(fila[colId]);
    const key = matchKey(nombre);
    if (!key) continue;

    const minutosTotal = hhmmAMinutos(fila[etiqueta]);
    const minutosNat = valorSemana(hojaNat, etiqueta, key, hhmmAMinutos) ?? 0;
    const minutosBici = valorSemana(hojaBici, etiqueta, key, hhmmAMinutos) ?? 0;
    const minutosTrote = valorSemana(hojaTrote, etiqueta, key, hhmmAMinutos) ?? 0;
    const tpiFraccion = valorSemana(hojaTpi, etiqueta, key, numeroOCero);
    const tpiGlobal = tpiFraccion !== null ? Math.round(tpiFraccion * 100 * 10) / 10 : null;

    const atleta: DatosAtleta = {
      atleta_match_key: key,
      atleta_nombre: nombre,
      minutos_total: minutosTotal,
      minutos_natacion: minutosNat,
      minutos_ciclismo: minutosBici,
      minutos_trote: minutosTrote,
      tpi_global: tpiGlobal,
      tpi_natacion: null,
      tpi_ciclismo: null,
      tpi_trote: null,
      es_completo: minutosNat > 0 && minutosBici > 0 && minutosTrote > 0,
      racha_completo: calcularRacha(hojaNat, hojaBici, hojaTrote, etiqueta, key),
      pulso_promedio: null,
      pulso_maximo: null,
      potencia_promedio: null,
      potencia_maxima: null,
    };

    for (const [nombreHoja, campoFicha] of METRICAS_NUMERICAS) {
      const hojaMetrica = buscarHoja(hojas, nombreHoja);
      atleta[campoFicha] = valorSemana(hojaMetrica, etiqueta, key, numeroOCero) ?? 0;
    }

    atletas.push(atleta);
  }

  if (atletas.length === 0) {
    throw new Error("No se encontró ningún atleta con datos esta semana. Nada que sincronizar.");
  }

  // -----------------------------------------------------------------------
  // Datos generales del equipo (sobre los atletas activos esta semana)
  // -----------------------------------------------------------------------
  const activos = atletas.filter((a) => a.minutos_total > 0);
  const atletasActivos = activos.length;
  const horasTotalesEquipo = Math.round((atletas.reduce((s, a) => s + a.minutos_total, 0) / 60) * 10) / 10;
  const tpiPromedioEquipo =
    activos.length > 0
      ? Math.round(
          (activos.reduce((s, a) => s + (a.tpi_global ?? 0), 0) / activos.filter((a) => a.tpi_global !== null).length) * 10
        ) / 10
      : null;
  const promedioNatacion =
    activos.length > 0 ? Math.round((activos.reduce((s, a) => s + a.minutos_natacion, 0) / activos.length) * 10) / 10 : null;
  const promedioCiclismo =
    activos.length > 0 ? Math.round((activos.reduce((s, a) => s + a.minutos_ciclismo, 0) / activos.length) * 10) / 10 : null;
  const promedioTrote =
    activos.length > 0 ? Math.round((activos.reduce((s, a) => s + a.minutos_trote, 0) / activos.length) * 10) / 10 : null;

  // -----------------------------------------------------------------------
  // Rankings (Top 10, salvo 'completos' que no tiene tope)
  // -----------------------------------------------------------------------
  const rankings: FilaRanking[] = [];

  function agregarRanking(
    categoria: Categoria,
    valores: { atleta_match_key: string; atleta_nombre: string; valor_numerico: number | null }[],
    formateador: (v: number) => string,
    tope: number | null = 10
  ) {
    let ordenado = valores
      .filter((v): v is { atleta_match_key: string; atleta_nombre: string; valor_numerico: number } => !!v.valor_numerico && v.valor_numerico > 0)
      .sort((a, b) => b.valor_numerico - a.valor_numerico);
    if (tope) ordenado = ordenado.slice(0, tope);
    ordenado.forEach((v, indice) => {
      rankings.push({
        etiqueta_semana: etiqueta,
        categoria,
        posicion: indice + 1,
        atleta_match_key: v.atleta_match_key,
        atleta_nombre: v.atleta_nombre,
        valor_mostrado: formateador(v.valor_numerico),
        valor_numerico: v.valor_numerico,
      });
    });
  }

  agregarRanking(
    "completos",
    atletas.filter((a) => a.es_completo).map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.minutos_total })),
    formatoHHMM,
    null
  );
  agregarRanking("tpi_global", atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.tpi_global })), formatoPorcentaje);
  agregarRanking("tiempo_total", atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.minutos_total })), formatoHHMM);
  agregarRanking("natacion_tiempo", atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.minutos_natacion })), formatoHHMM);
  agregarRanking("ciclismo_tiempo", atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.minutos_ciclismo })), formatoHHMM);
  agregarRanking("trote_tiempo", atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a.minutos_trote })), formatoHHMM);

  for (const [, campoFicha, categoria] of METRICAS_NUMERICAS) {
    agregarRanking(
      categoria,
      atletas.map((a) => ({ atleta_match_key: a.atleta_match_key, atleta_nombre: a.atleta_nombre, valor_numerico: a[campoFicha] as number })),
      FORMATEADORES_NUMERICOS[categoria]
    );
  }

  // -----------------------------------------------------------------------
  // Récords del club
  // -----------------------------------------------------------------------
  const records: FilaRecord[] = [];
  if (hojaRecords) {
    for (const fila of hojaRecords.filas) {
      const metrica = textoOVacio(fila["Métrica"]);
      const categoria = CATEGORIA_POR_METRICA_RECORD[metrica];
      if (!categoria) continue;
      records.push({
        metrica,
        categoria,
        valor_mostrado: fila["Récord"] != null ? String(fila["Récord"]) : null,
        valor_numerico: numeroOCero(fila["Valor_Numerico"]),
        atleta_nombre: fila["Deportista"] != null ? String(fila["Deportista"]) : null,
        fecha: fila["Fecha"] != null ? String(fila["Fecha"]) : null,
        semana_record: fila["Semana_Record"] != null ? String(fila["Semana_Record"]) : null,
      });
    }
  }

  const fichas = atletas.map((a) => ({ ...a, etiqueta_semana: etiqueta }));

  return {
    etiqueta,
    semanaClub: {
      etiqueta_semana: etiqueta,
      atletas_activos: atletasActivos,
      horas_totales_equipo: horasTotalesEquipo,
      tpi_promedio_equipo: tpiPromedioEquipo,
      promedio_natacion_mins: promedioNatacion,
      promedio_ciclismo_mins: promedioCiclismo,
      promedio_trote_mins: promedioTrote,
    },
    rankings,
    records,
    fichas,
  };
}

/** Descarga el Maestro desde Drive, calcula todo y sube el resultado a Supabase. */
/** `buffer` es el contenido del Excel Maestro que el administrador sube a mano en /sincronizar. */
export async function sincronizarMaestro(buffer: Buffer): Promise<ResumenSincronizacion> {
  const hojas = await leerLibro(buffer);
  const resultado = calcularSincronizacion(hojas);
  const { etiqueta, semanaClub, rankings, records, fichas } = resultado;

  const db = supabaseAdmin();

  const { error: errorSemana } = await db.from("semanas_club").upsert(semanaClub);
  if (errorSemana) throw new Error(`No se pudo subir los datos generales: ${errorSemana.message}`);

  const { error: errorBorrarRankings } = await db.from("rankings").delete().eq("etiqueta_semana", etiqueta);
  if (errorBorrarRankings) throw new Error(`No se pudo limpiar el ranking anterior: ${errorBorrarRankings.message}`);

  if (rankings.length > 0) {
    const { error: errorRankings } = await db.from("rankings").insert(rankings);
    if (errorRankings) throw new Error(`No se pudo subir el ranking: ${errorRankings.message}`);
  }

  if (records.length > 0) {
    const { error: errorRecords } = await db.from("records_club").upsert(records);
    if (errorRecords) throw new Error(`No se pudo subir los récords: ${errorRecords.message}`);
  }

  const { error: errorFichas } = await db
    .from("fichas_semanales")
    .upsert(fichas, { onConflict: "etiqueta_semana,atleta_match_key" });
  if (errorFichas) throw new Error(`No se pudo subir las fichas personales: ${errorFichas.message}`);

  return { etiquetaSemana: etiqueta, atletas: fichas.length, rankings: rankings.length, records: records.length };
}
