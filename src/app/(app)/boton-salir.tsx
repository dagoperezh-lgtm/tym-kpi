export default function BotonSalir() {
  return (
    <form method="POST" action="/api/auth/logout">
      <button type="submit" className="text-xs font-medium text-slate-400 hover:text-slate-600">
        Salir
      </button>
    </form>
  );
}
