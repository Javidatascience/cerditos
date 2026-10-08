"""Dibuja las prendas del cerdito (gorros, ropa y colas) como capas PNG transparentes del mismo tamaño que el cerdito.

Uso:  python tools/make-pig-accessories.py [--out carpeta] [--preview ruta.png]

El lienzo (36x30) es el mismo que el de tools/make-pig-pixel.py: así cada prenda encaja encima del cerdito
con solo apilar las imágenes. Salida: public/pig/acc/<id>.png. Las coordenadas son las del lienzo: la cabeza
está hacia (12,17), las orejas en y 9-12, el lomo en y 10, la cola sale por (29,17) y las patas acaban en y 27.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CW, CH = 36, 30
OUTLINE = (52, 24, 38, 255)

COL = {
    'w': (255, 255, 255), 'W': (214, 226, 240), 's': (196, 202, 214), 'g': (140, 148, 164), 'G': (88, 96, 112),
    'y': (255, 214, 64), 'Y': (222, 160, 32), 'O': (240, 130, 40), 'r': (230, 64, 64), 'R': (160, 32, 48),
    'p': (255, 150, 190), 'P': (214, 96, 140), 'm': (150, 90, 220), 'M': (96, 56, 160),
    'n': (96, 200, 96), 'N': (48, 130, 72), 'c': (150, 230, 250), 'C': (70, 150, 210), 'k': (40, 36, 56),
}


class Layer:
    def __init__(self):
        self.g = [[None] * CW for _ in range(CH)]

    def p(self, x, y, c):
        if 0 <= x < CW and 0 <= y < CH:
            self.g[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def ell(self, cx, cy, rx, ry, c):
        for y in range(CH):
            for x in range(CW):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.p(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(steps + 1):
            self.p(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps), c)

    def pts(self, c, *points):
        for x, y in points:
            self.p(x, y, c)

    def image(self):
        img = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        for y in range(CH):
            for x in range(CW):
                if self.g[y][x]:
                    img.putpixel((x, y), COL[self.g[y][x]] + (255,))
        out = img.copy()
        for y in range(CH):
            for x in range(CW):
                if img.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < CW and 0 <= ny < CH and img.getpixel((nx, ny))[3]:
                        out.putpixel((x, y), OUTLINE)
                        break
        return out


# ---------------------------------------------------------------- gorros (cabeza)


def hechicero(c):
    c.rect(5, 9, 18, 10, 'm')
    for y, x0, x1 in [(8, 7, 16), (7, 8, 15), (6, 8, 15), (5, 9, 14), (4, 9, 14), (3, 10, 13), (2, 10, 12), (1, 11, 12), (0, 11, 11)]:
        c.rect(x0, y, x1, y, 'm')
    c.rect(7, 8, 16, 8, 'M')
    c.rect(5, 10, 18, 10, 'M')
    c.pts('y', (11, 5), (10, 6), (12, 6), (11, 7), (14, 4))
    c.pts('w', (9, 6))


def casco(c):
    c.ell(12, 12, 7.8, 4.6, 'g')
    c.rect(3, 12, 20, 14, '.')  # recorta la mitad de abajo
    c.rect(4, 12, 20, 12, 'G')
    c.rect(11, 5, 13, 6, 'y')  # linterna
    c.pts('O', (11, 7), (12, 7), (13, 7))
    c.pts('s', (8, 9), (9, 8), (8, 10))
    c.pts('w', (12, 5))


def cuerno(c):
    rows = [(10, 9, 14), (9, 10, 14), (8, 10, 14), (7, 11, 14), (6, 11, 13), (5, 11, 13), (4, 12, 13), (3, 12, 13), (2, 12, 12), (1, 12, 12)]
    for i, (y, x0, x1) in enumerate(rows):
        c.rect(x0, y, x1, y, ['w', 'p', 'w', 'y'][i % 4])
    c.rect(9, 10, 14, 10, 'Y')
    c.pts('y', (12, 0))


def corona(c):
    c.rect(6, 8, 17, 10, 'y')
    for x in (6, 9, 12, 15):
        c.rect(x, 6, x + 1, 7, 'y')
    c.rect(6, 10, 17, 10, 'Y')
    c.pts('r', (8, 9), (11, 9), (14, 9))
    c.pts('w', (7, 7), (13, 7))


# ---------------------------------------------------------------- ropa (cuerpo)


def tutu(c):
    c.ell(20, 22.5, 8.6, 2.4, 'p')
    c.rect(11, 22, 29, 24, '.')
    c.ell(20, 22, 8.6, 2.2, 'p')
    for x in range(12, 29, 3):
        c.pts('w', (x, 21), (x + 1, 23))
    c.rect(12, 24, 28, 24, 'P')


def armadura(c):
    c.ell(20, 17, 7.5, 5.6, 'g')
    c.rect(13, 14, 27, 14, 'G')
    c.rect(13, 17, 27, 17, 'G')
    c.rect(13, 20, 27, 20, 'G')
    c.line(20, 12, 20, 22, 'G')
    c.pts('s', (15, 13), (16, 12), (24, 13), (22, 15), (17, 15))
    c.pts('y', (14, 16), (26, 16), (14, 19), (26, 19))


def alas(c):
    for y, x0, x1 in [(11, 17, 21), (10, 17, 23), (9, 18, 25), (8, 19, 26), (7, 20, 27), (6, 21, 28), (5, 23, 28), (4, 25, 29), (3, 27, 29)]:
        c.rect(x0, y, x1, y, 'w')
    c.line(18, 10, 28, 4, 'W')
    c.line(20, 11, 27, 7, 'W')
    c.pts('W', (22, 10), (24, 9), (19, 11))
    c.pts('c', (29, 3), (28, 3), (29, 4))


# ---------------------------------------------------------------- colas


def cola_fuego(c):
    c.rect(29, 16, 31, 17, 'r')
    for i, w in enumerate([2, 3, 3, 3, 2, 2, 1, 1, 0]):
        y = 17 - i
        c.rect(32 - w, y, 32 + w, y, 'O' if i > 2 else 'r')
    c.rect(31, 14, 33, 17, 'y')
    c.pts('w', (32, 15), (32, 16))
    c.pts('y', (34, 12), (30, 11))


def cola_fantasma(c):
    c.ell(30.5, 16.5, 2.2, 2.2, 'W')
    c.ell(32.5, 14, 2.1, 2.1, 'c')
    c.ell(33.5, 11.5, 1.8, 1.8, 'W')
    c.ell(34, 9, 1.2, 1.2, 'c')
    c.pts('w', (30, 15), (32, 13), (33, 11))
    c.pts('C', (31, 18), (33, 16), (34, 13))


def cola_lagarto(c):
    for x, y in [(29, 17), (30, 17), (29, 18), (30, 18), (31, 18), (31, 19), (32, 19), (32, 20), (33, 20), (33, 21), (34, 21), (34, 22), (33, 23), (32, 23)]:
        c.p(x, y, 'n')
    for x, y in [(30, 18), (32, 19), (33, 20), (34, 21), (32, 23)]:
        c.p(x, y, 'N')
    c.pts('N', (33, 22))


ACCESSORIES = {
    'hechicero': hechicero, 'casco': casco, 'cuerno': cuerno, 'corona': corona,
    'tutu': tutu, 'armadura': armadura, 'alas': alas,
    'cola-lagarto': cola_lagarto, 'cola-fuego': cola_fuego, 'cola-fantasma': cola_fantasma,
}


def main() -> None:
    args = sys.argv[1:]
    out = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'public' / 'pig' / 'acc'
    out.mkdir(parents=True, exist_ok=True)
    layers = {}
    for acc_id, fn in ACCESSORIES.items():
        layer = Layer()
        fn(layer)
        # '.' = transparente (sirve para recortar formas)
        for y in range(CH):
            for x in range(CW):
                if layer.g[y][x] == '.':
                    layer.g[y][x] = None
        img = layer.image()
        img.save(out / f'{acc_id}.png')
        layers[acc_id] = img
    if '--preview' in args:
        base = Image.open(ROOT / 'public' / 'pig' / 'rosa.png').convert('RGBA')
        scale, cols = 4, 5
        rows = (len(layers) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (CW * scale + 8), rows * (CH * scale + 8)), (200, 230, 200, 255))
        for i, (acc_id, img) in enumerate(layers.items()):
            comp = base.copy()
            comp.alpha_composite(img)
            big = comp.resize((CW * scale, CH * scale), Image.NEAREST)
            sheet.paste(big, ((i % cols) * (CW * scale + 8) + 4, (i // cols) * (CH * scale + 8) + 4), big)
        sheet.save(args[args.index('--preview') + 1])
    print(f'{len(layers)} prendas')


if __name__ == '__main__':
    main()
