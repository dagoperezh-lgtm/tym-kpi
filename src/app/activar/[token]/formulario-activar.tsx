"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioActivar({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("/api/auth/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? "No se pudo activar tu cuenta.");
        return;
      }
      router.push("/club");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
      </div>

      <div>
        <label htmlFor="confirmar" className="mb-1 block text-sm font-medium text-slate-700">
          Repite la contraseña
        </label>
        <input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {cargando ? "Guardando…" : "Activar mi cuenta"}
      </button>
    </form>
  );
}
