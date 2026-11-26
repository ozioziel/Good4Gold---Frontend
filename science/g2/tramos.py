"""Tramos de río a partir de OpenStreetMap.

En OSM los ríos se dibujan en el sentido del flujo: eso permite cortar cada río en tramos de ~15 km
ordenados de aguas arriba a aguas abajo y saber qué tramos desembocan en cuáles (para sumar la
minería «aguas arriba»). Es una aproximación v0: no reemplaza un modelo hidrológico.
"""
from __future__ import annotations

import json
import re
import unicodedata

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping
from shapely.ops import linemerge, substring, transform

from .config import BRUTOS, parametros, registrar, escribir_json


def normalizar_rio(nombre: str) -> str:
    """«Río Kaka» / «Rio Kaka» → «Kaka»."""
    n = unicodedata.normalize("NFC", nombre).strip()
    return re.sub(r"^R[íi]o\s+", "", n)


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def partir(linea: LineString, largo_m: float) -> list[LineString]:
    """Corta una línea (en metros) en tramos de largo parecido, sin dejar un último tramo diminuto."""
    n = max(1, round(linea.length / largo_m))
    paso = linea.length / n
    return [substring(linea, i * paso, (i + 1) * paso) for i in range(n)]


def grafo_aguas_abajo(tramos: list[dict], union_m: float) -> dict[str, str | None]:
    """Para cada tramo, el tramo donde desemboca: el más cercano a su punto final (sin ser él mismo)."""
    destino: dict[str, str | None] = {}
    for t in tramos:
        fin = Point(t["geom_m"].coords[-1])
        mejor, dist = None, union_m
        for o in tramos:
            if o["id"] == t["id"]:
                continue
            d = o["geom_m"].distance(fin)
            # El punto final no puede coincidir con el inicio de otro tramo del mismo río ya posterior a él
            # si ese tramo es el siguiente: está bien; si es otro río, es una confluencia.
            if d < dist and Point(o["geom_m"].coords[-1]).distance(fin) > 1:
                mejor, dist = o["id"], d
        destino[t["id"]] = mejor
    return destino


def aguas_arriba(destino: dict[str, str | None]) -> dict[str, list[str]]:
    """Todos los tramos que, siguiendo el flujo, llegan a cada tramo."""
    entrantes: dict[str, list[str]] = {k: [] for k in destino}
    for origen, dest in destino.items():
        if dest:
            entrantes[dest].append(origen)
    res: dict[str, list[str]] = {}
    for t in destino:
        vistos, pila = set(), list(entrantes[t])
        while pila:
            x = pila.pop()
            if x in vistos or x == t:
                continue
            vistos.add(x)
            pila.extend(entrantes[x])
        res[t] = sorted(vistos)
    return res


def construir() -> list[dict]:
    p = parametros()
    crs = p["zona"]["crs_metrico"]
    a_m = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    a_geo = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform
    osm = json.loads((BRUTOS / "osm_rios.json").read_text())

    por_rio: dict[str, list[LineString]] = {}
    for e in osm["elements"]:
        rio = normalizar_rio(e["tags"].get("name", ""))
        if rio not in p["rios"]:
            continue
        por_rio.setdefault(rio, []).append(LineString([(g["lon"], g["lat"]) for g in e["geometry"]]))

    tramos: list[dict] = []
    for rio, lineas in sorted(por_rio.items()):
        # directed=True: no invierte lineas; conserva el sentido del flujo de OSM.
        unidas = linemerge(MultiLineString(lineas), directed=True)
        partes = list(unidas.geoms) if isinstance(unidas, MultiLineString) else [unidas]
        partes_m = sorted((transform(a_m, x) for x in partes), key=lambda g: -g.length)
        n = 0
        for parte in partes_m:
            if parte.length < 2000:  # restos de pocos metros (islas, brazos): se descartan
                continue
            for seg in partir(parte, p["tramos"]["longitud_km"] * 1000):
                n += 1
                tramos.append({"id": f"{slug(rio)}-{n:02d}", "rio": rio, "fuente_id": p["rios"][rio], "orden": n, "geom_m": seg})

    destino = grafo_aguas_abajo(tramos, p["tramos"]["union_m"])
    arriba = aguas_arriba(destino)
    for t in tramos:
        t["desemboca_en"] = destino[t["id"]]
        t["aguas_arriba"] = arriba[t["id"]]
        t["longitud_km"] = round(t["geom_m"].length / 1000, 2)
    return tramos, a_geo


def ejecutar() -> None:
    tramos, a_geo = construir()
    fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": mapping(transform(a_geo, t["geom_m"])),
                "properties": {k: v for k, v in t.items() if k != "geom_m"},
            }
            for t in tramos
        ],
    }
    escribir_json("tramos.geojson", fc)
    osm = json.loads((BRUTOS / "osm_rios.json").read_text())
    registrar(
        "tramos",
        {
            "fuente": "OpenStreetMap (Overpass), ODbL",
            "osm_fecha": osm.get("osm3s", {}).get("timestamp_osm_base"),
            "tramos": len(tramos),
            "por_rio": {r: sum(1 for t in tramos if t["rio"] == r) for r in sorted({t["rio"] for t in tramos})},
        },
    )
    print(f"{len(tramos)} tramos")
    for t in tramos:
        print(f"  {t['id']:<14} {t['longitud_km']:>6} km → {t['desemboca_en'] or '—':<14} aguas arriba: {len(t['aguas_arriba'])}")
