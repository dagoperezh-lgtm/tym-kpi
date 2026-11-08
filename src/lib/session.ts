import "server-only";
import { SignJWT, jwtVerify } from "jose";

const NOMBRE_COOKIE = "tym_session";
const DURACION_SESION_SEG = 60 * 60 * 24 * 30; // 30 días

export interface SesionAtleta {
  atletaId: string;
  matchKey: string;
  nombre: string;
}

function clavePrivada(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error("Falta SESSION_SECRET (o es muy corto) en las variables de entorno");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(datos: SesionAtleta): Promise<string> {
  return await new SignJWT({ ...datos })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clavePrivada());
}

export async function verificarSesion(token: string): Promise<SesionAtleta | null> {
  try {
    const { payload } = await jwtVerify(token, clavePrivada());
    if (
      typeof payload.atletaId === "string" &&
      typeof payload.matchKey === "string" &&
      typeof payload.nombre === "string"
    ) {
      return { atletaId: payload.atletaId, matchKey: payload.matchKey, nombre: payload.nombre };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = NOMBRE_COOKIE;
export const SESSION_MAX_AGE = DURACION_SESION_SEG;
