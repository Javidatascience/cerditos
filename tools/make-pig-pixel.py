"""Dibuja el cerdito picador en pixel art de verdad (rejilla pequeña, contorno grueso, pocos colores).

Uso:  python tools/make-pig-pixel.py [--out carpeta] [--preview ruta.png]

No parte de ninguna imagen: construye la figura con formas sencillas sobre una rejilla de 36x26 píxeles,
dibuja el contorno automáticamente y genera una variante por cada piel de src/content/game.ts
(el color de la piel manda: el claro, el oscuro y la nariz salen de él). Salida: public/pig/<piel>.png.
"""

import colorsys
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
W, H = 36, 26
OUTLINE = (52, 24, 38, 255)


def mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def vivid(skin):
    """Las pieles del juego son pasteles; en pixel art con contorno negro queda mejor algo más saturado."""
    h, l, sat = colorsys.rgb_to_hls(*(c / 255 for c in skin))
    r, g, b = colorsys.hls_to_rgb(h, max(0.0, l - 0.08), min(1.0, sat * 1.7))
    return (int(r * 255), int(g * 255), int(b * 255))


def palette(skin):
    skin = vivid(skin)
    return {
        'p': skin,
        'l': mix(skin, (255, 255, 255), 0.55),
        'd': mix(skin, (60, 20, 40), 0.28),
        'n': mix(skin, (60, 20, 40), 0.42),
        'e': (30, 14, 24),
        'w': (255, 255, 255),
    }


def ellipse(grid, cx, cy, rx, ry, ch):
    for y in range(H):
        for x in range(W):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                grid[y][x] = ch


def rect(grid, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            grid[y][x] = ch


def build():
    g = [['.'] * W for _ in range(H)]
    # patas (las de atrás, algo más oscuras)
    rect(g, 6, 18, 10, 22, 'd')
    rect(g, 17, 18, 21, 22, 'd')
    rect(g, 11, 18, 15, 23, 'p')
    rect(g, 23, 18, 27, 23, 'p')
    # cuerpo y cabeza
    ellipse(g, 15, 13, 12, 7.5, 'p')
    ellipse(g, 26, 12, 7, 6.5, 'p')
    # oreja
    for y, (x0, x1) in zip(range(3, 8), [(23, 24), (22, 25), (22, 26), (22, 27), (23, 27)]):
        rect(g, x0, y, x1, y, 'p')
    rect(g, 23, 5, 25, 7, 'd')
    # hocico
    rect(g, 31, 11, 34, 15, 'l')
    rect(g, 31, 10, 33, 10, 'l')
    rect(g, 32, 12, 32, 13, 'n')
    rect(g, 34, 12, 34, 13, 'n')
    # barriga clara
    for y in range(H):
        for x in range(W):
            if g[y][x] == 'p' and ((x - 15) / 8.5) ** 2 + ((y - 17.5) / 3) ** 2 <= 1 and x < 23:
                g[y][x] = 'l'
    # sombreado inferior del cuerpo y brillo del lomo
    for x in range(5, 24):
        if g[19][x] == 'p' or g[18][x] == 'p':
            g[18][x] = 'd' if g[18][x] == 'p' else g[18][x]
    rect(g, 9, 7, 13, 7, 'l')
    # ojo y mejilla
    g[9][28] = 'e'
    g[10][28] = 'e'
    g[9][29] = 'w'
    g[13][28] = 'd'
    g[13][29] = 'd'
    # rabito
    for x, y in [(3, 11), (2, 10), (2, 9), (3, 8), (4, 8), (4, 9)]:
        g[y][x] = 'p'
    return g


def outline(g):
    out = [row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and g[ny][nx] != '.':
                    out[y][x] = 'K'
                    break
    return out


def render(g, skin):
    pal = palette(skin)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            ch = g[y][x]
            if ch == 'K':
                img.putpixel((x, y), OUTLINE)
            elif ch != '.':
                img.putpixel((x, y), pal[ch] + (255,))
    return img.crop(img.getbbox())


def main() -> None:
    args = sys.argv[1:]
    out_dir = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'public' / 'pig'
    grid = outline(build())
    skins = re.findall(r"id: '([a-z-]+)', name: '[^']*', flavor: '[^']*', color: '(#[0-9a-fA-F]{6})'", (ROOT / 'src/content/game.ts').read_text(encoding='utf-8'))
    out_dir.mkdir(parents=True, exist_ok=True)
    first = None
    for skin_id, color in skins:
        img = render(grid, tuple(int(color[i : i + 2], 16) for i in (1, 3, 5)))
        img.save(out_dir / f'{skin_id}.png')
        first = first or img
    if '--preview' in args and first:
        big = first.resize((first.width * 10, first.height * 10), Image.NEAREST)
        bg = Image.new('RGBA', big.size, (200, 230, 200, 255))
        bg.paste(big, (0, 0), big)
        bg.save(args[args.index('--preview') + 1])
    print(f'{len(skins)} pieles, sprite de {first.width}x{first.height}')


if __name__ == '__main__':
    main()
