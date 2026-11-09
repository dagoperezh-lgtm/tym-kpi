export type Categoria =
  | "completos"
  | "tpi_global"
  | "tiempo_total"
  | "natacion_tiempo"
  | "natacion_distancia"
  | "ciclismo_tiempo"
  | "ciclismo_distancia"
  | "ciclismo_salida_larga"
  | "ciclismo_vel_prom"
  | "ciclismo_vel_max"
  | "ciclismo_desnivel"
  | "trote_tiempo"
  | "trote_distancia"
  | "trote_salida_larga"
  | "trote_vel_prom"
  | "trote_vel_max"
  | "trote_desnivel";

export interface Atleta {
  id: string;
  nombre: string;
  match_key: string;
  password_hash: string | null;
  activo: boolean;
  creado_en: string;
}

export interface SemanaClub {
  etiqueta_semana: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  atletas_activos: number | null;
  horas_totales_equipo: number | null;
  tpi_promedio_equipo: number | null;
  promedio_natacion_mins: number | null;
  promedio_ciclismo_mins: number | null;
  promedio_trote_mins: number | null;
  actualizado_en: string;
}

export interface RankingFila {
  id: number;
  etiqueta_semana: string;
  categoria: Categoria;
  posicion: number;
  atleta_match_key: string;
  atleta_nombre: string;
  valor_mostrado: string;
  valor_numerico: number | null;
}

export interface RecordClub {
  metrica: string;
  categoria: Categoria;
  valor_mostrado: string | null;
  valor_numerico: number | null;
  atleta_nombre: string | null;
  fecha: string | null;
  semana_record: string | null;
  actualizado_en: string;
}

export interface FichaSemanal {
  id: number;
  etiqueta_semana: string;
  atleta_match_key: string;
  atleta_nombre: string;
  es_completo: boolean;
  racha_completo: number;
  tpi_global: number | null;
  tpi_natacion: number | null;
  tpi_ciclismo: number | null;
  tpi_trote: number | null;
  minutos_total: number | null;
  minutos_natacion: number | null;
  minutos_ciclismo: number | null;
  minutos_trote: number | null;
  km_natacion: number | null;
  km_ciclismo: number | null;
  km_trote: number | null;
  salida_mas_larga_ciclismo_km: number | null;
  salida_mas_larga_trote_km: number | null;
  vel_prom_ciclismo_kmh: number | null;
  vel_max_ciclismo_kmh: number | null;
  vel_prom_trote_kmh: number | null;
  vel_max_trote_kmh: number | null;
  desnivel_ciclismo_m: number | null;
  desnivel_trote_m: number | null;
  pulso_promedio: number | null;
  pulso_maximo: number | null;
  potencia_promedio: number | null;
  potencia_maxima: number | null;
}

export const CATEGORIAS_ORDEN: { categoria: Categoria; titulo: string; unidad: string }[] = [
  { categoria: "tpi_global", titulo: "Adherencia al Plan (TPI Global)", unidad: "TPI" },
  { categoria: "tiempo_total", titulo: "Tiempo Total", unidad: "Tiempo" },
  { categoria: "natacion_tiempo", titulo: "Natación — Tiempo Acumulado", unidad: "Tiempo" },
  { categoria: "natacion_distancia", titulo: "Natación — Distancia Acumulada", unidad: "Distancia" },
  { categoria: "ciclismo_tiempo", titulo: "Ciclismo — Tiempo Acumulado", unidad: "Tiempo" },
  { categoria: "ciclismo_distancia", titulo: "Ciclismo — Distancia Acumulada", unidad: "Distancia" },
  { categoria: "ciclismo_salida_larga", titulo: "Ciclismo — Salida Más Larga", unidad: "Distancia" },
  { categoria: "ciclismo_vel_prom", titulo: "Ciclismo — Velocidad Promedio", unidad: "Vel. Prom." },
  { categoria: "ciclismo_vel_max", titulo: "Ciclismo — Velocidad Máxima", unidad: "Vel. Máx." },
  { categoria: "ciclismo_desnivel", titulo: "Ciclismo — Desnivel Acumulado", unidad: "Desnivel" },
  { categoria: "trote_tiempo", titulo: "Trote — Tiempo Acumulado", unidad: "Tiempo" },
  { categoria: "trote_distancia", titulo: "Trote — Distancia Acumulada", unidad: "Distancia" },
  { categoria: "trote_salida_larga", titulo: "Trote — Salida Más Larga", unidad: "Distancia" },
  { categoria: "trote_vel_prom", titulo: "Trote — Velocidad Promedio", unidad: "Vel. Prom." },
  { categoria: "trote_vel_max", titulo: "Trote — Velocidad Máxima", unidad: "Vel. Máx." },
  { categoria: "trote_desnivel", titulo: "Trote — Desnivel Acumulado", unidad: "Desnivel" },
];
