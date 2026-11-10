export default function SincronizarPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Sincronizar datos de la semana</h1>
        <p className="text-sm text-slate-500">
          Sube el mismo Excel Maestro que acabas de descargar de club-kpi-platform (el de la
          semana que acabas de procesar) para traer los datos al panel web.
        </p>
      </div>

      <form
        method="POST"
        action="/api/sincronizar"
        encType="multipart/form-data"
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="maestro" className="mb-1 block text-sm font-medium text-slate-700">
            Excel Maestro (.xlsx)
          </label>
          <input
            id="maestro"
            name="maestro"
            type="file"
            accept=".xlsx"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Sincronizar ahora
        </button>
      </form>
    </div>
  );
}
