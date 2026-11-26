"""Gold2Risk v0: prioridad de muestreo por tramo con reglas explicables (sin pesos ni probabilidades).

Resultado por tramo y temporada: alta · media · baja · información insuficiente, con las reglas que se
cumplieron, los datos usados y lo que faltó. Es PRIORIDAD DE INVESTIGACIÓN, no confirmación:
«baja» no significa ausencia de mercurio ni agua segura. Umbrales v0 pendientes de revisión.
"""
from __future__ import annotations

from .config import leer_json, parametros, registrar, escribir_json


def mineria_aguas_arriba(tid: str, tramos: dict, mineria: dict, anio: int) -> float:
    """Hectáreas acumuladas hasta `anio` en el tramo y en todos los tramos aguas arriba."""
    ids = [tid, *tramos[tid]["aguas_arriba"]]
    return round(sum(mineria.get(i, {}).get("ha_acumulada", {}).get(str(anio), 0.0) for i in ids), 1)


def evaluar(tid: str, anio: int, tramos: dict, mineria: dict, espectral: dict, r: dict, an: dict) -> dict:
    esp = espectral.get(tid, {})
    actual = esp.get(str(anio), {})
    total = mineria_aguas_arriba(tid, tramos, mineria, anio)
    nueva = round(total - mineria_aguas_arriba(tid, tramos, mineria, anio - 2), 1)

    def anomalia_no_explicada(a: int) -> bool | None:
        v = esp.get(str(a), {})
        z, zl = v.get("z_ndti_agua"), v.get("z_lluvia_previa_mm")
        if z is None:
            return None
        if z < an["z_umbral"]:
            return False
        # Si la lluvia previa también fue anómala, la turbidez podría ser natural: no se cuenta.
        return not (zl is not None and zl >= r["lluvia_z_explica"])

    ventana = [anomalia_no_explicada(a) for a in range(anio - r["persistencia"]["temporadas"] + 1, anio + 1)]
    persistente = sum(1 for x in ventana if x) >= r["persistencia"]["minimo"]
    ahora = anomalia_no_explicada(anio)

    reglas, faltantes = [], []
    if not actual.get("suficiente"):
        faltantes.append(f"menos de {an['min_escenas_temporada']} escenas útiles en la temporada {anio}")
    elif actual.get("z_ndti_agua") is None:
        faltantes.append("pocos años de referencia para comparar la turbidez")
    if actual.get("lluvia_previa_mm") is None and actual.get("suficiente"):
        faltantes.append("lluvia previa")

    if nueva >= r["mineria_nueva_ha_alta"] and persistente:
        reglas.append({"id": "R1", "prioridad": "alta", "texto": f"{nueva} ha de minería nueva aguas arriba en 2 años y turbidez anómala persistente no explicada por lluvia"})
    if total >= r["mineria_total_ha_media"]:
        reglas.append({"id": "R2", "prioridad": "media", "texto": f"{total} ha de huella minera acumulada aguas arriba (≥ {r['mineria_total_ha_media']})"})
    if ahora:
        reglas.append({"id": "R3", "prioridad": "media", "texto": f"turbidez anómala en {anio} (z = {actual.get('z_ndti_agua')}) no explicada por lluvia"})

    if any(x["prioridad"] == "alta" for x in reglas):
        prioridad = "alta"
    elif reglas:
        prioridad = "media"
    elif faltantes:
        prioridad = "insuficiente"  # sin datos no se puede decir «baja»
    else:
        prioridad = "baja"
    return {
        "prioridad": prioridad,
        "reglas": reglas,
        "faltantes": faltantes,
        "datos": {
            "mineria_aguas_arriba_ha": total,
            "mineria_nueva_2a_ha": nueva,
            "escenas": actual.get("escenas", 0),
            "z_ndti_agua": actual.get("z_ndti_agua"),
            "z_lluvia_previa": actual.get("z_lluvia_previa_mm"),
            "anomalia_persistente": persistente,
        },
    }


def ejecutar() -> None:
    p = parametros()
    tramos = {f["properties"]["id"]: f["properties"] for f in leer_json("tramos.geojson")["features"]}
    mineria = leer_json("mineria.json")
    espectral = leer_json("espectral.json")
    anios = p["periodo"]["anios"]
    evaluados = anios[p["riesgo"]["persistencia"]["temporadas"] - 1 :]
    res = {tid: {a: evaluar(tid, a, tramos, mineria, espectral, p["riesgo"], p["anomalia"]) for a in evaluados} for tid in tramos}
    escribir_json("riesgo.json", res)
    ultimo = max(evaluados)
    conteo: dict[str, int] = {}
    for v in res.values():
        conteo[v[ultimo]["prioridad"]] = conteo.get(v[ultimo]["prioridad"], 0) + 1
    registrar("riesgo", {"version": p["riesgo"]["version"], "umbrales": p["riesgo"], "anios": evaluados, f"prioridades_{ultimo}": conteo})
    print(f"  {ultimo}: {conteo}")
