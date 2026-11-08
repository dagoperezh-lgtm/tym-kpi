/**
 * Normaliza un nombre al mismo "MatchKey" que usa club-kpi-platform
 * (clean_string en app.py): mayúsculas, sin tildes, espacios colapsados.
 * Es la llave con la que se identifica a cada atleta en todo el sistema
 * (Excel Maestro, bóveda de tokens de Strava, y ahora esta web).
 */
export function matchKey(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes/diacríticos
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}
