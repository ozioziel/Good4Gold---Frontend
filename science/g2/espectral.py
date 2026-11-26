"""Gold2Spectral v0: indicadores espectrales por tramo con Sentinel-2 L2A (no es una red neuronal).

Por cada escena de la época seca y cada tramo se calculan, solo con píxeles válidos (sin nubes ni sombras):
  · NDTI en el agua (turbidez relativa: más alto = agua más cargada de sedimentos),
  · NDVI y BSI en la orilla (vegetación y suelo desnudo),
  · cuántos píxeles de agua hubo (los ríos estrechos tienen pocos: se informa).
Luego se resume por temporada y se compara cada año con los demás (z robusto). No mide mercurio.
"""
from __future__ import annotations

import json
import math
import statistics
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

import numpy as np
import rasterio
from pyproj import Transformer
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds
from shapely.geometry import shape
from shapely.ops import transform, unary_union

from .config import DERIVADOS, leer_json, parametros, registrar, escribir_json
from .lluvia import anteriores

BANDAS = {"blue": "B02", "green": "B03", "red": "B04", "nir": "B08", "swir16": "B11"}
GDAL = dict(
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
    GDAL_HTTP_MAX_RETRY="5",
    GDAL_HTTP_RETRY_DELAY="2",
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    GDAL_HTTP_MULTIPLEX="YES",
    VSI_CACHE="TRUE",
)


def nd(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Índice de diferencia normalizada (a - b) / (a + b), NaN donde no se puede calcular."""
    with np.errstate(divide="ignore", invalid="ignore"):
        r = (a - b) / (a + b)
    r[~np.isfinite(r)] = np.nan
    return r


def bsi(azul, rojo, nir, swir):
    """Índice de suelo desnudo: ((SWIR + rojo) − (NIR + azul)) / ((SWIR + rojo) + (NIR + azul))."""
    return nd(swir + rojo, nir + azul)


def z_robusto(x: float, referencia: list[float], mad_minimo: float) -> float | None:
    """Cuánto se aparta x de los demás años: (x − mediana) / (1.4826 · MAD)."""
    if len(referencia) == 0:
        return None
    med = statistics.median(referencia)
    mad = statistics.median([abs(r - med) for r in referencia]) if len(referencia) > 1 else 0.0
    return round((x - med) / max(1.4826 * mad, mad_minimo), 2)


def _mediana(v: np.ndarray) -> float | None:
    v = v[np.isfinite(v)]
    return round(float(np.median(v)), 4) if v.size else None


class Lector:
    """Lee una ventana del tramo en las bandas de una escena, en una grilla común de 20 m."""

    def __init__(self, item, prm, zonas):
        self.item, self.prm, self.zonas = item, prm, zonas

    def leer(self, tid: str):
        agua, tierra, caja = self.zonas[tid]
        a = self.item.assets
        with rasterio.Env(**GDAL):
            with rasterio.open(a["swir16"].href) as s20:
                w20 = from_bounds(*caja, transform=s20.transform).round_offsets().round_lengths()
                w20 = w20.intersection(Window(0, 0, s20.width, s20.height))
                if w20.width < 3 or w20.height < 3:
                    return None
                tr = s20.window_transform(w20)
                forma = (int(w20.height), int(w20.width))
                limites = rasterio.windows.bounds(w20, s20.transform)
                datos = {"swir16": s20.read(1, window=w20).astype("float32")}
            with rasterio.open(a["scl"].href) as s:
                scl = s.read(1, window=from_bounds(*limites, transform=s.transform).round_offsets().round_lengths(), out_shape=forma, resampling=Resampling.nearest)
            for k in ("blue", "green", "red", "nir"):
                # Bandas de 10 m: se abre la primera vista reducida del COG (20 m, ya promediada por el
                # productor) para descargar ~4 veces menos datos.
                with rasterio.open(a[k].href, overview_level=0) as s:
                    w = from_bounds(*limites, transform=s.transform).round_offsets().round_lengths()
                    datos[k] = s.read(1, window=w, out_shape=forma, resampling=Resampling.nearest).astype("float32")

        vacio = datos["green"] == 0
        for k, v in datos.items():
            banda = a[k].extra_fields.get("raster:bands", [{}])[0]
            v *= banda.get("scale", 1e-4)
            v += banda.get("offset", 0.0)
            v[vacio | (datos["swir16"] == 0)] = np.nan
        validos = np.isin(scl, self.prm["sentinel2"]["scl_validos"]) & ~np.isnan(datos["green"])
        en_agua = ~geometry_mask([agua.__geo_interface__], out_shape=forma, transform=tr)
        en_tierra = ~geometry_mask([tierra.__geo_interface__], out_shape=forma, transform=tr)
        mndwi = nd(datos["green"], datos["swir16"])
        es_agua = validos & en_agua & (mndwi > 0)
        es_orilla = validos & en_tierra & (mndwi <= 0)
        fraccion = float(validos[en_agua].mean()) if en_agua.any() else 0.0
        ndti = nd(datos["red"], datos["green"])
        ndvi = nd(datos["nir"], datos["red"])
        b = bsi(datos["blue"], datos["red"], datos["nir"], datos["swir16"])
        return {
            "px_agua": int(es_agua.sum()),
            "px_orilla": int(es_orilla.sum()),
            "fraccion_valida": round(fraccion, 3),
            "ndti_agua": _mediana(ndti[es_agua]),
            "mndwi_agua": _mediana(mndwi[es_agua]),
            "ndvi_orilla": _mediana(ndvi[es_orilla]),
            "bsi_orilla": _mediana(b[es_orilla]),
        }


def zonas_de_tramos(tramos, prm):
    crs = prm["zona"]["crs_metrico"]
    a_m = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    s = prm["sentinel2"]
    zonas, huellas = {}, {}
    for t in tramos:
        linea = transform(a_m, shape(t["geometry"]))
        agua = linea.buffer(s["agua_buffer_m"])
        tierra = linea.buffer(s["tierra_anillo_m"][1]).difference(linea.buffer(s["tierra_anillo_m"][0]))
        zonas[t["properties"]["id"]] = (agua, tierra, linea.buffer(s["tierra_anillo_m"][1]).bounds)
        huellas[t["properties"]["id"]] = shape(t["geometry"]).buffer(0.003)
    return zonas, huellas


def escenas(prm, tramos, anio):
    t = prm["periodo"]["temporada"]
    limites = unary_union([shape(x["geometry"]) for x in tramos]).bounds
    c = Client.open(prm["sentinel2"]["stac"])
    b = c.search(
        collections=[prm["sentinel2"]["coleccion"]],
        bbox=list(limites),
        datetime=f"{anio}-{t['desde']}/{anio}-{t['hasta']}",
        query={"eo:cloud_cover": {"lt": prm["sentinel2"]["nubes_max_escena"]}},
    )
    return list(b.items())


def calcular_escenas(prm, tramos) -> None:
    zonas, huellas = zonas_de_tramos(tramos, prm)
    crs_epsg = int(prm["zona"]["crs_metrico"].split(":")[1])
    salida = DERIVADOS / "espectral_escenas.jsonl"
    hechas = set()
    if salida.exists():
        for linea in salida.read_text().splitlines():
            r = json.loads(linea)
            hechas.add((r["escena"], r["tramo"]))
    candado = threading.Lock()
    for anio in prm["periodo"]["anios"]:
        items = escenas(prm, tramos, anio)
        tareas = []
        for it in items:
            if it.properties.get("proj:code", f"EPSG:{it.properties.get('proj:epsg')}") != f"EPSG:{crs_epsg}":
                continue  # todas las teselas de la zona son UTM 19S; otra proyección se omite
            huella = shape(it.geometry)
            for tid, h in huellas.items():
                if (it.id, tid) not in hechas and huella.intersects(h):
                    tareas.append((it, tid))
        print(f"  {anio}: {len(items)} escenas, {len(tareas)} lecturas pendientes")

        def hacer(it, tid):
            try:
                r = Lector(it, prm, zonas).leer(tid)
            except Exception as e:  # una ventana que falla no detiene la corrida; se registra
                r = {"error": str(e)[:200]}
            return it, tid, r

        with ThreadPoolExecutor(32) as ex, salida.open("a") as f:
            futuros = [ex.submit(hacer, it, tid) for it, tid in tareas]
            for i, fu in enumerate(as_completed(futuros), 1):
                it, tid, r = fu.result()
                if r is None:
                    r = {"px_agua": 0}
                fila = {
                    "escena": it.id,
                    "tramo": tid,
                    "fecha": it.datetime.date().isoformat(),
                    "nubes": it.properties.get("eo:cloud_cover"),
                    "baseline": it.properties.get("s2:processing_baseline"),
                    **r,
                }
                with candado:
                    f.write(json.dumps(fila) + "\n")
                    f.flush()
                if i % 200 == 0:
                    f.flush()
                    print(f"    {i}/{len(tareas)}")


def resumir(prm, tramos) -> dict:
    s = prm["sentinel2"]
    an = prm["anomalia"]
    lluvia = leer_json("lluvia.json")
    filas = [json.loads(x) for x in (DERIVADOS / "espectral_escenas.jsonl").read_text().splitlines()]
    utiles: dict[tuple[str, int], list[dict]] = {}
    errores = 0
    for r in filas:
        if "error" in r:
            errores += 1
            continue
        if r.get("px_agua", 0) < s["min_pixeles_agua"] or r.get("fraccion_valida", 0) < s["min_fraccion_valida"] or r.get("ndti_agua") is None:
            continue
        d = date.fromisoformat(r["fecha"])
        previas = [lluvia.get(r["tramo"], {}).get(k) for k in anteriores(d, prm["lluvia"]["pentadas_previas"])]
        r["lluvia_previa_mm"] = round(sum(v for v in previas if v is not None), 1) if all(v is not None for v in previas) else None
        utiles.setdefault((r["tramo"], d.year), []).append(r)

    res: dict[str, dict] = {}
    for t in tramos:
        tid = t["properties"]["id"]
        por_anio = {}
        for anio in prm["periodo"]["anios"]:
            esc = utiles.get((tid, anio), [])
            # Una fecha puede repetirse en dos teselas: se queda la lectura con más agua.
            por_fecha = {}
            for e in esc:
                if e["fecha"] not in por_fecha or e["px_agua"] > por_fecha[e["fecha"]]["px_agua"]:
                    por_fecha[e["fecha"]] = e
            esc = list(por_fecha.values())
            med = lambda k: round(statistics.median([e[k] for e in esc if e.get(k) is not None]), 4) if any(e.get(k) is not None for e in esc) else None
            por_anio[anio] = {
                "escenas": len(esc),
                "suficiente": len(esc) >= an["min_escenas_temporada"],
                "px_agua_mediana": int(statistics.median([e["px_agua"] for e in esc])) if esc else 0,
                "ndti_agua": med("ndti_agua"),
                "ndvi_orilla": med("ndvi_orilla"),
                "bsi_orilla": med("bsi_orilla"),
                "lluvia_previa_mm": med("lluvia_previa_mm"),
                "fechas": sorted(por_fecha),
            }
        # Anomalías: cada año contra los demás años suficientes del mismo tramo y temporada.
        for anio, v in por_anio.items():
            for k in ("ndti_agua", "bsi_orilla", "lluvia_previa_mm"):
                otros = [o[k] for a, o in por_anio.items() if a != anio and o["suficiente"] and o[k] is not None]
                ok = v["suficiente"] and v[k] is not None and len(otros) >= an["min_anios_referencia"]
                minimo = an["mad_minimo"] if k != "lluvia_previa_mm" else 5.0
                v[f"z_{k}"] = z_robusto(v[k], otros, minimo) if ok else None
        res[tid] = por_anio
    print(f"  lecturas: {len(filas)} · útiles: {sum(len(v) for v in utiles.values())} · con error: {errores}")
    return res


def ejecutar() -> None:
    prm = parametros()
    tramos = leer_json("tramos.geojson")["features"]
    calcular_escenas(prm, tramos)
    res = resumir(prm, tramos)
    escribir_json("espectral.json", res)
    registrar(
        "espectral",
        {
            "fuente": "Sentinel-2 L2A Collection 1 (Copernicus, Earth Search / Element 84)",
            "coleccion": prm["sentinel2"]["coleccion"],
            "temporada": prm["periodo"]["temporada"],
            "anios": prm["periodo"]["anios"],
            "indices": {"NDTI": "(B04-B03)/(B04+B03) en agua", "NDVI": "(B08-B04)/(B08+B04) en orilla", "BSI": "((B11+B04)-(B08+B02))/((B11+B04)+(B08+B02)) en orilla", "MNDWI": "(B03-B11)/(B03+B11) > 0 = agua"},
        },
    )
