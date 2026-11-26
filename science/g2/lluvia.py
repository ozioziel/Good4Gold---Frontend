"""Lluvia por pentada (CHIRPS v3) en cada tramo, para no confundir turbidez por lluvia con turbidez por minería."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date

import numpy as np
import rasterio
from rasterio.windows import from_bounds
from shapely.geometry import shape

from .config import leer_json, parametros, registrar, escribir_json


def pentada(d: date) -> int:
    """Pentada del mes (1–6): días 1–5, 6–10, 11–15, 16–20, 21–25 y 26 al fin de mes."""
    return min(6, (d.day - 1) // 5 + 1)


def clave(anio: int, mes: int, p: int) -> str:
    return f"{anio}-{mes:02d}-{p}"


def anteriores(d: date, n: int) -> list[str]:
    """Las `n` pentadas que terminan antes de la fecha (la lluvia previa a la imagen)."""
    anio, mes, p = d.year, d.month, pentada(d)
    res = []
    for _ in range(n):
        p -= 1
        if p == 0:
            mes -= 1
            p = 6
            if mes == 0:
                anio, mes = anio - 1, 12
        res.append(clave(anio, mes, p))
    return res


def pentadas_de_temporada(anio: int, desde: str, hasta: str, previas: int) -> list[tuple[int, int, int]]:
    m0, d0 = map(int, desde.split("-"))
    m1, _ = map(int, hasta.split("-"))
    claves = set(anteriores(date(anio, m0, d0), previas + 1))
    for mes in range(m0, m1 + 1):
        for p in range(1, 7):
            claves.add(clave(anio, mes, p))
    return sorted(tuple(map(int, k.split("-"))) for k in claves)


def ejecutar() -> None:
    prm = parametros()
    tramos = leer_json("tramos.geojson")["features"]
    centros = {t["properties"]["id"]: shape(t["geometry"]).interpolate(0.5, normalized=True) for t in tramos}
    # Los tramos pueden salir del bbox de la zona (OSM devuelve el río completo): se usa su extensión real.
    from shapely.ops import unary_union

    oeste, sur, este, norte = unary_union([shape(t["geometry"]) for t in tramos]).bounds
    temporada = prm["periodo"]["temporada"]
    tareas = [x for a in prm["periodo"]["anios"] for x in pentadas_de_temporada(a, temporada["desde"], temporada["hasta"], prm["lluvia"]["pentadas_previas"])]

    def leer(t: tuple[int, int, int]):
        anio, mes, p = t
        url = prm["lluvia"]["url"].format(anio=anio, mes=mes, pentada=p)
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2"):
            with rasterio.open("/vsicurl/" + url) as src:
                w = from_bounds(oeste - 0.1, sur - 0.1, este + 0.1, norte + 0.1, transform=src.transform).round_offsets().round_lengths()
                a = src.read(1, window=w)
                tr = src.window_transform(w)
        vals = {}
        for tid, c in centros.items():
            col, fila = ~tr * (c.x, c.y)
            v = float(a[int(fila), int(col)])
            vals[tid] = None if v < 0 or np.isnan(v) else round(v, 1)  # CHIRPS usa -9999 como sin dato
        return clave(anio, mes, p), vals

    resultado: dict[str, dict[str, float | None]] = {tid: {} for tid in centros}
    with ThreadPoolExecutor(8) as ex:
        for i, (k, vals) in enumerate(ex.map(leer, tareas), 1):
            for tid, v in vals.items():
                resultado[tid][k] = v
            if i % 25 == 0:
                print(f"  {i}/{len(tareas)} pentadas")
    escribir_json("lluvia.json", resultado)
    registrar("lluvia", {"fuente": prm["lluvia"]["fuente"], "pentadas": len(tareas), "licencia": "ver README-CHIRPSv3.0.txt (citar Funk et al.)"})
    print(f"  {len(tareas)} pentadas leídas")
