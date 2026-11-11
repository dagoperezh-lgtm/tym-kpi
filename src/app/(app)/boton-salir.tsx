export default function BotonSalir() {
  return (
    <form method="POST" action="/api/auth/logout">
      <button type="submit" className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
        Salir
      </button>
    </form>
  );
}
