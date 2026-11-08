"""
Utilidades compartidas para el sync Maestro -> Supabase.

Estas funciones replican, a propósito, la misma lógica de normalización y
formato que usa club-kpi-platform/app.py (clean_string, to_mins) — no
porque este repo dependa de ese código (son proyectos separados a
propósito), sino para que el MatchKey de un atleta y la interpretación de
los valores guardados en el Maestro coincidan exactamente entre los dos
sistemas. Si algún día cambia el formato en club-kpi-platform, hay que
actualizar esto también a mano.
"""
import io
import os
import re
import unicodedata

import pandas as pd


# -----------------------------------------------------------------------
# NORMALIZACIÓN DE NOMBRES (idéntico a clean_string() en app.py)
# -----------------------------------------------------------------------
def clean_string(texto) -> str:
    if texto is None or (isinstance(texto, float) and pd.isna(texto)):
        return ""
    sucio = str(texto).strip().upper()
    nfkd = unicodedata.normalize("NFKD", sucio)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sin_tildes).strip()


# -----------------------------------------------------------------------
# PARSEO DE "HH:MM" -> MINUTOS (equivalente reducido de to_mins() en app.py,
# suficiente para leer de vuelta lo que el propio app.py ya escribió)
# -----------------------------------------------------------------------
BASURA_TIEMPO = {"--:--", "", "0", "00:00", "00:00:00", "nan", "none", "nc"}


def hhmm_a_minutos(valor) -> int:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return 0
    if isinstance(valor, pd.Timedelta):
        return int(valor.total_seconds() // 60)
    if isinstance(valor, (int, float)):
        return int(round(valor))
    texto = str(valor).strip().lower()
    if texto in BASURA_TIEMPO:
        return 0
    match = re.match(r"^(\d+):(\d{2})(?::\d{2})?$", texto)
    if match:
        horas, minutos = int(match.group(1)), int(match.group(2))
        return horas * 60 + minutos
    try:
        return int(round(float(texto)))
    except ValueError:
        return 0


def numero_o_cero(valor) -> float:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return 0.0
    try:
        return float(valor)
    except (TypeError, ValueError):
        return 0.0


# -----------------------------------------------------------------------
# BÚSQUEDA DE HOJAS POR NOMBRE NORMALIZADO
# -----------------------------------------------------------------------
def buscar_hoja(hojas: dict, *nombres_posibles: str):
    """Devuelve el DataFrame de la primera hoja cuyo nombre normalizado
    coincida con alguno de nombres_posibles (también normalizados), o None."""
    objetivo = {clean_string(n) for n in nombres_posibles}
    for nombre_real, df in hojas.items():
        if clean_string(nombre_real) in objetivo:
            return df
    return None


def columna_identidad(df: pd.DataFrame) -> str:
    if "Nombre" in df.columns:
        return "Nombre"
    if "Deportista" in df.columns:
        return "Deportista"
    return df.columns[0]


_RE_SEMANA = re.compile(r"^SEM\s*0*(\d+)$")


def columnas_semana(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if str(c).strip().upper().startswith("SEM")]


def numero_semana(etiqueta: str) -> int | None:
    match = _RE_SEMANA.match(str(etiqueta).strip().upper())
    return int(match.group(1)) if match else None


def etiqueta_semana_mas_reciente(hojas: dict) -> str | None:
    """Escanea todas las hojas del Maestro y devuelve la etiqueta de semana
    (tal como aparece de verdad, ej. "Sem 34") con el número más alto."""
    mejor_num, mejor_etiqueta = None, None
    for df in hojas.values():
        if not isinstance(df, pd.DataFrame):
            continue
        for col in columnas_semana(df):
            num = numero_semana(col)
            if num is not None and (mejor_num is None or num > mejor_num):
                mejor_num, mejor_etiqueta = num, str(col)
    return mejor_etiqueta


# -----------------------------------------------------------------------
# DESCARGA DEL MAESTRO DESDE GOOGLE DRIVE (solo lectura)
# -----------------------------------------------------------------------
def descargar_maestro() -> dict:
    """Descarga el Excel Maestro desde Drive (mismo archivo que usa
    club-kpi-platform) y devuelve {nombre_hoja: DataFrame} para todas las
    hojas. Requiere las variables de entorno GOOGLE_SERVICE_ACCOUNT_JSON
    (el JSON completo de la cuenta de servicio, como texto) y
    DRIVE_MAESTRO_FILE_ID."""
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    import json

    credenciales_json = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]
    file_id = os.environ["DRIVE_MAESTRO_FILE_ID"]

    info = json.loads(credenciales_json)
    creds = Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    servicio = build("drive", "v3", credentials=creds)

    solicitud = servicio.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    descargador = MediaIoBaseDownload(buffer, solicitud)
    completado = False
    while not completado:
        _, completado = descargador.next_chunk()
    buffer.seek(0)

    return pd.read_excel(buffer, sheet_name=None)
