"""Prepara el sprite del cerdito a partir de la imagen generada con IA (JPG con fondo blanco).

Uso:  python tools/make-pig-sprites.py ruta/a/cerdito.jpg [--hat] [--block N] [--out carpeta]
  --hat      el dibujo lleva un sombrero que hay que quitar (el primer cerdito)
  --block N  tamaño en píxeles de cada "píxel" del dibujo original (por defecto 8)

Pasos: baja la imagen a su rejilla real de píxeles (la IA dibuja bloques de ~8 px), limpia el ruido del
JPG, quita el fondo y la sombra, quita el sombrero, recorta, y genera una variante por cada piel de
src/content/game.ts (recoloreando solo los píxeles rosas). Salida: public/pig/<id-de-piel>.png.
"""

import colorsys
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BLOCK = 8  # tamaño aproximado de cada "píxel" del dibujo original (se puede cambiar con --block)
OUTLINE = (84, 28, 48, 255)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def is_fill(p):
    """Píxel de la piel del cerdito (rosa claro), incluida la nariz y las orejas."""
    return p[0] - p[2] > 15 and lum(p) > 150


def load_grid(path: str, block: int = BLOCK) -> Image.Image:
    src = Image.open(path).convert('RGB')
    n = src.width // block
    small = Image.new('RGB', (n, n))
    for y in range(n):
        for x in range(n):
            # mediana del bloque central: aguanta el ruido del JPG
            px = [src.getpixel((x * block + dx * block // 8, y * block + dy * block // 8)) for dx in (2, 4, 6) for dy in (2, 4, 6)]
            small.putpixel((x, y), tuple(sorted(c[i] for c in px)[4] for i in range(3)))
    return small.quantize(colors=80, method=Image.Quantize.MEDIANCUT).convert('RGB')


def remove_background(img: Image.Image) -> Image.Image:
    out = img.convert('RGBA')
    w, h = out.size
    for y in range(h):
        for x in range(w):
            p = out.getpixel((x, y))
            white = min(p[:3]) > 225
            shadow = lum(p) > 170 and p[0] - p[2] < 35  # sombra gris violácea del suelo
            if white or shadow:
                out.putpixel((x, y), (0, 0, 0, 0))
    return out


def keep_largest(img: Image.Image) -> Image.Image:
    """Se queda solo con el mayor grupo de píxeles conectados (quita motas sueltas de fondo o sombra)."""
    w, h = img.size
    seen = set()
    best: list = []
    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or not img.getpixel((sx, sy))[3]:
                continue
            group, stack = [], [(sx, sy)]
            seen.add((sx, sy))
            while stack:
                x, y = stack.pop()
                group.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and img.getpixel((nx, ny))[3]:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            if len(group) > len(best):
                best = group
    keep = set(best)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                img.putpixel((x, y), (0, 0, 0, 0))
    return img


def remove_hat(img: Image.Image) -> Image.Image:
    """Borra el sombrero (zona sobre la cabeza) y redibuja el contorno de la cabeza."""
    w, h = img.size
    x0, x1, y0, y1 = int(w * 0.43), int(w * 0.58), int(h * 0.17), int(h * 0.29)
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = img.getpixel((x, y))
            if p[3] and not (is_fill(p) and p[1] > 185):  # el sombrero es de un beis más oscuro que la piel
                img.putpixel((x, y), (0, 0, 0, 0))
    for y in range(y0, y1 + 2):
        for x in range(x0, x1):
            if img.getpixel((x, y))[3]:
                continue
            below = img.getpixel((x, y + 1)) if y + 1 < h else (0, 0, 0, 0)
            if below[3] and is_fill(below) and below[1] > 185:
                img.putpixel((x, y), OUTLINE)
    return img


def crop(img: Image.Image) -> Image.Image:
    box = img.getbbox()
    return img.crop((max(0, box[0] - 1), max(0, box[1] - 1), min(img.width, box[2] + 1), min(img.height, box[3] + 1)))


def tint(img: Image.Image, base, target) -> Image.Image:
    out = img.copy()
    for y in range(img.height):
        for x in range(img.width):
            p = img.getpixel((x, y))
            if p[3] and is_fill(p):
                ratio = [p[i] / max(1, base[i]) for i in range(3)]
                out.putpixel((x, y), tuple(min(255, int(target[i] * ratio[i])) for i in range(3)) + (255,))
    return out


def hex_rgb(value: str):
    return tuple(int(value[i : i + 2], 16) for i in (1, 3, 5))


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    args = sys.argv[1:]
    block = int(args[args.index('--block') + 1]) if '--block' in args else BLOCK
    out_dir = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'public' / 'pig'
    sprite = remove_background(load_grid(args[0], block))
    if '--hat' in args:
        sprite = remove_hat(sprite)
    sprite = crop(keep_largest(sprite))
    fills = [sprite.getpixel((x, y)) for y in range(sprite.height) for x in range(sprite.width) if sprite.getpixel((x, y))[3] and is_fill(sprite.getpixel((x, y)))]
    base = tuple(sorted(c[i] for c in fills)[len(fills) // 2] for i in range(3))
    skins = re.findall(r"id: '([a-z-]+)', name: '[^']*', flavor: '[^']*', color: '(#[0-9a-fA-F]{6})'", (ROOT / 'src/content/game.ts').read_text(encoding='utf-8'))
    out_dir.mkdir(parents=True, exist_ok=True)
    for skin_id, color in skins:
        target = hex_rgb(color)
        (tint(sprite, base, target) if skin_id != 'rosa' else sprite).save(out_dir / f'{skin_id}.png')
    print(f'{len(skins)} pieles, sprite de {sprite.width}x{sprite.height}, color base {base}')


if __name__ == '__main__':
    main()
