import Image from "next/image";

export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; nombre?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/tym-logo.png" alt="Club TYM" width={88} height={88} className="mb-3 rounded-full" priority />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Crea tu cuenta
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Club TYM — resultados y ranking semanal del equipo
          </p>
        </div>

        <form
          method="POST"
          action="/api/auth/registrar"
          className="space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
              Tu nombre (tal como aparece en Strava)
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              defaultValue={params.nombre ?? ""}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-base sm:text-lg text-slate-900 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
              Elige una contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-base sm:text-lg text-slate-900 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            />
            <p className="mt-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500">Mínimo 6 caracteres.</p>
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
            Crear mi cuenta
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-blue-600 dark:text-blue-400">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
