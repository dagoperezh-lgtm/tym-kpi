import { NextRequest, NextResponse } from "next/server";
import { sincronizarMaestro } from "@/lib/sincronizar";

// Descargar + parsear el Maestro y subir todo a Supabase puede tardar más
// que el límite por defecto de una función serverless.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const syncPassword = process.env.SYNC_PASSWORD;
  if (!syncPassword) {
    return pagina("error", "El servidor todavía no tiene configurada la variable SYNC_PASSWORD.");
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (password !== syncPassword) {
    return pagina("error", "Contraseña incorrecta.");
  }

  const archivo = form.get("maestro");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return pagina("error", "No se recibió ningún archivo. Elige el Excel Maestro antes de enviar.");
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const resumen = await sincronizarMaestro(buffer);
    return pagina(
      "ok",
      `Listo ✅ Se sincronizó <strong>${escapeHtml(resumen.etiquetaSemana)}</strong>: ${resumen.atletas} atleta(s), ${resumen.rankings} filas de ranking, ${resumen.records} récord(es).`
    );
  } catch (e) {
    return pagina("error", e instanceof Error ? e.message : "Error desconocido.");
  }
}

function escapeHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pagina(tipo: "ok" | "error", mensaje: string): NextResponse {
  const claseColor = tipo === "ok" ? "ok" : "error";
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sincronizar</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; color: #0f172a; background: #f8fafc; }
  h1 { font-size: 18px; }
  .ok { background: #ecfdf5; color: #065f46; border-radius: 10px; padding: 14px; font-size: 14px; margin-bottom: 16px; }
  .error { background: #fef2f2; color: #b91c1c; border-radius: 10px; padding: 14px; font-size: 14px; margin-bottom: 16px; }
  a.boton { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #fff; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
</style>
</head>
<body>
<h1>Sincronizar datos de la semana</h1>
<p class="${claseColor}">${mensaje}</p>
<a class="boton" href="/sincronizar">Volver</a>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
