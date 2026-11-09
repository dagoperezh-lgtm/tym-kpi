export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; usuario?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Club TYM</h1>
          <p className="mt-1 text-sm text-slate-500">Resultados y ranking semanal del equipo</p>
        </div>

        <form
          method="POST"
          action="/api/auth/login"
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <input type="hidden" name="next" value={params.next ?? ""} />

          <div>
            <label htmlFor="usuario" className="mb-1 block text-sm font-medium text-slate-700">
              Usuario (tu nombre en Strava)
            </label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              required
              defaultValue={params.usuario ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {params.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Todavía no tienes cuenta?{" "}
          <a href="/activar" className="font-medium text-blue-600">
            Créala acá
          </a>
        </p>
      </div>
    </div>
  );
}
