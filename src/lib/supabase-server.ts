import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase SOLO para uso en el servidor (Route Handlers, Server
 * Components, Server Actions). Usa la service role key, que salta cualquier
 * política de seguridad a nivel de fila — por eso este archivo importa
 * "server-only": si algún componente de cliente intentara importarlo, el
 * build falla en vez de filtrar la key al navegador.
 *
 * El control de acceso ("un atleta solo ve su propia ficha") se hace en el
 * código de cada Route Handler / Server Component, no en la base de datos.
 */
function requireEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export function supabaseAdmin() {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
