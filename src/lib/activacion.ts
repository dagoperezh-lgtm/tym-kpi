/** Fuera de cualquier componente a propósito: evita el lint de "impure function during render". */
export function estaVencida(expiraEnIso: string): boolean {
  return new Date(expiraEnIso).getTime() < Date.now();
}
