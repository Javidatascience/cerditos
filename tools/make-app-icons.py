"""Genera los iconos de la app (PNG de la PWA y favicon SVG) con el cerdito en pixel art sobre cielo y hierba.

Uso:  python tools/make-app-icons.py
Parte de public/pig/rosa.png (ver tools/make-pig-pixel.py). Salida: public/icons/*.png y public/favicon.svg.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SKY = (169, 220, 239, 255)
GRASS = (120, 194, 94, 255)
INK = (52, 33, 26, 255)


def icon(size: int, pig: Image.Image, fill: float) -> Image.Image:
    """Icono cuadrado: cielo, hierba y el cerdito con escala entera (píxeles nítidos). `fill`: ancho del cerdito / lado."""
    img = Image.new('RGBA', (size, size), SKY)
    grass_top = int(size * 0.7)
    for y in range(grass_top, size):
        for x in range(size):
            img.putpixel((x, y), GRASS)
    scale = max(1, round(size * fill / pig.width))
    big = pig.resize((pig.width * scale, pig.height * scale), Image.NEAREST)
    x = (size - big.width) // 2
    y = int(size * 0.84) - big.height
    img.paste(big, (x, y), big)
    return img


def favicon_svg(pig: Image.Image) -> str:
    """SVG con un rectángulo por cada tramo horizontal de píxeles del cerdito (se ve nítido a cualquier tamaño)."""
    w, h = 32, 32
    ox, oy = 0, 8
    rects = [f'<rect width="{w}" height="22" fill="#a9dcef"/>', f'<rect y="22" width="{w}" height="10" fill="#78c25e"/>']
    for y in range(pig.height):
        x = 0
        while x < pig.width:
            p = pig.getpixel((x, y))
            if p[3] == 0:
                x += 1
                continue
            start = x
            while x < pig.width and pig.getpixel((x, y)) == p:
                x += 1
            rects.append(f'<rect x="{ox + start}" y="{oy + y}" width="{x - start}" height="1" fill="#{p[0]:02x}{p[1]:02x}{p[2]:02x}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">' + ''.join(rects) + '</svg>\n'


def main() -> None:
    pig = Image.open(ROOT / 'public' / 'pig' / 'rosa.png').convert('RGBA')
    out = ROOT / 'public' / 'icons'
    out.mkdir(parents=True, exist_ok=True)
    icon(192, pig, 0.66).save(out / 'icon-192.png')
    icon(512, pig, 0.66).save(out / 'icon-512.png')
    icon(180, pig, 0.66).save(out / 'apple-touch-icon-180.png')
    icon(512, pig, 0.5).save(out / 'icon-maskable-512.png')  # dentro de la zona segura del icono adaptable
    (ROOT / 'public' / 'favicon.svg').write_text(favicon_svg(pig), encoding='utf-8')
    print('iconos generados')


if __name__ == '__main__':
    main()
