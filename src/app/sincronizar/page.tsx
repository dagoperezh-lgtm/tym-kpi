export default function SincronizarPage() {
  return (
    <div className="mx-auto max-w-lg md:max-w-xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
          Sincronizar datos de la semana
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Sube el mismo Excel Maestro que acabas de descargar de club-kpi-platform (el de la
          semana que acabas de procesar) para traer los datos al panel web.
        </p>
      </div>

      <form
        method="POST"
        action="/api/sincronizar"
        encType="multipart/form-data"
        className="space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        <div>
          <label htmlFor="password" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-base sm:text-lg text-slate-900 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
        </div>

        <div>
          <label htmlFor="maestro" className="mb-1 block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
            Excel Maestro (.xlsx)
          </label>
          <input
            id="maestro"
            name="maestro"
            type="file"
            accept=".xlsx"
            required
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm sm:text-base text-slate-900 dark:text-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 dark:file:text-slate-200"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base sm:text-lg font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Sincronizar ahora
        </button>
      </form>
    </div>
  );
}
