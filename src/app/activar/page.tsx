export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; nombre?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">Club TYM — resultados y ranking semanal del equipo</p>
        </div>

        <form
          method="POST"
          action="/api/auth/registrar"
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-slate-700">
              Tu nombre (tal como aparece en Strava)
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              defaultValue={params.nombre ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Elige una contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">Mínimo 6 caracteres.</p>
          </div>

          {params.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Crear mi cuenta
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-blue-600">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
