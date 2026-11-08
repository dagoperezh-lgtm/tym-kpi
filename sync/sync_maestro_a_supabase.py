#!/usr/bin/env python3
"""
Sincroniza la última semana procesada del Maestro (Google Drive) hacia
Supabase, para que la app web (tym-kpi) tenga datos frescos.

Este script es independiente de club-kpi-platform: solo LEE el mismo
archivo Excel que esa app ya genera y sube a Drive cada semana. No lo
modifica, y no depende de su código en absoluto.

Variables de entorno requeridas:
    GOOGLE_SERVICE_ACCOUNT_JSON  — JSON completo de la cuenta de servicio (texto)
    DRIVE_MAESTRO_FILE_ID        — ID del archivo Maestro en Drive
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Limitaciones conocidas (datos que el Maestro no guarda históricamente, así
que esta sincronización no los puede traer):
  - Pulso y potencia (solo existen en el reporte Word de la semana en que
    se generaron, nunca se escriben en una hoja del Maestro).
  - TPI por disciplina (Natación/Ciclismo/Trote): el Maestro solo guarda
    el histórico del TPI Global, no el desglose por disciplina.
Si en algún momento se quiere tener esos datos en la web, hay que agregar
(en club-kpi-platform, con cuidado) hojas que los persistan semana a
semana — hoy simplemente no existen en el archivo.
"""
import os
import sys

from common import (
    buscar_hoja,
    clean_string,
    columna_identidad,
    columnas_semana,
    descargar_maestro,
    etiqueta_semana_mas_reciente,
    hhmm_a_minutos,
    numero_o_cero,
    numero_semana,
)

# -----------------------------------------------------------------------
# Métricas "numéricas" (km / km/h / m), igual a HOJAS_METRICAS_NUEVAS en
# club-kpi-platform/app.py: (nombre_hoja, campo_ficha, categoria_ranking)
# -----------------------------------------------------------------------
METRICAS_NUMERICAS = [
    ("Distancia_Natación", "km_natacion", "natacion_distancia"),
    ("Distancia_Ciclismo", "km_ciclismo", "ciclismo_distancia"),
    ("Distancia_Trote", "km_trote", "trote_distancia"),
    ("Salida_Mas_Larga_Ciclismo", "salida_mas_larga_ciclismo_km", "ciclismo_salida_larga"),
    ("Salida_Mas_Larga_Trote", "salida_mas_larga_trote_km", "trote_salida_larga"),
    ("Velocidad_Prom_Ciclismo", "vel_prom_ciclismo_kmh", "ciclismo_vel_prom"),
    ("Velocidad_Prom_Trote", "vel_prom_trote_kmh", "trote_vel_prom"),
    ("Velocidad_Max_Ciclismo", "vel_max_ciclismo_kmh", "ciclismo_vel_max"),
    ("Velocidad_Max_Trote", "vel_max_trote_kmh", "trote_vel_max"),
    ("Desnivel_Ciclismo", "desnivel_ciclismo_m", "ciclismo_desnivel"),
    ("Desnivel_Trote", "desnivel_trote_m", "trote_desnivel"),
]

# Métrica del Maestro (hoja Records_Club) -> categoria de ranking (ver src/lib/types.ts)
CATEGORIA_POR_METRICA_RECORD = {
    "TPI Global": "tpi_global",
    "Tiempo Total": "tiempo_total",
    "Tiempo Natación": "natacion_tiempo",
    "Tiempo Ciclismo": "ciclismo_tiempo",
    "Tiempo Trote": "trote_tiempo",
    "Distancia Natación": "natacion_distancia",
    "Distancia Ciclismo": "ciclismo_distancia",
    "Distancia Trote": "trote_distancia",
    "Salida Más Larga Ciclismo": "ciclismo_salida_larga",
    "Salida Más Larga Trote": "trote_salida_larga",
    "Velocidad Promedio Ciclismo": "ciclismo_vel_prom",
    "Velocidad Promedio Trote": "trote_vel_prom",
    "Velocidad Máxima Ciclismo": "ciclismo_vel_max",
    "Velocidad Máxima Trote": "trote_vel_max",
    "Desnivel Ciclismo": "ciclismo_desnivel",
    "Desnivel Trote": "trote_desnivel",
}


def valor_semana(df, etiqueta, match_key, parser):
    if df is None or etiqueta not in df.columns:
        return None
    col_id = columna_identidad(df)
    fila = df[df[col_id].apply(clean_string) == match_key]
    if fila.empty:
        return None
    return parser(fila.iloc[0][etiqueta])


def calcular_racha(hoja_nat, hoja_bici, hoja_trote, etiqueta, match_key):
    """Cuenta semanas consecutivas (terminando en `etiqueta`, hacia atrás)
    en que el atleta entrenó las 3 disciplinas. Replica calcular_racha_completo()
    de club-kpi-platform/app.py, pero leyendo directo del Maestro."""
    semana_objetivo = numero_semana(etiqueta)
    if semana_objetivo is None:
        return 0

    # Universo de números de semana disponibles en cualquiera de las 3 hojas
    numeros_disponibles = set()
    for hoja in (hoja_nat, hoja_bici, hoja_trote):
        if hoja is None:
            continue
        for col in columnas_semana(hoja):
            n = numero_semana(col)
            if n is not None:
                numeros_disponibles.add(n)

    racha = 0
    semana_actual = semana_objetivo
    while semana_actual in numeros_disponibles:
        etiqueta_actual = f"Sem {semana_actual:02d}" if semana_actual < 100 else f"Sem {semana_actual}"
        # Los nombres de columna reales pueden no llevar cero a la izquierda;
        # buscamos por número, no por texto exacto.
        col_real = next(
            (
                c
                for hoja in (hoja_nat, hoja_bici, hoja_trote)
                if hoja is not None
                for c in columnas_semana(hoja)
                if numero_semana(c) == semana_actual
            ),
            etiqueta_actual,
        )
        n = valor_semana(hoja_nat, col_real, match_key, hhmm_a_minutos) or 0
        b = valor_semana(hoja_bici, col_real, match_key, hhmm_a_minutos) or 0
        t = valor_semana(hoja_trote, col_real, match_key, hhmm_a_minutos) or 0
        if n > 0 and b > 0 and t > 0:
            racha += 1
            semana_actual -= 1
        else:
            break
    return racha


def main():
    print("Descargando Maestro desde Drive…")
    hojas = descargar_maestro()

    etiqueta = etiqueta_semana_mas_reciente(hojas)
    if etiqueta is None:
        print("No se encontró ninguna columna 'Sem NN' en el Maestro. Nada que sincronizar.")
        sys.exit(1)
    print(f"Semana más reciente encontrada: {etiqueta}")

    hoja_total = buscar_hoja(hojas, "TIEMPO TOTAL")
    hoja_nat = buscar_hoja(hojas, "NATACION", "NATACIÓN")
    hoja_bici = buscar_hoja(hojas, "BICICLETA", "CICLISMO")
    hoja_trote = buscar_hoja(hojas, "TROTE", "RUNNING")
    hoja_tpi = buscar_hoja(hojas, "HISTORICO_TPI", "HISTÓRICO_TPI", "HISTORICOTPI")
    hoja_records = buscar_hoja(hojas, "RECORDS_CLUB")

    if hoja_total is None:
        print("No se encontró la hoja 'TIEMPO TOTAL' en el Maestro. Abortando.")
        sys.exit(1)

    col_id = columna_identidad(hoja_total)
    atletas = []
    for _, fila in hoja_total.iterrows():
        nombre = fila[col_id]
        match_key = clean_string(nombre)
        if not match_key:
            continue

        minutos_total = hhmm_a_minutos(fila.get(etiqueta))
        minutos_nat = valor_semana(hoja_nat, etiqueta, match_key, hhmm_a_minutos) or 0
        minutos_bici = valor_semana(hoja_bici, etiqueta, match_key, hhmm_a_minutos) or 0
        minutos_trote = valor_semana(hoja_trote, etiqueta, match_key, hhmm_a_minutos) or 0
        tpi_global = valor_semana(hoja_tpi, etiqueta, match_key, numero_o_cero)
        tpi_global = round(tpi_global * 100, 1) if tpi_global is not None else None

        atleta = {
            "atleta_match_key": match_key,
            "atleta_nombre": str(nombre),
            "minutos_total": minutos_total,
            "minutos_natacion": minutos_nat,
            "minutos_ciclismo": minutos_bici,
            "minutos_trote": minutos_trote,
            "tpi_global": tpi_global,
            "tpi_natacion": None,  # el Maestro no guarda el desglose histórico por disciplina
            "tpi_ciclismo": None,
            "tpi_trote": None,
            "es_completo": minutos_nat > 0 and minutos_bici > 0 and minutos_trote > 0,
            "racha_completo": calcular_racha(hoja_nat, hoja_bici, hoja_trote, etiqueta, match_key),
            "pulso_promedio": None,  # no persistido en el Maestro (ver limitaciones arriba)
            "pulso_maximo": None,
            "potencia_promedio": None,
            "potencia_maxima": None,
        }
        for nombre_hoja, campo_ficha, _categoria in METRICAS_NUMERICAS:
            hoja_metrica = buscar_hoja(hojas, nombre_hoja)
            atleta[campo_ficha] = valor_semana(hoja_metrica, etiqueta, match_key, numero_o_cero) or 0.0

        atletas.append(atleta)

    if not atletas:
        print("No se encontró ningún atleta con datos esta semana. Nada que sincronizar.")
        sys.exit(1)

    # -------------------------------------------------------------------
    # Datos generales del equipo. Se calculan sobre los atletas "activos
    # esta semana" (T_Mins_Real > 0) — ver nota en el docstring del módulo
    # si algún número no calza con el reporte de club-kpi-platform: es la
    # definición de población más razonable que se puede derivar solo del
    # Maestro, pero conviene verificarla contra el primer reporte real.
    # -------------------------------------------------------------------
    activos = [a for a in atletas if a["minutos_total"] > 0]
    atletas_activos = len(activos)
    horas_totales_equipo = round(sum(a["minutos_total"] for a in atletas) / 60, 1)
    tpi_promedio_equipo = (
        round(sum(a["tpi_global"] for a in activos if a["tpi_global"] is not None) / len(activos), 1)
        if activos
        else None
    )
    promedio_natacion = round(sum(a["minutos_natacion"] for a in activos) / len(activos), 1) if activos else None
    promedio_ciclismo = round(sum(a["minutos_ciclismo"] for a in activos) / len(activos), 1) if activos else None
    promedio_trote = round(sum(a["minutos_trote"] for a in activos) / len(activos), 1) if activos else None

    # -------------------------------------------------------------------
    # Rankings (Top 10, salvo 'completos' que no tiene tope)
    # -------------------------------------------------------------------
    rankings = []

    def agregar_ranking(categoria, valores, formateador, tope=10):
        ordenado = sorted(
            [v for v in valores if v["valor_numerico"] and v["valor_numerico"] > 0],
            key=lambda v: v["valor_numerico"],
            reverse=True,
        )
        if tope:
            ordenado = ordenado[:tope]
        for pos, v in enumerate(ordenado, start=1):
            rankings.append(
                {
                    "etiqueta_semana": etiqueta,
                    "categoria": categoria,
                    "posicion": pos,
                    "atleta_match_key": v["atleta_match_key"],
                    "atleta_nombre": v["atleta_nombre"],
                    "valor_mostrado": formateador(v["valor_numerico"]),
                    "valor_numerico": v["valor_numerico"],
                }
            )

    def hhmm(mins):
        mins = round(mins)
        return f"{mins // 60:02d}:{mins % 60:02d}"

    def km(v):
        return f"{v:.1f} km".replace(".", ",")

    def kmh(v):
        return f"{v:.1f} km/h".replace(".", ",")

    def metros(v):
        return f"{round(v)} m"

    def porcentaje(v):
        return f"{v:.1f}%"

    agregar_ranking(
        "completos",
        [
            {"atleta_match_key": a["atleta_match_key"], "atleta_nombre": a["atleta_nombre"], "valor_numerico": a["minutos_total"]}
            for a in atletas
            if a["es_completo"]
        ],
        hhmm,
        tope=None,
    )
    agregar_ranking(
        "tpi_global",
        [{**a, "valor_numerico": a["tpi_global"]} for a in atletas],
        porcentaje,
    )
    agregar_ranking(
        "tiempo_total",
        [{**a, "valor_numerico": a["minutos_total"]} for a in atletas],
        hhmm,
    )
    agregar_ranking(
        "natacion_tiempo",
        [{**a, "valor_numerico": a["minutos_natacion"]} for a in atletas],
        hhmm,
    )
    agregar_ranking(
        "ciclismo_tiempo",
        [{**a, "valor_numerico": a["minutos_ciclismo"]} for a in atletas],
        hhmm,
    )
    agregar_ranking(
        "trote_tiempo",
        [{**a, "valor_numerico": a["minutos_trote"]} for a in atletas],
        hhmm,
    )

    FORMATEADORES_NUMERICOS = {
        "natacion_distancia": km,
        "ciclismo_distancia": km,
        "trote_distancia": km,
        "ciclismo_salida_larga": km,
        "trote_salida_larga": km,
        "ciclismo_vel_prom": kmh,
        "trote_vel_prom": kmh,
        "ciclismo_vel_max": kmh,
        "trote_vel_max": kmh,
        "ciclismo_desnivel": metros,
        "trote_desnivel": metros,
    }
    for nombre_hoja, campo_ficha, categoria in METRICAS_NUMERICAS:
        agregar_ranking(
            categoria,
            [{**a, "valor_numerico": a[campo_ficha]} for a in atletas],
            FORMATEADORES_NUMERICOS[categoria],
        )

    # -------------------------------------------------------------------
    # Récords del club
    # -------------------------------------------------------------------
    records = []
    if hoja_records is not None:
        for _, fila in hoja_records.iterrows():
            metrica = str(fila.get("Métrica", "")).strip()
            categoria = CATEGORIA_POR_METRICA_RECORD.get(metrica)
            if categoria is None:
                continue
            records.append(
                {
                    "metrica": metrica,
                    "categoria": categoria,
                    "valor_mostrado": str(fila.get("Récord")) if not _es_nulo(fila.get("Récord")) else None,
                    "valor_numerico": numero_o_cero(fila.get("Valor_Numerico")),
                    "atleta_nombre": str(fila.get("Deportista")) if not _es_nulo(fila.get("Deportista")) else None,
                    "fecha": str(fila.get("Fecha")) if not _es_nulo(fila.get("Fecha")) else None,
                    "semana_record": str(fila.get("Semana_Record")) if not _es_nulo(fila.get("Semana_Record")) else None,
                }
            )

    # -------------------------------------------------------------------
    # Subida a Supabase
    # -------------------------------------------------------------------
    from supabase import create_client

    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    print(f"Subiendo datos generales de {etiqueta}…")
    db.table("semanas_club").upsert(
        {
            "etiqueta_semana": etiqueta,
            "atletas_activos": atletas_activos,
            "horas_totales_equipo": horas_totales_equipo,
            "tpi_promedio_equipo": tpi_promedio_equipo,
            "promedio_natacion_mins": promedio_natacion,
            "promedio_ciclismo_mins": promedio_ciclismo,
            "promedio_trote_mins": promedio_trote,
        }
    ).execute()

    print(f"Subiendo {len(rankings)} filas de ranking…")
    db.table("rankings").delete().eq("etiqueta_semana", etiqueta).execute()
    if rankings:
        db.table("rankings").insert(rankings).execute()

    if records:
        print(f"Subiendo {len(records)} récords del club…")
        db.table("records_club").upsert(records).execute()

    print(f"Subiendo {len(atletas)} fichas personales…")
    fichas = [{**a, "etiqueta_semana": etiqueta} for a in atletas]
    db.table("fichas_semanales").upsert(fichas, on_conflict="etiqueta_semana,atleta_match_key").execute()

    print("Listo ✅")


def _es_nulo(valor) -> bool:
    import pandas as pd

    return valor is None or (isinstance(valor, float) and pd.isna(valor))


if __name__ == "__main__":
    main()
