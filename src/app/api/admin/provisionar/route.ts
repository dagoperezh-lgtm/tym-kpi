import { NextRequest, NextResponse } from "next/server";
import { provisionarAtleta, type ResultadoProvision } from "@/lib/provisionar";

/**
 * Formulario clásico (sin fetch/JavaScript de por medio): el navegador hace
 * una petición normal al enviar el <form>, y esta ruta devuelve la página
 * de resultado ya armada. Así evitamos cualquier problema de JS del
 * navegador (extensiones, bloqueadores, etc.) que pueda impedir que un
 * fetch() se vea reflejado en la pantalla.
 */
export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return paginaError("El servidor todavía no tiene configurada la variable ADMIN_PASSWORD.");
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const nombresTexto = String(form.get("nombres") ?? "");

  if (password !== adminPassword) {
    return paginaError("Contraseña de administrador incorrecta.");
  }

  const nombres = nombresTexto
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n && !n.startsWith("#"));

  if (nombres.length === 0) {
    return paginaError("No pusiste ningún nombre.");
  }

  const baseUrl = request.nextUrl.origin;
  const resultados: ResultadoProvision[] = [];
  for (const nombre of nombres) {
    resultados.push(await provisionarAtleta(nombre, baseUrl));
  }

  return paginaResultados(resultados);
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(contenido: string): NextResponse {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Crear cuentas de atletas</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; color: #0f172a; background: #f8fafc; }
  h1 { font-size: 18px; }
  p.ayuda { color: #64748b; font-size: 14px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .error { background: #fef2f2; color: #b91c1c; border-radius: 10px; padding: 10px 14px; font-size: 14px; margin-bottom: 16px; }
  .nota { color: #94a3b8; font-size: 12px; margin-bottom: 16px; }
  textarea.mensaje { width: 100%; box-sizing: border-box; font-size: 13px; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; resize: vertical; }
  .nombre { font-weight: 600; margin: 0 0 8px; }
  a.boton, button.boton { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #fff; padding: 12px; border: none; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 8px; cursor: pointer; }
  label { display: block; font-size: 14px; margin-bottom: 4px; }
  input, textarea#nombres { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 15px; margin-bottom: 16px; font-family: inherit; }
</style>
</head>
<body>
${contenido}
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function paginaError(mensaje: string): NextResponse {
  return layout(`
<h1>Crear cuentas de atletas</h1>
<p class="error">${escapeHtml(mensaje)}</p>
<a class="boton" href="/admin">Volver a intentar</a>
`);
}

function paginaResultados(resultados: ResultadoProvision[]): NextResponse {
  const conLink = resultados.filter((r) => r.link);
  const yaActivados = resultados.filter((r) => r.yaActivado);
  const conError = resultados.filter((r) => !r.link && !r.yaActivado);

  const tarjetas = conLink
    .map((r) => {
      const mensaje = `Hola ${r.nombre.split(" ")[0]}! Ya puedes ver tus resultados y los del equipo en el celular. Activa tu cuenta acá (es un link de un solo uso): ${r.link}`;
      return `
<div class="card">
  <p class="nombre">${escapeHtml(r.nombre)}</p>
  <textarea class="mensaje" rows="4" readonly onclick="this.select()">${escapeHtml(mensaje)}</textarea>
  <p class="nota">Toca el texto para seleccionarlo todo, y cópialo con el botón de copiar de tu celular (o Ctrl+C / Cmd+C).</p>
</div>`;
    })
    .join("\n");

  const notaActivados =
    yaActivados.length > 0
      ? `<p class="nota">${yaActivados.length === 1 ? "1 atleta ya" : `${yaActivados.length} atletas ya`} tenía cuenta activada — no se le generó link: ${escapeHtml(yaActivados.map((r) => r.nombre).join(", "))}.</p>`
      : "";

  const errores = conError
    .map(
      (r) => `<p class="error"><strong>${escapeHtml(r.nombre)}</strong>: ${escapeHtml(r.mensaje)}</p>`
    )
    .join("\n");

  const sinNovedades =
    conLink.length === 0 && conError.length === 0 && resultados.length > 0
      ? `<p class="ayuda">Todos los atletas de la lista ya tenían su cuenta activada.</p>`
      : "";

  return layout(`
<h1>Resultado</h1>
${notaActivados}
${errores}
${tarjetas}
${sinNovedades}
<a class="boton" href="/admin">Crear más cuentas</a>
`);
}
