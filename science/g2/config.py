from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
BRUTOS = RAIZ / "datos" / "brutos"
DERIVADOS = RAIZ / "datos" / "derivados"


def parametros() -> dict:
    return yaml.safe_load((RAIZ / "config" / "parametros.yaml").read_text())


def asegurar_carpetas() -> None:
    BRUTOS.mkdir(parents=True, exist_ok=True)
    DERIVADOS.mkdir(parents=True, exist_ok=True)


def commit() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=RAIZ, text=True).strip()
    except Exception:
        return None


def registrar(paso: str, datos: dict) -> None:
    """Manifiesto de la corrida: qué se calculó, cuándo, con qué parámetros y fuentes."""
    m = DERIVADOS / "manifiesto.json"
    actual = json.loads(m.read_text()) if m.exists() else {}
    actual[paso] = {"fecha": datetime.now(timezone.utc).isoformat(timespec="seconds"), "commit": commit(), **datos}
    m.write_text(json.dumps(actual, ensure_ascii=False, indent=2))


def leer_json(nombre: str):
    return json.loads((DERIVADOS / nombre).read_text())


def escribir_json(nombre: str, datos) -> Path:
    p = DERIVADOS / nombre
    p.write_text(json.dumps(datos, ensure_ascii=False, indent=1))
    return p
