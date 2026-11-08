/** Minutos -> "HH:MM", igual que to_hhmm_display() en club-kpi-platform. */
export function formatoHHMM(mins: number | null | undefined): string {
  const total = Math.round(mins ?? 0);
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/** Decimal con coma en vez de punto, estilo chileno (igual que el resto del sistema). */
function comaDecimal(valor: number, decimales: number): string {
  return valor.toFixed(decimales).replace(".", ",");
}

export function formatoKm(valor: number | null | undefined): string {
  return `${comaDecimal(valor ?? 0, 1)} km`;
}

export function formatoKmh(valor: number | null | undefined): string {
  return `${comaDecimal(valor ?? 0, 1)} km/h`;
}

export function formatoM(valor: number | null | undefined): string {
  return `${Math.round(valor ?? 0)} m`;
}

/**
 * "—" cuando no hay dato (distinto de 0%): el Maestro de club-kpi-platform
 * no guarda el TPI por disciplina, así que esos campos siempre llegan null
 * por ahora — mostrar "0.0%" ahí sería mentir (ver README de este repo).
 */
export function formatoPorcentaje(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return `${valor.toFixed(1)}%`;
}

/** Diferencia con signo contra un promedio, ej. "+00:12" / "-00:05". */
export function diferenciaConSigno(valor: number, promedio: number, formateador: (v: number) => string): string {
  const diff = valor - promedio;
  const signo = diff >= 0 ? "+" : "−";
  return `${signo}${formateador(Math.abs(diff))}`;
}
