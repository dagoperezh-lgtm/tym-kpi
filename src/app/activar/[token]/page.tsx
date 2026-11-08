import { supabaseAdmin } from "@/lib/supabase-server";
import { estaVencida } from "@/lib/activacion";
import type { Activacion, Atleta } from "@/lib/types";
import FormularioActivar from "./formulario-activar";

export default async function ActivarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: activacion } = await db
    .from("activaciones")
    .select("*")
    .eq("token", token)
    .maybeSingle<Activacion>();

  if (!activacion) {
    return <MensajeError texto="Este link de activación no es válido." />;
  }
  if (activacion.usado_en) {
    return (
      <MensajeError texto="Este link ya fue usado. Si ya definiste tu contraseña, inicia sesión normalmente." enlaceLogin />
    );
  }
  if (estaVencida(activacion.expira_en)) {
    return <MensajeError texto="Este link de activación venció. Pídele uno nuevo a quien administra el club." />;
  }

  const { data: atleta } = await db
    .from("atletas")
    .select("*")
    .eq("id", activacion.atleta_id)
    .maybeSingle<Atleta>();

  if (!atleta) {
    return <MensajeError texto="No se encontró tu cuenta. Avísale a quien administra el club." />;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">¡Hola, {atleta.nombre}!</h1>
          <p className="mt-1 text-sm text-slate-500">Crea tu contraseña para acceder a tus resultados del Club TYM.</p>
        </div>
        <FormularioActivar token={token} />
      </div>
    </div>
  );
}

function MensajeError({ texto, enlaceLogin }: { texto: string; enlaceLogin?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-slate-700">{texto}</p>
        {enlaceLogin && (
          <a href="/login" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Ir a iniciar sesión
          </a>
        )}
      </div>
    </div>
  );
}
