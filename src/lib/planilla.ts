import "server-only";
import ExcelJS from "exceljs";
import { matchKey } from "@/lib/match-key";

export interface Hoja {
  nombre: string;
  columnas: string[];
  filas: Record<string, unknown>[];
}

export type LibroHojas = Map<string, Hoja>;

function valorCelda(valor: ExcelJS.CellValue): unknown {
  if (valor == null) return null;
  if (typeof valor === "object") {
    if ("result" in valor) return (valor as { result: unknown }).result; // celda con fórmula
    if ("richText" in valor) {
      return (valor as { richText: { text: string }[] }).richText.map((p) => p.text).join("");
    }
    if (valor instanceof Date) return valor;
  }
  return valor;
}

/** Lee todo el libro y devuelve cada hoja como filas-objeto indexadas por el nombre de columna (fila 1 = encabezado). */
export async function leerLibro(buffer: Buffer): Promise<LibroHojas> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const hojas: LibroHojas = new Map();
  for (const ws of workbook.worksheets) {
    const headerRow = ws.getRow(1);
    const columnas: string[] = [];
    const headerPorIndice = new Map<number, string>();
    const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
    headerValues.forEach((valor, indice) => {
      if (indice === 0) return;
      const texto = valorCelda(valor);
      if (typeof texto === "string" && texto.trim()) {
        headerPorIndice.set(indice, texto.trim());
        columnas.push(texto.trim());
      }
    });

    const filas: Record<string, unknown>[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      if (!row.hasValues) continue;
      const fila: Record<string, unknown> = {};
      const rowValues = Array.isArray(row.values) ? row.values : [];
      for (const [indice, nombreCol] of headerPorIndice) {
        fila[nombreCol] = valorCelda(rowValues[indice]);
      }
      filas.push(fila);
    }

    hojas.set(ws.name, { nombre: ws.name, columnas, filas });
  }
  return hojas;
}

export function buscarHoja(hojas: LibroHojas, ...nombresPosibles: string[]): Hoja | null {
  const objetivo = new Set(nombresPosibles.map((n) => matchKey(n)));
  for (const hoja of hojas.values()) {
    if (objetivo.has(matchKey(hoja.nombre))) return hoja;
  }
  return null;
}

export function columnaIdentidad(hoja: Hoja): string {
  if (hoja.columnas.includes("Nombre")) return "Nombre";
  if (hoja.columnas.includes("Deportista")) return "Deportista";
  return hoja.columnas[0];
}

export function columnasSemana(hoja: Hoja): string[] {
  return hoja.columnas.filter((c) => c.trim().toUpperCase().startsWith("SEM"));
}

const RE_SEMANA = /^SEM\s*0*(\d+)$/;

export function numeroSemana(etiqueta: string): number | null {
  const match = RE_SEMANA.exec(etiqueta.trim().toUpperCase());
  return match ? Number(match[1]) : null;
}

export function etiquetaSemanaMasReciente(hojas: LibroHojas): string | null {
  let mejorNum: number | null = null;
  let mejorEtiqueta: string | null = null;
  for (const hoja of hojas.values()) {
    for (const col of columnasSemana(hoja)) {
      const num = numeroSemana(col);
      if (num !== null && (mejorNum === null || num > mejorNum)) {
        mejorNum = num;
        mejorEtiqueta = col;
      }
    }
  }
  return mejorEtiqueta;
}

const BASURA_TIEMPO = new Set(["--:--", "", "0", "00:00", "00:00:00", "nan", "none", "nc"]);

/** Equivalente reducido de to_mins()/hhmm_a_minutos: suficiente para leer de vuelta lo que club-kpi-platform ya escribió. */
export function hhmmAMinutos(valor: unknown): number {
  if (valor == null) return 0;
  if (typeof valor === "number") return Math.round(valor);
  const texto = String(valor).trim().toLowerCase();
  if (BASURA_TIEMPO.has(texto)) return 0;
  const match = /^(\d+):(\d{2})(?::\d{2})?$/.exec(texto);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const numero = Number(texto);
  return Number.isFinite(numero) ? Math.round(numero) : 0;
}

export function numeroOCero(valor: unknown): number {
  if (valor == null) return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function textoOVacio(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).trim();
}
