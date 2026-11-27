"""Validación de Gold2Spectral contra sedimentos en suspensión de Dethier et al. (2023).

Dethier publica sedimentos en mg/L, estimados con Landsat y calibrados con mediciones de campo, cada
10 km a lo largo de perfiles que parten de zonas mineras y bajan por el río. Desde el punto de inicio
de cada perfil se recorre nuestra red de tramos en el sentido del flujo, sumando kilómetros, para
asignar cada valor a su tramo. Luego se compara, por tramo y época seca (2019–2021), la mediana de
sedimentos con nuestro NDTI del agua. No es validación con mediciones directas de campo.
"""
from __future__ import annotations

import csv
import math
import statistics

from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform

from .config import RAIZ, leer_json, parametros, registrar, escribir_json

INICIOS = {"bolivia_mapiri_agm_region": (-68.3096860392093, -15.3062936134812), "bolivia_mayaya_agm_region": (-68.0236618308828, -15.5654798787051)}
MESES_SECOS = (6, 7, 8, 9)


def pearson(a: list[float], b: list[float]) -> float:
    ma, mb = statistics.mean(a), statistics.mean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den


def rangos(x: list[float]) -> list[float]:
    orden = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    for k, i in enumerate(orden):
        r[i] = float(k)
    return r


def recorrido(tramos: dict, a_m, lon: float, lat: float):
    """Tramos río abajo desde el inicio del perfil, con su rango de km dentro del perfil."""
    p = Point(a_m(lon, lat))
    tid = min(tramos, key=lambda t: tramos[t]["g"].distance(p))
    km = -tramos[tid]["g"].project(p) / 1000
    ruta = []
    while tid:
        largo = tramos[tid]["longitud_km"]
        ruta.append((tid, km, km + largo))
        km += largo
        tid = tramos[tid]["desemboca_en"]
    return ruta


def ejecutar() -> None:
    prm = parametros()
    a_m = Transformer.from_crs("EPSG:4326", prm["zona"]["crs_metrico"], always_xy=True).transform
    tramos = {f["properties"]["id"]: {**f["properties"], "g": transform(a_m, shape(f["geometry"]))} for f in leer_json("tramos.geojson")["features"]}
    espectral = leer_json("espectral.json")
    anios = [a for a in prm["periodo"]["anios"] if a <= 2021]  # la serie de Dethier llega a 2021
    filas = [r for r in csv.DictReader(open(RAIZ / "datos" / "externos" / "dethier2023_bolivia_ssc.csv")) if int(r["month"]) in MESES_SECOS and int(r["year"]) in anios]

    pares = []
    for sitio, (lon, lat) in INICIOS.items():
        for tid, k0, k1 in recorrido(tramos, a_m, lon, lat):
            for anio in anios:
                v = [float(r["SSC_mgL"]) for r in filas if r["site_no"] == sitio and int(r["year"]) == anio and k0 <= float(r["distance_10km"]) < k1]
                e = espectral.get(tid, {}).get(str(anio), {})
                if v and e.get("suficiente") and e.get("ndti_agua") is not None:
                    pares.append({"perfil": sitio, "tramo": tid, "anio": anio, "ssc_mgL": round(statistics.median(v), 1), "n_ssc": len(v), "ndti_agua": e["ndti_agua"]})

    ssc = [p["ssc_mgL"] for p in pares]
    ndti = [p["ndti_agua"] for p in pares]
    res = {
        "n_pares": len(pares),
        "pearson_log_ssc_vs_ndti": round(pearson([math.log10(x) for x in ssc], ndti), 2),
        "spearman": round(pearson(rangos(ssc), rangos(ndti)), 2),
        "anios": anios,
        "pares": pares,
        "lectura": "Relación positiva débil a moderada. NDTI tiende a saturarse con sedimentos altos (cientos de mg/L) y las dos series vienen de sensores, fechas y métodos distintos.",
    }
    escribir_json("validacion_dethier.json", res)
    registrar("validacion", {"fuente": "Dethier et al. 2023 (Zenodo 7699122, CC BY 4.0)", "n_pares": res["n_pares"], "pearson_log": res["pearson_log_ssc_vs_ndti"], "spearman": res["spearman"]})
    print(f"  {res['n_pares']} pares · Pearson r (log SSC vs NDTI) = {res['pearson_log_ssc_vs_ndti']} · Spearman ρ = {res['spearman']}")
