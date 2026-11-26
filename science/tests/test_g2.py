"""Pruebas de las piezas puras del laboratorio virtual (sin red)."""
from datetime import date

import numpy as np
from shapely.geometry import LineString

from g2.espectral import bsi, nd, z_robusto
from g2.lluvia import anteriores, pentada
from g2.mineria import anio_de
from g2.riesgo import evaluar
from g2.tramos import aguas_arriba, normalizar_rio, partir

AN = {"z_umbral": 2.0, "min_escenas_temporada": 3}
R = {"mineria_nueva_ha_alta": 20, "mineria_total_ha_media": 50, "lluvia_z_explica": 1.5, "persistencia": {"temporadas": 3, "minimo": 2}}


def test_indices():
    a, b = np.array([0.3, 0.0, 0.1]), np.array([0.1, 0.0, 0.1])
    r = nd(a, b)
    assert r[0] == np.float32(0.5) or abs(r[0] - 0.5) < 1e-6
    assert np.isnan(r[1])  # 0/0 no es un valor
    assert r[2] == 0
    assert bsi(np.array([0.1]), np.array([0.2]), np.array([0.1]), np.array([0.3]))[0] > 0  # suelo desnudo


def test_z_robusto():
    assert z_robusto(0.10, [0.05, 0.05, 0.05], 0.01) == 5.0  # MAD 0 → se usa el mínimo
    assert z_robusto(0.05, [0.04, 0.05, 0.06], 0.01) == 0.0
    assert z_robusto(1, [], 0.01) is None


def test_pentadas():
    assert pentada(date(2024, 7, 5)) == 1 and pentada(date(2024, 7, 6)) == 2 and pentada(date(2024, 7, 31)) == 6
    assert anteriores(date(2024, 7, 3), 2) == ["2024-06-6", "2024-06-5"]
    assert anteriores(date(2024, 1, 2), 1) == ["2023-12-6"]


def test_anios_de_amw():
    assert anio_de(0) == (None, False)
    assert anio_de(2021) == (2021, False)
    assert anio_de(20253) == (2025, True)


def test_tramos():
    assert normalizar_rio("Rio Kaka") == "Kaka" and normalizar_rio("Río Alto Beni") == "Alto Beni"
    partes = partir(LineString([(0, 0), (31_000, 0)]), 15_000)
    assert len(partes) == 2 and abs(partes[0].length - 15_500) < 1
    assert partes[0].coords[0] == (0, 0)  # conserva el sentido del flujo
    arriba = aguas_arriba({"a": "c", "b": "c", "c": "d", "d": None})
    assert arriba["d"] == ["a", "b", "c"] and arriba["a"] == []


def _esp(zs, suficiente=True, lluvia=None):
    return {str(a): {"suficiente": suficiente, "escenas": 5 if suficiente else 1, "z_ndti_agua": z, "z_lluvia_previa_mm": lluvia, "lluvia_previa_mm": 3.0} for a, z in zs.items()}


def test_riesgo_reglas():
    tramos = {"t": {"aguas_arriba": ["u"]}, "u": {"aguas_arriba": []}}
    mineria = {"u": {"ha_acumulada": {"2023": 10.0, "2025": 80.0}}, "t": {"ha_acumulada": {"2023": 0, "2025": 0}}}
    alta = evaluar("t", 2025, tramos, mineria, {"t": _esp({2023: 2.5, 2024: 0.1, 2025: 3.0})}, R, AN)
    assert alta["prioridad"] == "alta" and {x["id"] for x in alta["reglas"]} == {"R1", "R2", "R3"}
    # La misma turbidez, pero con lluvia anómala: no se atribuye a la minería.
    lluvia = evaluar("t", 2025, tramos, mineria, {"t": _esp({2023: 2.5, 2024: 0.1, 2025: 3.0}, lluvia=2.0)}, R, AN)
    assert lluvia["prioridad"] == "media" and {x["id"] for x in lluvia["reglas"]} == {"R2"}
    # Sin minería y sin escenas suficientes: no se puede decir «baja».
    sin = evaluar("u", 2025, {"u": {"aguas_arriba": []}}, {}, {"u": _esp({2025: None}, suficiente=False)}, R, AN)
    assert sin["prioridad"] == "insuficiente" and sin["faltantes"]
    baja = evaluar("u", 2025, {"u": {"aguas_arriba": []}}, {}, {"u": _esp({2023: 0.2, 2024: 0.1, 2025: 0.3})}, R, AN)
    assert baja["prioridad"] == "baja"
