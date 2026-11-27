"""Uso: uv run python -m g2 <paso>   (tramos | mineria | lluvia | espectral | riesgo | cargar | validacion | todo)"""
import sys

from .config import asegurar_carpetas

PASOS = ["tramos", "mineria", "lluvia", "espectral", "riesgo", "cargar", "validacion"]


def main() -> None:
    asegurar_carpetas()
    pedido = sys.argv[1] if len(sys.argv) > 1 else ""
    pasos = PASOS if pedido == "todo" else [pedido]
    if not pasos[0] or any(x not in PASOS for x in pasos):
        print(__doc__)
        sys.exit(1)
    for paso in pasos:
        print(f"== {paso}")
        __import__(f"g2.{paso}", fromlist=["ejecutar"]).ejecutar()


main()
