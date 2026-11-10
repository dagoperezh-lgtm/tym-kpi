import { obtenerRankings, obtenerRankingCompletos, obtenerRecords, obtenerSemanaActual } from "@/lib/datos-club";
import { CATEGORIAS_ORDEN, type Categoria } from "@/lib/types";
import { formatoHHMM, formatoPorcentaje } from "@/lib/formato";

export const dynamic = "force-dynamic"; // los datos se actualizan 1 vez por semana vía el sync script, no por request

// Distancia, salida más larga, velocidad y desnivel quedan "durmiendo" por
// ahora (no se muestran) — a propósito, se puede revertir fácil si en algún
// momento se quiere activarlas de nuevo.
const GRUPOS: { titulo: string; categorias: Categoria[] }[] = [
  { titulo: "General", categorias: ["tpi_global", "tiempo_total"] },
  { titulo: "🏊‍♂️ Natación", categorias: ["natacion_tiempo"] },
  { titulo: "🚴‍♂️ Ciclismo", categorias: ["ciclismo_tiempo"] },
  { titulo: "🏃‍♂️ Trote", categorias: ["trote_tiempo"] },
];

const MEDALLAS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function ClubPage() {
  const semana = await obtenerSemanaActual();

  if (!semana) {
    return (
      <div className="px-4 py-10 text-center text-sm text-slate-500">
        Todavía no hay datos sincronizados. Vuelve después de la primera actualización semanal.
      </div>
    );
  }

  const [rankings, completos, records] = await Promise.all([
    obtenerRankings(semana.etiqueta_semana),
    obtenerRankingCompletos(semana.etiqueta_semana),
    obtenerRecords(),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{semana.etiqueta_semana}</h1>
        {semana.fecha_inicio && semana.fecha_fin && (
          <p className="text-xs text-slate-400">
            {formatoFecha(semana.fecha_inicio)} al {formatoFecha(semana.fecha_fin)}
          </p>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3">
        <Dato label="Atletas activos" valor={String(semana.atletas_activos ?? "—")} />
        <Dato label="TPI promedio equipo" valor={formatoPorcentaje(semana.tpi_promedio_equipo)} />
        <Dato label="Horas totales equipo" valor={formatoHHMM((semana.horas_totales_equipo ?? 0) * 60)} />
        <Dato
          label="Prom. por disciplina"
          valor={`N ${formatoHHMM(semana.promedio_natacion_mins)} · B ${formatoHHMM(
            semana.promedio_ciclismo_mins
          )} · T ${formatoHHMM(semana.promedio_trote_mins)}`}
          chico
        />
      </section>

      <SeccionCompletos atletas={completos} />

      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="space-y-4">
          <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-slate-500">{grupo.titulo}</h2>
          {grupo.categorias.map((categoria) => (
            <TablaRanking
              key={categoria}
              titulo={CATEGORIAS_ORDEN.find((c) => c.categoria === categoria)?.titulo ?? categoria}
              filas={rankings[categoria] ?? []}
              record={records.find((r) => r.categoria === categoria)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Dato({ label, valor, chico }: { label: string; valor: string; chico?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`font-semibold text-slate-900 ${chico ? "text-xs" : "text-base"}`}>{valor}</p>
    </div>
  );
}

function SeccionCompletos({ atletas }: { atletas: { posicion: number; atleta_nombre: string; valor_mostrado: string }[] }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-1 text-sm font-bold text-slate-900">Triatletas Completos</h2>
      <p className="mb-3 text-[11px] text-slate-400">Entrenaron las 3 disciplinas esta semana</p>
      {atletas.length === 0 ? (
        <p className="text-sm text-slate-400">Nadie completó las 3 disciplinas esta semana.</p>
      ) : (
        <ol className="space-y-1.5">
          {atletas.map((a) => (
            <li key={a.posicion} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {MEDALLAS[a.posicion] ?? `${a.posicion}.`} {a.atleta_nombre}
              </span>
              <span className="font-medium text-slate-900">{a.valor_mostrado}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TablaRanking({
  titulo,
  filas,
  record,
}: {
  titulo: string;
  filas: { posicion: number; atleta_nombre: string; valor_mostrado: string }[];
  record?: { valor_mostrado: string | null; atleta_nombre: string | null; fecha: string | null; semana_record: string | null };
}) {
  if (filas.length === 0) return null;
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{titulo}</h3>
      <ol className="space-y-1.5">
        {filas.map((f) => (
          <li key={f.posicion} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">
              {MEDALLAS[f.posicion] ?? `${f.posicion}.`} {f.atleta_nombre}
            </span>
            <span className="font-medium text-slate-900">{f.valor_mostrado}</span>
          </li>
        ))}
      </ol>
      {record?.valor_mostrado && (
        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          🏆 Récord del club: <span className="font-semibold">{record.atleta_nombre}</span> — {record.valor_mostrado}
          {record.fecha ? ` (${record.fecha})` : ""}
        </p>
      )}
    </section>
  );
}

function formatoFecha(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}
