import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/get-sesion";
import NavInferior from "./nav-inferior";
import BotonSalir from "./boton-salir";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs text-slate-400">Club TYM</p>
          <p className="text-sm font-semibold text-slate-900">{sesion.nombre}</p>
        </div>
        <BotonSalir />
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <NavInferior />
    </div>
  );
}
