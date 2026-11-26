"""Carga una corrida en PostGIS (tablas de apps/api/db/migraciones/003_laboratorio.sql).

Reemplaza los resultados anteriores del laboratorio y actualiza la señal «Laboratorio virtual» del mapa
para cada río. Usa DATABASE_URL (o la de apps/api/.env).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import psycopg
from shapely.geometry import shape

from .config import RAIZ, leer_json, parametros

DETALLE = {
    "alta": "Prioridad alta de muestreo en {n} tramo(s): minería nueva aguas arriba y turbidez anómala persistente.",
    "media": "Prioridad media de muestreo en {n} tramo(s): huella minera aguas arriba o turbidez anómala.",
    "baja": "Sin señales satelitales destacadas en la temporada {anio}. No significa ausencia de mercurio ni agua segura.",
}


def url_db() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env = Path(RAIZ).parent / "apps" / "api" / ".env"
    for linea in env.read_text().splitlines() if env.exists() else []:
        if linea.startswith("DATABASE_URL="):
            return linea.split("=", 1)[1].strip()
    raise SystemExit("Falta DATABASE_URL")


def ejecutar() -> None:
    p = parametros()
    tramos = leer_json("tramos.geojson")["features"]
    mineria = leer_json("mineria.json")
    espectral = leer_json("espectral.json")
    riesgo = leer_json("riesgo.json")
    manifiesto = leer_json("manifiesto.json")
    ultimo = max(int(a) for v in riesgo.values() for a in v)

    with psycopg.connect(url_db()) as c, c.cursor() as cur:
        cur.execute(
            "INSERT INTO corridas_modelo (componente, version, commit_git, estado, parametros, manifiesto) VALUES ('gold2-lab', %s, %s, 'v0_sin_revision', %s, %s) RETURNING id",
            (p["riesgo"]["version"], manifiesto.get("riesgo", {}).get("commit"), json.dumps(p), json.dumps(manifiesto)),
        )
        corrida = cur.fetchone()[0]
        # Resultados anteriores del laboratorio: se reemplazan (las corridas quedan como historial).
        cur.execute("DELETE FROM evaluaciones_riesgo; DELETE FROM indicadores_temporada; DELETE FROM mineria_tramo; DELETE FROM tramos;")

        # Fuentes de agua que aún no existan (p. ej. el Alto Beni): punto medio del río, sin resultados.
        for rio, fid in p["rios"].items():
            del_rio = [shape(t["geometry"]) for t in tramos if t["properties"]["rio"] == rio]
            if del_rio:
                medio = max(del_rio, key=lambda g: g.length).interpolate(0.5, normalized=True)
                cur.execute(
                    "INSERT INTO fuentes_agua (id, nombre, tipo, cerca, ubicacion) VALUES (%s, %s, 'rio', '', ST_GeogFromText(%s)) ON CONFLICT (id) DO NOTHING",
                    (fid, f"Río {rio}", f"SRID=4326;POINT({medio.x} {medio.y})"),
                )

        for t in tramos:
            pr = t["properties"]
            cur.execute(
                "INSERT INTO tramos (id, rio, fuente_id, orden, desemboca_en, aguas_arriba, longitud_km, geom, corrida_id) VALUES (%s,%s,%s,%s,%s,%s,%s,ST_GeogFromText(%s),%s)",
                (pr["id"], pr["rio"], pr["fuente_id"], pr["orden"], pr["desemboca_en"], pr["aguas_arriba"], pr["longitud_km"], "SRID=4326;" + shape(t["geometry"]).wkt, corrida),
            )
        for tid, m in mineria.items():
            for anio, ha in m["ha_acumulada"].items():
                cur.execute(
                    "INSERT INTO mineria_tramo VALUES (%s, %s, %s, %s, %s)",
                    (tid, int(anio), m["ha_nueva_por_anio"].get(anio, 0.0), ha, corrida),
                )
        for tid, por_anio in espectral.items():
            for anio, v in por_anio.items():
                cur.execute(
                    """INSERT INTO indicadores_temporada (tramo_id, anio, escenas, suficiente, px_agua_mediana, ndti_agua, ndvi_orilla, bsi_orilla,
                         lluvia_previa_mm, z_ndti_agua, z_bsi_orilla, z_lluvia_previa, fechas, corrida_id)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (tid, int(anio), v["escenas"], v["suficiente"], v["px_agua_mediana"], v["ndti_agua"], v["ndvi_orilla"], v["bsi_orilla"],
                     v["lluvia_previa_mm"], v["z_ndti_agua"], v["z_bsi_orilla"], v["z_lluvia_previa_mm"], v["fechas"], corrida),
                )
        for tid, por_anio in riesgo.items():
            for anio, v in por_anio.items():
                cur.execute(
                    "INSERT INTO evaluaciones_riesgo (tramo_id, anio, prioridad, reglas, faltantes, datos, version, corrida_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (tid, int(anio), v["prioridad"], json.dumps(v["reglas"], ensure_ascii=False), json.dumps(v["faltantes"], ensure_ascii=False), json.dumps(v["datos"]), p["riesgo"]["version"], corrida),
                )

        # Señal «Laboratorio virtual» del mapa por río (última temporada). Reemplaza solo la del laboratorio, no las DEMO.
        cur.execute("DELETE FROM indicadores_ambientales WHERE corrida_id IS NOT NULL")
        for rio, fid in p["rios"].items():
            prios = [riesgo[t["properties"]["id"]][str(ultimo)]["prioridad"] for t in tramos if t["properties"]["rio"] == rio]
            if not prios:
                continue
            n_alta, n_media = prios.count("alta"), prios.count("media")
            if n_alta or n_media:
                nivel, detalle = "posible_riesgo", (DETALLE["alta"].format(n=n_alta) if n_alta else DETALLE["media"].format(n=n_media))
            elif prios.count("baja"):
                nivel, detalle = "sin_senales", DETALLE["baja"].format(anio=ultimo)
            else:
                continue  # todo insuficiente: el mapa sigue diciendo «sin análisis»
            cur.execute(
                "INSERT INTO indicadores_ambientales (fuente_id, nivel, detalle, origen, fecha, demo, corrida_id) VALUES (%s, %s, %s, %s, %s, false, %s)",
                (fid, nivel, detalle + " Gold2Risk v0, sin revisión de especialista: prioriza dónde muestrear, no mide mercurio.",
                 f"Gold2Risk {p['riesgo']['version']} · Sentinel-2, Amazon Mining Watch, CHIRPS", f"{ultimo}-09-30", corrida),
            )
        c.commit()
    print(f"  corrida {corrida}: {len(tramos)} tramos cargados (temporada {ultimo})")
