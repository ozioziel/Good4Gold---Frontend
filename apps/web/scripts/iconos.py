"""Genera los íconos PNG de la PWA (public/icons) con el mismo dibujo del favicon: lingote, gota y río.
Uso: python -I scripts/iconos.py"""
from pathlib import Path
from PIL import Image, ImageDraw

SALIDA = Path(__file__).resolve().parent.parent / "public" / "icons"
NOCHE, ORO, ORO_CLARO, PLATA, RIO = "#181A17", "#D4AF55", "#E8CB7E", "#A4ADB3", "#8FB4C7"


def icono(lado: int, margen: float) -> Image.Image:
    escala = 4
    L = lado * escala
    im = Image.new("RGBA", (L, L), NOCHE)
    d = ImageDraw.Draw(im)
    m = L * margen
    u = (L - 2 * m) / 64  # el dibujo se pensó en 64 unidades

    def p(x, y):
        return (m + x * u, m + y * u)

    d.ellipse([p(40, 14), p(52, 26)], fill=PLATA)
    d.polygon([p(10, 42), p(19, 27), p(45, 27), p(54, 42)], fill=ORO)
    d.polygon([p(19, 27), p(45, 27), p(42.4, 22.8), p(21.6, 22.8)], fill=ORO_CLARO)
    d.line([p(6, 53), p(18, 49), p(26, 56), p(38, 51), p(50, 49), p(58, 51)], fill=RIO, width=int(3.6 * u), joint="curve")
    return im.resize((lado, lado), Image.LANCZOS)


SALIDA.mkdir(parents=True, exist_ok=True)
icono(192, 0.06).save(SALIDA / "icon-192.png")
icono(512, 0.06).save(SALIDA / "icon-512.png")
icono(512, 0.18).save(SALIDA / "maskable-512.png")  # zona segura para íconos adaptables
icono(180, 0.08).save(SALIDA / "apple-touch-icon.png")
print("iconos listos:", sorted(p.name for p in SALIDA.iterdir()))
