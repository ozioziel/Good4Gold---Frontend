"""Gold2Mining v0: huella minera por tramo y año con el ráster de cicatrices de Amazon Mining Watch.

No entrenamos un detector propio: reutilizamos AMW (CC BY 4.0, 10 m). Cada píxel con valor es una
cicatriz minera confirmada en ese año (o trimestre: 20251 = 1.er trimestre de 2025). Se suma el área
dentro de una franja de 3 km alrededor de cada tramo; las franjas no se solapan entre tramos.
Detectar minería no prueba uso de mercurio: solo orienta dónde investigar.
"""
from __future__ import annotations

import math
from collections import defaultdict

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
from shapely.geometry import shape
from shapely.ops import transform, unary_union

from .config import leer_json, parametros, registrar, escribir_json


def anio_de(valor: int) -> tuple[int | None, bool]:
    """Valor del píxel → (año, es_trimestral). 0 = sin minería."""
    if valor <= 0:
        return None, False
    if valor >= 10000:  # AAAAQ
        return valor // 10, True
    return valor, False


def area_pixel_m2(lat: float, res_grados: float) -> float:
    return (res_grados * 111_320 * math.cos(math.radians(lat))) * (res_grados * 110_574)


def zonas_disjuntas(tramos: list[dict], km: float, a_m, a_geo) -> dict[str, object]:
    """Franja de `km` a cada lado de cada tramo, recortada para no repetir área ya asignada."""
    asignada = None
    zonas = {}
    for t in tramos:
        linea = transform(a_m, shape(t["geometry"]))
        z = linea.buffer(km * 1000)
        if asignada is not None:
            z = z.difference(asignada)
        asignada = z if asignada is None else unary_union([asignada, z])
        zonas[t["properties"]["id"]] = transform(a_geo, z)
    return zonas


def ejecutar() -> None:
    p = parametros()
    crs = p["zona"]["crs_metrico"]
    a_m = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    a_geo = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform
    tramos = leer_json("tramos.geojson")["features"]
    zonas = zonas_disjuntas(tramos, p["mineria"]["zona_km"], a_m, a_geo)
    anios = p["periodo"]["anios"]

    resultado = {}
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2"):
        with rasterio.open("/vsicurl/" + p["mineria"]["url"]) as src:
            res = src.res[0]
            for tid, zona in zonas.items():
                if zona.is_empty:
                    continue
                w = from_bounds(*zona.bounds, transform=src.transform).round_offsets().round_lengths()
                datos = src.read(1, window=w, boundless=True, fill_value=0)
                tr = src.window_transform(w)
                dentro = ~geometry_mask([zona.__geo_interface__], out_shape=datos.shape, transform=tr)
                filas_lat = tr.f + tr.e * (np.arange(datos.shape[0]) + 0.5)
                area_fila = np.array([area_pixel_m2(lat, res) for lat in filas_lat])
                por_anio: dict[int, float] = defaultdict(float)
                provisional = 0.0
                valores, filas = datos[dentro], np.nonzero(dentro)[0]
                for v in np.unique(valores):
                    anio, trimestral = anio_de(int(v))
                    if anio is None:
                        continue
                    ha = float(area_fila[filas[valores == v]].sum()) / 10_000
                    if anio > max(anios):
                        provisional += ha  # trimestres posteriores al periodo: se informan aparte
                    else:
                        por_anio[anio] += ha
                acumulada = {a: round(sum(h for y, h in por_anio.items() if y <= a), 2) for a in anios}
                resultado[tid] = {
                    "ha_nueva_por_anio": {a: round(h, 2) for a, h in sorted(por_anio.items())},
                    "ha_acumulada": acumulada,
                    "ha_posterior_provisional": round(provisional, 2),
                    "zona_km2": round(transform(a_m, zona).area / 1e6, 1),
                }
                print(f"  {tid:<14} acumulada {max(anios)}: {acumulada[max(anios)]:>9.1f} ha")
    escribir_json("mineria.json", resultado)
    registrar("mineria", {"fuente": p["mineria"]["fuente"], "url": p["mineria"]["url"], "zona_km": p["mineria"]["zona_km"], "tramos": len(resultado)})
