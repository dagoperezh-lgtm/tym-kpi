export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; usuario?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Club TYM
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Resultados y ranking semanal del equipo
          </p>
        </div>

        <form
          method="POST"
          action="/api/auth/login"
          className="space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <input type="hidden" name="next" value={params.next ?? ""} />

          <div>
            <label htmlFor="usuario" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
              Usuario (tu nombre en Strava)
            </label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              required
              defaultValue={params.usuario ?? ""}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-base sm:text-lg text-slate-900 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-base sm:text-lg text-slate-900 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            />
          </div>

          {params.error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm sm:text-base text-red-700 dark:text-red-300">
              {params.error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base sm:text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500">
          ¿Todavía no tienes cuenta?{" "}
          <a href="/activar" className="font-medium text-blue-600 dark:text-blue-400">
            Créala acá
          </a>
        </p>
      </div>
    </div>
  );
}
