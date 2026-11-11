import { obtenerFicha, obtenerMediaHistorica, obtenerSemanaActual } from "@/lib/datos-club";
import { obtenerSesion } from "@/lib/get-sesion";
import { redirect } from "next/navigation";
import { diferenciaConSigno, formatoHHMM, formatoPorcentaje } from "@/lib/formato";
import type { FichaSemanal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MiFichaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const semana = await obtenerSemanaActual();
  if (!semana) {
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-500">
        Todavía no hay datos sincronizados. Vuelve después de la primera actualización semanal.
      </div>
    );
  }

  const ficha = await obtenerFicha(semana.etiqueta_semana, sesion.matchKey);
  if (!ficha) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-sm text-slate-500">
          No encontramos datos tuyos para <strong>{semana.etiqueta_semana}</strong>. Si entrenaste esta semana y no
          aparece, avísale a quien administra el club.
        </p>
      </div>
    );
  }

  const mediaHistorica = await obtenerMediaHistorica(sesion.matchKey, semana.etiqueta_semana);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{ficha.atleta_nombre}</h1>
        <p className="text-xs text-slate-400">{semana.etiqueta_semana}</p>
      </div>

      <EstadoYRacha ficha={ficha} />

      <TarjetaTPI ficha={ficha} />

      {/* Distancia, salida más larga, velocidad y desnivel quedan "durmiendo"
          por ahora — a propósito, fácil de revertir si se quiere mostrar de nuevo. */}
      <TarjetaDisciplina
        titulo="🏊‍♂️ Natación"
        filas={[
          [
            "Tiempo",
            formatoHHMM(ficha.minutos_natacion),
            [
              diferenciaEquipo(ficha.minutos_natacion, semana.promedio_natacion_mins),
              diferenciaHistorica(ficha.minutos_natacion, mediaHistorica?.natacion ?? null),
            ],
          ],
        ]}
      />

      <TarjetaDisciplina
        titulo="🚴‍♂️ Ciclismo"
        filas={[
          [
            "Tiempo",
            formatoHHMM(ficha.minutos_ciclismo),
            [
              diferenciaEquipo(ficha.minutos_ciclismo, semana.promedio_ciclismo_mins),
              diferenciaHistorica(ficha.minutos_ciclismo, mediaHistorica?.ciclismo ?? null),
            ],
          ],
        ]}
      />

      <TarjetaDisciplina
        titulo="🏃‍♂️ Trote"
        filas={[
          [
            "Tiempo",
            formatoHHMM(ficha.minutos_trote),
            [
              diferenciaEquipo(ficha.minutos_trote, semana.promedio_trote_mins),
              diferenciaHistorica(ficha.minutos_trote, mediaHistorica?.trote ?? null),
            ],
          ],
        ]}
      />

      {(ficha.pulso_promedio || ficha.potencia_promedio) && (
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Datos personales</h3>
          <p className="mb-3 text-[11px] text-slate-400">Solo tú ves esto — no se compara con el equipo</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ficha.pulso_promedio && (
              <>
                <FilaDato label="Pulso promedio" valor={`${Math.round(ficha.pulso_promedio)} ppm`} />
                <FilaDato label="Pulso máximo" valor={`${Math.round(ficha.pulso_maximo ?? 0)} ppm`} />
              </>
            )}
            {ficha.potencia_promedio && (
              <>
                <FilaDato label="Potencia promedio" valor={`${Math.round(ficha.potencia_promedio)} W`} />
                <FilaDato label="Potencia máxima" valor={`${Math.round(ficha.potencia_maxima ?? 0)} W`} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function diferenciaEquipo(valor: number | null, promedio: number | null): string | null {
  if (valor == null || promedio == null) return null;
  return `${diferenciaConSigno(valor, promedio, formatoHHMM)} vs. promedio equipo`;
}

function diferenciaHistorica(valor: number | null, mediaHistorica: number | null): string | null {
  if (valor == null || mediaHistorica == null) return null;
  return `${diferenciaConSigno(valor, mediaHistorica, formatoHHMM)} vs. tu media histórica`;
}

function EstadoYRacha({ ficha }: { ficha: FichaSemanal }) {
  return (
    <section className="flex gap-3">
      <div className="flex-1 rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-[11px] text-slate-400">Estado de la semana</p>
        <p className={`mt-1 text-sm font-bold ${ficha.es_completo ? "text-emerald-600" : "text-slate-500"}`}>
          {ficha.es_completo ? "✅ Triatleta Completo" : "Incompleto"}
        </p>
      </div>
      <div className="flex-1 rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-[11px] text-slate-400">🔥 Racha de constancia</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {ficha.racha_completo} {ficha.racha_completo === 1 ? "semana" : "semanas"}
        </p>
      </div>
    </section>
  );
}

function TarjetaTPI({ ficha }: { ficha: FichaSemanal }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Adherencia al Plan (TPI)</h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        <TpiMini label="Global" valor={ficha.tpi_global} destacado />
        <TpiMini label="Nat." valor={ficha.tpi_natacion} />
        <TpiMini label="Bici" valor={ficha.tpi_ciclismo} />
        <TpiMini label="Trote" valor={ficha.tpi_trote} />
      </div>
    </section>
  );
}

function TpiMini({ label, valor, destacado }: { label: string; valor: number | null; destacado?: boolean }) {
  return (
    <div>
      <p className={`font-bold ${destacado ? "text-xl text-blue-600" : "text-base text-slate-700"}`}>
        {formatoPorcentaje(valor)}
      </p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

function TarjetaDisciplina({
  titulo,
  filas,
}: {
  titulo: string;
  filas: [string, string, (string | null)[]][];
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{titulo}</h3>
      <dl className="divide-y divide-slate-100">
        {filas.map(([label, valor, comparaciones]) => (
          <div key={label} className="flex items-center justify-between py-1.5 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right">
              <span className="font-medium text-slate-900">{valor}</span>
              {comparaciones
                .filter((c): c is string => c !== null)
                .map((c) => (
                  <span key={c} className="block text-[11px] text-slate-400">
                    {c}
                  </span>
                ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

