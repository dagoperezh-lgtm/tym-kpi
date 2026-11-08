import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verificarSesion, type SesionAtleta } from "@/lib/session";

/** Lee y valida la sesión actual desde la cookie. Null si no hay sesión válida. */
export async function obtenerSesion(): Promise<SesionAtleta | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verificarSesion(token);
}
