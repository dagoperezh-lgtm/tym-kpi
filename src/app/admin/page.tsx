"use client";

import { useState } from "react";

interface Resultado {
  nombre: string;
  yaActivado: boolean;
  link: string | null;
  mensaje: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [nombres, setNombres] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultados(null);
    setCargando(true);
    try {
      const res = await fetch("/api/admin/provisionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, nombres }),
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? "Algo salió mal.");
        return;
      }
      setResultados(datos.resultados);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function mensajeWhatsapp(nombre: string, link: string): string {
    const primerNombre = nombre.split(" ")[0];
    return `Hola ${primerNombre}! Ya puedes ver tus resultados y los del equipo en el celular. Activa tu cuenta acá (es un link de un solo uso): ${link}`;
  }

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      // Si el navegador bloquea el portapapeles, el texto sigue visible para copiar a mano.
    }
  }

  const conLink = resultados?.filter((r) => r.link) ?? [];
  const yaActivados = resultados?.filter((r) => r.yaActivado) ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Crear cuentas de atletas</h1>
        <p className="text-sm text-slate-500">
          Pega los nombres (uno por línea, tal como aparecen en Strava) y genera sus links de
          activación para mandar por WhatsApp.
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Contraseña de administrador
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="nombres" className="mb-1 block text-sm font-medium text-slate-700">
            Nombres (uno por línea)
          </label>
          <textarea
            id="nombres"
            required
            rows={8}
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            placeholder={"Juan Pérez\nMaría José González\n..."}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {cargando ? "Procesando…" : "Crear cuentas y generar links"}
        </button>
      </form>

      {resultados && (
        <div className="space-y-3">
          {yaActivados.length > 0 && (
            <p className="text-xs text-slate-400">
              {yaActivados.length === 1 ? "1 atleta ya" : `${yaActivados.length} atletas ya`} tenía cuenta activada
              — no se les generó link: {yaActivados.map((r) => r.nombre).join(", ")}.
            </p>
          )}

          {conLink.map((r) => (
            <div key={r.nombre} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="mb-2 text-sm font-semibold text-slate-900">{r.nombre}</p>
              <p className="mb-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                {mensajeWhatsapp(r.nombre, r.link!)}
              </p>
              <button
                onClick={() => copiar(mensajeWhatsapp(r.nombre, r.link!), r.nombre)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {copiado === r.nombre ? "¡Copiado!" : "Copiar mensaje"}
              </button>
            </div>
          ))}

          {conLink.length === 0 && yaActivados.length === resultados.length && (
            <p className="text-sm text-slate-500">Todos los atletas de la lista ya tenían su cuenta activada.</p>
          )}
        </div>
      )}
    </div>
  );
}
