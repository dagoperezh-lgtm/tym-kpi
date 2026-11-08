#!/usr/bin/env python3
"""
Crea (o revisa) las cuentas de los atletas en Supabase a partir de
admin/atletas.txt, y genera los links de activación de un solo uso para
mandar por WhatsApp.

Uso:
    python3 provisionar_atletas.py [ruta/a/atletas.txt]

Variables de entorno requeridas:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    BASE_URL   — ej. https://tym-kpi.vercel.app (sin / al final)

Es seguro correrlo de nuevo con la misma lista: a los atletas que ya
tienen cuenta activada no les genera un link nuevo (a menos que fuerces
uno con --reenviar), y a los que todavía no activan su cuenta les
reutiliza el último link vigente en vez de crear uno nuevo cada vez.
"""
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sync"))
from common import clean_string  # noqa: E402

DIAS_VALIDEZ_TOKEN = 14


def leer_nombres(ruta: str) -> list[str]:
    nombres = []
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#"):
                continue
            nombres.append(linea)
    return nombres


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "atletas.txt")
    if ruta == os.path.join(os.path.dirname(__file__), "atletas.txt") and not os.path.exists(ruta):
        print(f"No existe {ruta}. Copia admin/atletas.example.txt a admin/atletas.txt y pon ahí los nombres reales.")
        return
    reenviar = "--reenviar" in sys.argv
    base_url = os.environ["BASE_URL"].rstrip("/")

    from supabase import create_client

    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    nombres = leer_nombres(ruta)
    if not nombres:
        print(f"No hay nombres en {ruta}. Agrega uno por línea y vuelve a correr el script.")
        return

    print(f"Procesando {len(nombres)} atleta(s)…\n")
    links_para_enviar = []

    for nombre in nombres:
        match_key = clean_string(nombre)
        if not match_key:
            continue

        existente = db.table("atletas").select("*").eq("match_key", match_key).limit(1).execute()
        atleta = existente.data[0] if existente.data else None

        if atleta is None:
            creado = db.table("atletas").insert({"nombre": nombre, "match_key": match_key}).execute()
            atleta = creado.data[0]
            print(f"+ {nombre}: cuenta creada")
        else:
            print(f"· {nombre}: ya existía")

        if atleta["password_hash"] and not reenviar:
            print(f"  → ya activó su cuenta, no se genera link.\n")
            continue

        if not reenviar:
            activacion_vigente = (
                db.table("activaciones")
                .select("*")
                .eq("atleta_id", atleta["id"])
                .is_("usado_en", "null")
                .order("creado_en", desc=True)
                .limit(1)
                .execute()
            )
            if activacion_vigente.data:
                fila = activacion_vigente.data[0]
                vence = datetime.fromisoformat(fila["expira_en"].replace("Z", "+00:00"))
                if vence > datetime.now(timezone.utc):
                    token = fila["token"]
                    print(f"  → reusando link vigente (vence {vence:%d-%m-%Y}).\n")
                    links_para_enviar.append((nombre, f"{base_url}/activar/{token}"))
                    continue

        expira_en = (datetime.now(timezone.utc) + timedelta(days=DIAS_VALIDEZ_TOKEN)).isoformat()
        nueva = (
            db.table("activaciones")
            .insert({"atleta_id": atleta["id"], "expira_en": expira_en})
            .execute()
        )
        token = nueva.data[0]["token"]
        print(f"  → nuevo link generado (vence en {DIAS_VALIDEZ_TOKEN} días).\n")
        links_para_enviar.append((nombre, f"{base_url}/activar/{token}"))

    if links_para_enviar:
        print("=" * 60)
        print("LINKS PARA MANDAR POR WHATSAPP (uno por atleta, no se comparten):")
        print("=" * 60)
        for nombre, link in links_para_enviar:
            print(f"\n{nombre}:")
            print(
                f"Hola {nombre.split()[0]}! Ya puedes ver tus resultados y los del equipo en el celular. "
                f"Activa tu cuenta acá (es un link de un solo uso, válido {DIAS_VALIDEZ_TOKEN} días): {link}"
            )
    else:
        print("Nadie necesita un link nuevo por ahora.")


if __name__ == "__main__":
    main()
