import "server-only";
import { google } from "googleapis";

function requireEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

/**
 * Descarga el Excel Maestro desde Google Drive (el mismo archivo que usa
 * club-kpi-platform) y devuelve el contenido en bruto. Esta app solo
 * necesita permiso de LECTURA sobre ese archivo — nunca lo modifica.
 */
export async function descargarMaestro(): Promise<Buffer> {
  const credencialesJson = requireEnv("GOOGLE_SERVICE_ACCOUNT_JSON");
  const fileId = requireEnv("DRIVE_MAESTRO_FILE_ID");

  let credenciales: Record<string, unknown>;
  try {
    credenciales = JSON.parse(credencialesJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: credenciales,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  const drive = google.drive({ version: "v3", auth });
  const respuesta = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(respuesta.data as ArrayBuffer);
}
