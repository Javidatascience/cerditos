"""Dibuja las herramientas y los compañeros en pixel art (16x16 con contorno), con el mismo estilo que el cerdito.

Uso:  python tools/make-pixel-art.py [--out carpeta] [--preview ruta.png]

Cada sprite se construye con formas sencillas en una rejilla de 14x14 y el contorno se añade solo.
Salida: <out>/tools/<id>.png y <out>/companions/<id>.png (por defecto public/art).
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
N = 14
OUTLINE = (52, 24, 38, 255)

COL = {
    'w': (255, 255, 255), 'W': (214, 220, 232),                  # blanco, gris azulado claro
    's': (190, 196, 208), 'g': (140, 148, 164), 'G': (88, 96, 112),  # acero
    'b': (176, 112, 56), 'B': (110, 66, 36), 'o': (222, 160, 90),   # madera
    'y': (255, 215, 64), 'Y': (222, 160, 32), 'O': (240, 130, 40),  # amarillos y naranja
    'r': (230, 64, 64), 'R': (160, 32, 48), 'p': (255, 150, 170), 'P': (214, 96, 128),
    'c': (96, 208, 240), 'C': (48, 112, 208), 'D': (24, 56, 130),   # azules
    'n': (96, 200, 96), 'N': (48, 130, 72), 'l': (176, 232, 120),   # verdes
    'q': (255, 205, 218), 'm': (170, 100, 220), 'M': (100, 56, 160), 'k': (40, 36, 56),   # morados y negro
}


class Canvas:
    def __init__(self):
        self.g = [[None] * N for _ in range(N)]

    def p(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.g[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(steps + 1):
            self.p(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps), c)

    def ell(self, cx, cy, rx, ry, c):
        for y in range(N):
            for x in range(N):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.p(x, y, c)

    def pts(self, c, *points):
        for x, y in points:
            self.p(x, y, c)

    def image(self):
        size = N + 2
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        for y in range(N):
            for x in range(N):
                if self.g[y][x]:
                    img.putpixel((x + 1, y + 1), COL[self.g[y][x]] + (255,))
        out = img.copy()
        for y in range(size):
            for x in range(size):
                if img.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < size and 0 <= ny < size and img.getpixel((nx, ny))[3]:
                        out.putpixel((x, y), OUTLINE)
                        break
        return out


# ---------------------------------------------------------------- herramientas


def pico(c):
    c.rect(6, 3, 7, 13, 'b')
    c.rect(7, 3, 7, 13, 'B')
    for y, (xl, xr) in zip(range(2, 7), [(4, 9), (2, 11), (1, 12), (1, 12), (1, 12)]):
        pass
    c.rect(4, 2, 9, 3, 'g')
    c.rect(2, 3, 3, 4, 'g')
    c.rect(10, 3, 11, 4, 'g')
    c.rect(1, 4, 2, 6, 'g')
    c.rect(11, 4, 12, 6, 'g')
    c.rect(4, 2, 9, 2, 's')
    c.pts('s', (2, 3), (1, 4), (10, 3), (11, 3))
    c.pts('G', (1, 6), (12, 6), (2, 5), (11, 5))


def cubo(c):
    c.rect(2, 6, 8, 12, 'C')
    c.rect(3, 6, 7, 7, 'c')
    c.rect(2, 12, 8, 12, 'D')
    c.line(2, 6, 4, 3, 'g')
    c.line(8, 6, 6, 3, 'g')
    c.line(4, 3, 6, 3, 'g')
    c.line(11, 2, 11, 9, 'B')
    c.rect(10, 9, 12, 12, 'g')


def martillo(c):
    c.line(3, 12, 9, 6, 'b')
    c.line(4, 12, 10, 6, 'B')
    c.rect(6, 2, 12, 6, 'g')
    c.rect(6, 2, 12, 3, 's')
    c.rect(6, 6, 12, 6, 'G')


def hacha(c):
    c.rect(5, 1, 6, 13, 'b')
    c.rect(6, 1, 6, 13, 'B')
    for y, w in zip(range(1, 8), [3, 5, 6, 6, 6, 5, 3]):
        c.rect(7, y, 6 + w, y, 'g')
    c.rect(12, 3, 12, 5, 's')
    c.rect(7, 1, 9, 1, 's')
    c.pts('G', (7, 7), (8, 7), (9, 7))


def dinamita(c):
    c.rect(3, 5, 10, 12, 'r')
    c.rect(3, 5, 4, 12, 'p')
    c.rect(9, 5, 10, 12, 'R')
    c.rect(3, 8, 10, 9, 'w')
    c.line(7, 5, 8, 3, 'B')
    c.line(8, 3, 10, 2, 'B')
    c.pts('y', (11, 1), (10, 1), (11, 2), (12, 0))
    c.pts('O', (11, 0), (12, 1))


def taladro(c):
    c.rect(2, 5, 8, 10, 'G')
    c.rect(2, 5, 8, 6, 'g')
    c.rect(1, 3, 3, 4, 's')
    c.pts('s', (4, 3), (5, 3))
    for i, x in enumerate(range(9, 13)):
        c.rect(x, 7 - (3 - i) // 2 if i < 3 else 7, x, 8 + (3 - i) // 2 if i < 3 else 8, 'W' if i % 2 else 's')
    c.pts('w', (4, 1), (5, 0), (6, 1), (7, 0))
    c.pts('o', (3, 11), (4, 11), (7, 11), (8, 11))


def excavadora(c):
    c.rect(1, 6, 8, 10, 'y')
    c.rect(1, 6, 8, 7, 'O')
    c.rect(2, 3, 5, 6, 'y')
    c.rect(3, 4, 4, 5, 'c')
    c.rect(0, 10, 9, 12, 'G')
    c.pts('g', (2, 11), (4, 11), (6, 11), (8, 11))
    c.line(8, 7, 11, 3, 'Y')
    c.line(8, 8, 12, 4, 'O')
    c.rect(11, 4, 13, 7, 's')
    c.pts('G', (11, 7), (12, 7), (13, 7))


def grua(c):
    c.line(3, 13, 3, 3, 'O')
    c.line(4, 13, 4, 3, 'y')
    for y in (5, 8, 11):
        c.line(3, y, 4, y + 1, 'R')
    c.rect(1, 1, 12, 2, 'O')
    c.rect(1, 1, 12, 1, 'y')
    c.line(10, 3, 10, 8, 'g')
    c.rect(9, 8, 11, 9, 's')
    c.pts('G', (9, 9), (10, 9), (11, 9))
    c.rect(1, 12, 6, 13, 'G')


def laser(c):
    c.line(1, 12, 5, 8, 'G')
    c.line(2, 12, 6, 8, 'g')
    c.rect(5, 6, 8, 9, 's')
    c.pts('c', (9, 7), (10, 7), (11, 7), (12, 7), (13, 7))
    c.pts('w', (9, 8), (10, 8), (11, 8), (12, 8), (13, 8))
    c.pts('C', (9, 6), (11, 6), (13, 6))
    c.pts('c', (7, 5), (6, 5))
    c.pts('w', (7, 4))


def plasma(c):
    for pts in [((7, 0), (8, 0), (9, 0)), ((6, 1), (7, 1), (8, 1), (9, 1)), ((5, 2), (6, 2), (7, 2), (8, 2)), ((4, 3), (5, 3), (6, 3), (7, 3)), ((3, 4), (4, 4), (5, 4), (6, 4), (7, 4), (8, 4), (9, 4), (10, 4)),
                ((6, 5), (7, 5), (8, 5), (9, 5), (10, 5)), ((7, 6), (8, 6), (9, 6)), ((6, 7), (7, 7), (8, 7)), ((5, 8), (6, 8), (7, 8)), ((5, 9), (6, 9)), ((4, 10), (5, 10)), ((4, 11),)]:
        c.pts('y', *pts)
    c.pts('w', (7, 1), (6, 2), (5, 3), (4, 4), (5, 4))
    c.pts('O', (9, 5), (10, 5), (8, 6), (7, 7), (6, 8), (5, 9))
    c.pts('c', (1, 6), (2, 7), (11, 2), (12, 3), (11, 9), (12, 8))


def cohete(c):
    c.ell(7, 6, 2.6, 5.5, 'w')
    c.rect(5, 2, 9, 2, 'r')
    c.pts('r', (6, 1), (7, 0), (8, 1), (6, 0), (8, 0))
    c.rect(6, 1, 8, 1, 'r')
    c.ell(7, 6, 1.2, 1.2, 'c')
    c.rect(8, 3, 9, 9, 'W')
    c.line(4, 8, 2, 11, 'r')
    c.line(10, 8, 12, 11, 'R')
    c.pts('r', (4, 9), (3, 10), (10, 9), (11, 10))
    c.pts('y', (6, 11), (7, 11), (8, 11), (6, 12), (7, 12), (8, 12))
    c.pts('O', (7, 13), (6, 12), (8, 12))


def agujero(c):
    c.ell(6.5, 6.5, 6, 6, 'M')
    c.ell(6.5, 6.5, 4.6, 4.6, 'm')
    c.ell(6.5, 6.5, 3.4, 3.4, 'k')
    c.pts('w', (1, 4), (12, 9), (3, 11), (10, 2))


def reloj(c):
    c.rect(2, 0, 11, 1, 'o')
    c.rect(2, 12, 11, 13, 'o')
    c.pts('B', (2, 1), (11, 1), (2, 12), (11, 12))
    for y, (a, b) in zip(range(2, 12), [(3, 10), (4, 9), (5, 8), (6, 7), (6, 7), (6, 7), (6, 7), (5, 8), (4, 9), (3, 10)]):
        c.rect(a, y, b, y, 'c' if y < 6 else 'W')
    c.rect(6, 6, 7, 8, 'y')
    c.rect(4, 10, 9, 11, 'y')
    c.pts('Y', (5, 11), (8, 11))


def prisma(c):
    for y in range(1, 12):
        half = (y - 1) * 0.45
        for x in range(N):
            if abs(x - 5.5) <= half + 0.4:
                c.p(x, y, 'w' if x < 5.5 - half * 0.2 else 'W')
    c.line(8, 7, 13, 5, 'r')
    c.line(8, 8, 13, 7, 'y')
    c.line(8, 9, 13, 9, 'n')
    c.line(8, 10, 13, 11, 'c')
    c.line(0, 8, 3, 8, 'w')


def dado(c):
    c.rect(1, 1, 12, 12, 'w')
    c.rect(1, 12, 12, 12, 'W')
    c.rect(12, 1, 12, 12, 'W')
    for x, y in [(3, 3), (3, 10), (10, 3), (10, 10)]:
        c.rect(x, y, x + 1, y + 1, 'r' if (x, y) == (6, 6) else 'k')
    c.rect(6, 6, 7, 7, 'r')


def fractal(c):
    for cx in (3.5, 10.5):
        for y in range(N):
            for x in range(N):
                d = ((x - cx) / 3.2) ** 2 + ((y - 6.5) / 4.2) ** 2
                if 0.45 <= d <= 1.15:
                    c.p(x, y, 'm')
    c.rect(5, 5, 8, 8, 'm')
    c.pts('w', (1, 4), (12, 4), (6, 6), (7, 7))
    c.pts('M', (6, 8), (3, 11), (10, 11))


def consola(c):
    c.rect(0, 1, 13, 10, 'G')
    c.rect(1, 2, 12, 9, 'k')
    c.pts('n', (2, 3), (3, 4), (2, 5), (5, 5), (6, 5), (7, 5))
    c.pts('l', (2, 3), (3, 4), (2, 5), (9, 7), (10, 7))
    c.rect(5, 11, 8, 12, 'g')
    c.rect(3, 13, 10, 13, 'G')


def bote(c):
    c.rect(3, 0, 10, 1, 'o')
    c.rect(2, 2, 11, 12, 'c')
    c.rect(2, 2, 3, 12, 'w')
    c.rect(2, 12, 11, 12, 'C')
    c.rect(4, 4, 10, 11, 'D')
    c.pts('w', (5, 5), (8, 6), (6, 8), (9, 9), (7, 10))
    c.pts('y', (7, 4), (4, 7), (9, 8))
    c.pts('m', (5, 9), (8, 5))


TOOLS = {
    'pico-de-madera': pico, 'cubo-y-pala': cubo, 'martillo-de-piedra': martillo, 'hacha-de-hierro': hacha,
    'dinamita-de-feria': dinamita, 'taladro-de-vapor': taladro, 'excavadora': excavadora, 'grua-perforadora': grua,
    'laser-de-cristal': laser, 'taladro-de-plasma': plasma, 'cohete-excavador': cohete, 'agujero-negro': agujero,
    'maquina-del-tiempo': reloj, 'prisma-de-luz': prisma, 'dado-de-la-suerte': dado, 'fractal-de-picos': fractal,
    'consola-de-codigo': consola, 'universo-en-un-bote': bote,
}

# ---------------------------------------------------------------- compañeros


def topo(c):
    c.ell(7, 11, 6, 2.2, 'B')                  # montoncito de tierra
    c.ell(7, 8, 5, 4.2, 'b')                   # cuerpo
    c.ell(7, 9, 3, 2.5, 'o')
    c.pts('k', (5, 6), (9, 6))                 # ojitos
    c.rect(6, 7, 8, 8, 'p')                    # nariz grande
    c.pts('P', (6, 8), (8, 8))
    c.rect(1, 9, 3, 10, 'w')                   # garras
    c.rect(11, 9, 13, 10, 'w')
    c.pts('B', (1, 10), (3, 10), (11, 10), (13, 10))


def perro(c):
    c.ell(7, 6, 4.8, 4.4, 'o')
    c.rect(1, 3, 3, 8, 'B')                    # orejas caídas
    c.rect(10, 3, 12, 8, 'B')
    c.ell(7, 8, 2.6, 2, 'w')                   # hocico
    c.rect(6, 7, 8, 7, 'k')
    c.pts('k', (5, 5), (9, 5))
    c.pts('p', (7, 10))
    c.rect(4, 11, 9, 13, 'o')
    c.pts('w', (5, 12), (8, 12))
    c.pts('b', (6, 2), (7, 2), (8, 3))


def pajaro(c):
    c.ell(6.5, 7, 5, 4.6, 'c')
    c.ell(6.5, 9, 3, 2.4, 'w')
    c.rect(1, 6, 3, 9, 'C')                    # ala
    c.pts('k', (7, 5))
    c.pts('w', (8, 5))
    c.rect(10, 6, 12, 7, 'O')                  # pico
    c.pts('Y', (11, 7), (12, 7))
    c.pts('y', (5, 1), (6, 2), (7, 1), (6, 1))  # cresta
    c.pts('O', (5, 12), (8, 12), (5, 13), (8, 13))


def gato(c):
    c.ell(7, 7, 5.2, 4.4, 'O')
    c.rect(2, 1, 4, 4, 'O')                    # orejas
    c.rect(10, 1, 12, 4, 'O')
    c.pts('p', (3, 3), (11, 3))
    c.pts('y', (4, 6), (10, 6))
    c.pts('k', (4, 6), (10, 6))
    c.pts('p', (7, 8))
    c.pts('w', (1, 8), (2, 9), (12, 8), (11, 9))  # bigotes
    c.pts('Y', (7, 3), (6, 3), (8, 3), (7, 4))
    c.rect(3, 11, 10, 13, 'O')
    c.pts('Y', (5, 12), (8, 12))


def conejo(c):
    c.ell(7, 9, 4.6, 3.8, 'w')
    c.rect(3, 0, 5, 6, 'w')                    # orejas largas
    c.rect(9, 0, 11, 6, 'w')
    c.rect(4, 1, 4, 5, 'p')
    c.rect(10, 1, 10, 5, 'p')
    c.pts('k', (5, 8), (9, 8))
    c.pts('p', (7, 10), (6, 10), (8, 10))
    c.pts('W', (3, 11), (11, 11))
    c.rect(4, 12, 9, 13, 'w')


def dragon(c):
    c.ell(7, 8, 4.6, 4, 'n')
    c.ell(7, 9, 2.6, 2.6, 'l')
    c.rect(1, 3, 3, 8, 'N')                    # alas
    c.rect(11, 3, 13, 8, 'N')
    c.pts('w', (4, 1), (10, 1))                # cuernos
    c.pts('y', (4, 2), (10, 2))
    c.pts('y', (5, 6), (9, 6))
    c.pts('k', (5, 6), (9, 6))
    c.pts('N', (6, 8), (8, 8))
    c.pts('r', (6, 10), (7, 10), (8, 10))
    c.pts('O', (6, 11), (7, 12))
    c.rect(4, 12, 10, 13, 'n')
    c.pts('Y', (6, 4), (7, 3), (8, 4))


COMPANIONS = {'topo': topo, 'perro': perro, 'pajaro': pajaro, 'gato': gato, 'conejo': conejo}
CAVE = {'dragon': dragon}

# ---------------------------------------------------------------- flores y hierbas


def stem(c, x=7, top=7, leaves=True):
    c.line(x, top, x, 13, 'N')
    if leaves:
        c.pts('n', (x - 2, 11), (x - 1, 11), (x - 1, 10), (x + 1, 9), (x + 2, 9), (x + 2, 8))


def petals(c, cx, cy, color, center, reach=2.6, size=1.7, count=6):
    import math
    for i in range(count):
        a = 2 * math.pi * i / count - math.pi / 2
        c.ell(cx + reach * math.cos(a), cy + reach * math.sin(a), size, size, color)
    c.ell(cx, cy, 1.5, 1.5, center)


def margarita(c):
    stem(c, top=8)
    petals(c, 7, 5, 'w', 'y', 2.6, 1.6, 8)
    c.pts('W', (4, 6), (10, 6), (7, 8))


def tulipan(c):
    stem(c, top=8)
    c.ell(7, 5, 3.3, 3.5, 'r')
    c.pts('r', (4, 1), (7, 1), (10, 1), (4, 2), (7, 2), (10, 2))
    c.pts('R', (4, 7), (5, 7), (9, 7), (10, 7), (6, 3), (8, 3))
    c.pts('p', (5, 4), (5, 5))


def girasol(c):
    stem(c, top=9)
    petals(c, 7, 5, 'y', 'B', 3.3, 1.7, 10)
    c.ell(7, 5, 2.4, 2.4, 'B')
    c.pts('b', (6, 4), (8, 6))
    c.pts('Y', (2, 5), (12, 5), (7, 1), (7, 9))


def rosa(c):
    stem(c, top=8)
    c.ell(7, 5, 3.6, 3.6, 'r')
    c.pts('R', (7, 3), (6, 4), (7, 5), (8, 4), (5, 6), (9, 6), (7, 7))
    c.pts('p', (6, 2), (5, 3), (8, 4))
    c.pts('N', (6, 9), (8, 10))


def lavanda(c):
    c.line(7, 6, 7, 13, 'N')
    c.line(4, 8, 4, 13, 'N')
    c.line(10, 8, 10, 13, 'N')
    for x, top in ((7, 0), (4, 3), (10, 3)):
        for y in range(top, top + 6):
            c.p(x, y, 'm' if y % 2 == 0 else 'M')
            c.p(x - 1 if y % 2 else x + 1, y, 'M' if y % 2 else 'm')
    c.pts('n', (5, 11), (9, 11))


def loto(c):
    c.rect(0, 10, 13, 12, 'C')
    c.rect(1, 10, 12, 10, 'c')
    for y, hw in zip(range(2, 10), [0, 1, 1, 2, 2, 3, 3, 3]):
        c.rect(7 - hw, y, 7 + hw, y, 'p')
    c.pts('q', (7, 3), (7, 4), (6, 6))
    c.line(2, 5, 4, 9, 'P')
    c.line(12, 5, 10, 9, 'P')
    c.rect(2, 11, 3, 11, 'c')
    c.pts('n', (3, 10), (4, 10), (10, 10), (11, 10))


def hibisco(c):
    stem(c, top=8)
    petals(c, 7, 5, 'O', 'R', 2.8, 2.0, 5)
    c.line(7, 5, 11, 2, 'R')
    c.pts('y', (11, 1), (12, 2), (11, 2))
    c.pts('p', (4, 3), (10, 7))


def orquidea(c):
    c.line(7, 13, 6, 8, 'N')
    c.line(6, 8, 8, 4, 'N')
    c.pts('n', (4, 11), (5, 11), (9, 11), (10, 10))
    c.ell(5, 3, 2.2, 2.0, 'm')
    c.ell(10, 4, 2.2, 2.0, 'm')
    c.ell(7.5, 2, 2.0, 1.6, 'M')
    c.ell(7.5, 5.5, 2.0, 2.4, 'w')
    c.pts('P', (7, 5), (8, 6), (7, 7))
    c.pts('y', (7, 3), (8, 3))
    c.ell(4, 8, 1.4, 1.4, 'm')


def luna(c):
    stem(c, top=9)
    c.ell(7, 5, 4, 4, 'W')
    for y in range(N):
        for x in range(N):
            if ((x - 9) / 3.2) ** 2 + ((y - 4) / 3.2) ** 2 <= 1:
                c.g[y][x] = None
    c.pts('w', (4, 4), (5, 3), (4, 6))
    c.pts('c', (11, 1), (12, 3), (1, 2), (11, 8), (2, 8))
    c.pts('y', (9, 4), (10, 5))


def oro(c):
    stem(c, top=8)
    petals(c, 7, 5, 'y', 'O', 2.7, 1.9, 8)
    c.pts('Y', (7, 8), (4, 5), (10, 5))
    c.pts('w', (3, 3), (10, 2), (5, 7), (0, 0), (13, 1), (12, 8), (1, 7))


def brote(c):
    c.ell(7, 12, 5, 1.6, 'B')
    c.line(7, 12, 7, 7, 'N')
    c.ell(4.5, 6, 3.2, 1.9, 'n')
    c.ell(9.5, 5, 3.2, 1.9, 'l')
    c.pts('N', (6, 6), (8, 5))
    c.pts('b', (3, 12), (11, 12))


def semilla(c):
    c.ell(7, 12, 6, 1.8, 'B')
    c.ell(7, 8, 1.6, 2, 'n')
    c.pts('l', (7, 7), (7, 6))
    c.pts('b', (4, 12), (10, 12))


FLOWERS = {
    'margarita': margarita, 'tulipan': tulipan, 'girasol': girasol, 'rosa': rosa, 'lavanda': lavanda,
    'loto': loto, 'hibisco': hibisco, 'orquidea': orquidea, 'flor-de-luna': luna, 'flor-de-oro': oro,
    'brote': brote, 'semilla': semilla,
}

# ---------------------------------------------------------------- hornos y ramas de la cueva


def flama(c, x=7, base=9, height=8):
    for i in range(height):
        w = max(0, (height - i) // 3 + (1 if i > height // 2 else 0))
        c.rect(x - w, base - i, x + w, base - i, 'O' if i > 2 else 'r')
    c.rect(x - 1, base - 3, x + 1, base, 'y')
    c.pts('w', (x, base - 1))


def brasero(c):
    c.ell(7, 9, 5.6, 3.6, 'G')
    c.rect(1, 8, 12, 9, 'g')
    c.rect(2, 12, 5, 13, 'G')
    c.rect(9, 12, 12, 13, 'G')
    flama(c, 7, 8, 8)


def fragua(c):
    c.rect(2, 7, 11, 8, 'g')
    c.rect(1, 6, 3, 7, 'g')
    c.rect(4, 9, 9, 10, 'G')
    c.rect(3, 11, 10, 13, 'G')
    c.rect(2, 6, 11, 6, 's')
    c.rect(3, 4, 8, 5, 'O')
    c.rect(3, 4, 5, 4, 'y')
    c.pts('y', (10, 2), (11, 4), (9, 1), (12, 5))
    c.pts('w', (4, 4))


def horno(c):
    c.rect(1, 4, 12, 13, 'g')
    c.rect(1, 4, 12, 5, 's')
    c.rect(1, 13, 12, 13, 'G')
    c.rect(4, 7, 9, 13, 'k')
    c.rect(5, 9, 8, 13, 'O')
    c.rect(6, 10, 7, 13, 'y')
    c.rect(9, 0, 11, 3, 'G')
    c.pts('W', (10, 0), (11, 1))
    c.pts('G', (2, 8), (11, 9), (2, 11), (12, 12))


def corazon(c):
    c.ell(4.5, 5, 3.2, 3.2, 'R')
    c.ell(9.5, 5, 3.2, 3.2, 'R')
    for y, hw in zip(range(6, 13), [6, 5, 4, 3, 2, 1, 0]):
        c.rect(7 - hw, y, 6 + hw, y, 'R')
    c.line(5, 4, 7, 7, 'O')
    c.line(7, 7, 6, 10, 'O')
    c.line(9, 3, 9, 6, 'O')
    c.pts('y', (5, 4), (7, 7), (9, 4))
    c.pts('p', (3, 3), (4, 3))


def azufre(c):
    c.ell(7, 10, 6, 3, 'G')
    c.rect(1, 9, 12, 12, 'G')
    c.rect(2, 10, 5, 11, 'g')
    for x0, top in ((3, 3), (6, 1), (9, 4)):
        c.rect(x0, top, x0 + 1, 9, 'y')
        c.pts('Y', (x0 + 1, top + 2), (x0 + 1, top + 4), (x0 + 1, top + 6))
        c.pts('W', (x0, top))
    c.pts('O', (7, 6), (4, 7))


def escudo(c):
    c.rect(2, 1, 11, 7, 'C')
    for y, hw in zip(range(8, 13), [5, 4, 3, 2, 1]):
        c.rect(7 - hw, y, 6 + hw, y, 'C')
    c.rect(3, 2, 10, 2, 'c')
    c.rect(6, 3, 7, 10, 'c')
    c.rect(3, 5, 10, 6, 'c')
    c.pts('w', (4, 3), (5, 3))


def bolsa(c):
    c.ell(7, 9, 5, 4, 'B')
    c.ell(7, 9, 3.6, 2.8, 'b')
    c.rect(5, 3, 9, 4, 'b')
    c.rect(4, 2, 10, 2, 'B')
    c.rect(6, 5, 7, 5, 'B')
    c.rect(6, 7, 7, 11, 'y')
    c.pts('Y', (5, 8), (8, 8), (5, 10), (8, 10))


FURNACES = {'brasero': brasero, 'fragua': fragua, 'horno-de-roca': horno, 'corazon-de-lava': corazon, 'mina-de-azufre': azufre,
            'rama-fuego': lambda c: flama(c, 7, 11, 11), 'rama-escamas': escudo, 'rama-tesoro': bolsa}

# ---------------------------------------------------------------- iconos de menú, logros y mejoras


def pluma(c):
    r = 2 ** 0.5
    for y in range(N):
        for x in range(N):
            u = ((x - 7.5) + (6.5 - y)) / r      # a lo largo de la pluma
            v = ((x - 7.5) - (6.5 - y)) / r      # a lo ancho
            if (u / 6.2) ** 2 + (v / 2.9) ** 2 <= 1:
                c.p(x, y, 'B' if abs(v) < 0.55 else ('W' if v > 0 else 'w'))
    c.line(1, 13, 4, 10, 'B')
    c.pts('c', (10, 3), (11, 2), (9, 4))


def cara_cerdo(c):
    c.ell(7, 8, 5.8, 5, 'p')
    c.rect(1, 2, 4, 4, 'p')
    c.rect(9, 2, 12, 4, 'p')
    c.rect(2, 3, 3, 4, 'P')
    c.rect(10, 3, 11, 4, 'P')
    c.ell(7, 10, 2.8, 2, 'q')
    c.pts('P', (6, 10), (8, 10))
    c.pts('k', (4, 7), (10, 7))


def copa(c):
    c.rect(3, 1, 10, 6, 'y')
    c.rect(4, 1, 5, 5, 'w')
    c.rect(9, 3, 10, 6, 'Y')
    c.rect(0, 2, 2, 4, 'y')
    c.rect(11, 2, 13, 4, 'y')
    c.rect(6, 7, 7, 9, 'Y')
    c.rect(4, 10, 9, 12, 'O')
    c.rect(4, 10, 9, 10, 'y')
    c.pts('Y', (3, 6), (10, 6))


def engranaje(c):
    for x0, y0, x1, y1 in [(6, 0, 7, 1), (6, 12, 7, 13), (0, 6, 1, 7), (12, 6, 13, 7), (2, 2, 3, 3), (10, 2, 11, 3), (2, 10, 3, 11), (10, 10, 11, 11)]:
        c.rect(x0, y0, x1, y1, 'g')
    c.ell(6.5, 6.5, 5.2, 5.2, 'g')
    for y in range(N):
        for x in range(N):
            if ((x - 6.5) / 2.1) ** 2 + ((y - 6.5) / 2.1) ** 2 <= 1:
                c.g[y][x] = None
    c.pts('s', (3, 4), (4, 3), (3, 5))
    c.pts('G', (9, 9), (10, 8))


def medalla(c):
    c.line(3, 0, 6, 5, 'r')
    c.line(10, 0, 7, 5, 'C')
    c.rect(2, 0, 4, 1, 'r')
    c.rect(9, 0, 11, 1, 'C')
    c.ell(7, 9, 4.4, 4.4, 'y')
    c.ell(7, 9, 2.8, 2.8, 'Y')
    c.pts('y', (7, 8), (6, 9), (8, 9), (7, 10), (7, 9))
    c.pts('w', (4, 7))


def moneda(c):
    c.ell(7, 7, 5.6, 5.6, 'y')
    c.ell(7, 7, 4, 4, 'Y')
    c.rect(6, 4, 7, 10, 'y')
    c.rect(5, 5, 8, 5, 'y')
    c.rect(5, 9, 8, 9, 'y')
    c.pts('w', (3, 4), (4, 3))


def mano(c):
    c.rect(3, 6, 10, 12, 'q')
    for x in (3, 5, 7, 9):
        c.rect(x, 2 if x != 3 else 3, x + 1, 6, 'q')
    c.rect(1, 7, 2, 10, 'q')
    c.pts('p', (4, 11), (6, 11), (8, 11))
    c.pts('P', (3, 12), (10, 12))


def pata(c):
    c.ell(7, 9, 3.6, 3.2, 'p')
    for x, y in [(2, 5), (5, 2), (9, 2), (12, 5)]:
        c.ell(x, y, 1.6, 1.9, 'p')
    c.pts('P', (6, 10), (8, 10))


def estrella(c):
    rows = [(1, [(6, 7)]), (2, [(6, 7)]), (3, [(5, 8)]), (4, [(5, 8)]), (5, [(1, 12)]), (6, [(2, 11)]), (7, [(3, 10)]), (8, [(4, 9)]),
            (9, [(3, 10)]), (10, [(3, 5), (8, 10)]), (11, [(2, 4), (9, 11)]), (12, [(2, 3), (10, 11)])]
    for y, spans in rows:
        for x0, x1 in spans:
            c.rect(x0, y, x1, y, 'y')
    c.pts('w', (6, 2), (5, 5), (4, 5))
    c.pts('Y', (3, 6), (10, 6), (6, 9), (7, 9))


def muelle(c):
    for y in range(1, 13, 3):
        c.rect(3, y, 10, y, 'g')
        c.rect(3, y + 1, 4, y + 1, 'G')
        c.rect(9, y + 1, 10, y + 1, 'g')
    c.rect(2, 0, 11, 0, 'G')
    c.rect(2, 13, 11, 13, 'G')
    c.pts('s', (4, 1), (4, 4), (4, 7), (4, 10))


def destello(c):
    c.rect(6, 1, 7, 12, 'c')
    c.rect(1, 6, 12, 7, 'c')
    c.rect(6, 4, 7, 9, 'w')
    c.rect(4, 6, 9, 7, 'w')
    c.pts('y', (3, 3), (10, 3), (3, 10), (10, 10))


def chispa(c):
    c.rect(6, 1, 7, 12, 'y')
    c.rect(1, 6, 12, 7, 'y')
    c.rect(5, 4, 8, 9, 'y')
    c.rect(4, 5, 9, 8, 'y')
    c.rect(6, 5, 7, 8, 'w')
    c.rect(5, 6, 8, 7, 'w')
    c.pts('Y', (3, 3), (10, 3), (3, 10), (10, 10))


UI = {
    'brillo': chispa,
    'nav-picar': pico, 'nav-ascender': pluma, 'nav-cerdito': cara_cerdo, 'nav-jardin': brote, 'nav-cueva': dragon,
    'nav-logros': copa, 'nav-ajustes': engranaje,
    'logro-flor': margarita, 'logro-horno': brasero,
    'logro': medalla, 'logro-monedas': moneda, 'logro-picos': pico, 'logro-companeros': pata, 'logro-brillo': destello,
    'mejora-global': estrella, 'mejora-inercia': muelle,
}


# Esmeralda, bellota, brasa y los iconos del árbol de ventajas: están en _gems.py y se cargan aquí para
# usar las mismas funciones de dibujo (Canvas, flama, moneda…).
exec(compile(Path(__file__).with_name('_gems.py').read_text(encoding='utf-8'), '_gems.py', 'exec'))
UI['nav-ascender'] = esmeralda  # noqa: F821 (definida en _gems.py)

# ---------------------------------------------------------------- reliquias


def r_callo(c):
    c.rect(3, 6, 10, 12, 'y')
    for x in (3, 5, 7, 9):
        c.rect(x, 2 if x != 3 else 3, x + 1, 6, 'y')
    c.rect(1, 7, 2, 10, 'y')
    c.pts('Y', (4, 11), (6, 11), (8, 11), (3, 12), (10, 12), (5, 5), (7, 4))
    c.pts('w', (4, 7), (4, 3), (12, 2), (12, 11), (0, 12))


def r_pico_ancestral(c):
    c.rect(6, 3, 7, 13, 'B')
    c.rect(6, 5, 6, 12, 'b')
    c.rect(4, 2, 9, 3, 'o')
    c.rect(2, 3, 3, 4, 'o')
    c.rect(10, 3, 11, 4, 'o')
    c.rect(1, 4, 2, 6, 'b')
    c.rect(11, 4, 12, 6, 'b')
    c.pts('y', (4, 2), (5, 2), (10, 3))
    c.pts('n', (6, 7), (7, 9), (6, 11), (5, 2))
    c.pts('w', (0, 1), (13, 2), (3, 0))


def r_pluma_eterna(c):
    r = 2 ** 0.5
    for y in range(N):
        for x in range(N):
            u = ((x - 7.5) + (6.5 - y)) / r
            v = ((x - 7.5) - (6.5 - y)) / r
            if (u / 6.2) ** 2 + (v / 2.9) ** 2 <= 1:
                c.p(x, y, 'O' if abs(v) < 0.55 else ('y' if v > 0 else 'Y'))
    c.line(1, 13, 4, 10, 'B')
    c.pts('w', (10, 3), (11, 2), (7, 5), (12, 0), (1, 5), (11, 11))


def r_reloj(c):
    c.rect(6, 0, 7, 1, 'Y')
    c.ell(6.5, 7.5, 5.6, 5.6, 'y')
    c.ell(6.5, 7.5, 4.2, 4.2, 'w')
    c.line(6, 7, 6, 4, 'k')
    c.line(7, 8, 9, 9, 'k')
    c.pts('Y', (3, 7), (10, 7), (6, 11), (6, 4))
    c.pts('r', (6, 7))
    c.pts('Y', (11, 3), (12, 2), (12, 4))


def r_muelle(c):
    for y in range(2, 13, 3):
        c.rect(3, y, 10, y, 'm')
        c.rect(3, y + 1, 4, y + 1, 'M')
        c.rect(9, y + 1, 10, y + 1, 'm')
    c.rect(2, 1, 11, 1, 'M')
    c.rect(2, 13, 11, 13, 'M')
    c.pts('w', (4, 2), (4, 5), (4, 8), (4, 11))
    c.pts('y', (0, 0), (13, 4), (12, 10), (1, 7))


def r_monedero(c):
    c.ell(7, 9, 5.4, 4.2, 'C')
    c.ell(7, 9, 4, 3, 'c')
    c.rect(4, 3, 10, 5, 'C')
    c.rect(5, 2, 9, 2, 'D')
    c.rect(6, 5, 7, 5, 'y')
    c.ell(7, 9, 2, 1.6, 'D')
    c.pts('y', (7, 13), (6, 12), (7, 12), (8, 12))
    c.pts('w', (4, 8), (3, 9))


def r_corazon_agujero(c):
    c.ell(4.5, 5, 3.2, 3.2, 'k')
    c.ell(9.5, 5, 3.2, 3.2, 'k')
    for y, hw in zip(range(6, 13), [6, 5, 4, 3, 2, 1, 0]):
        c.rect(7 - hw, y, 6 + hw, y, 'k')
    c.line(2, 4, 4, 2, 'm')
    c.line(9, 2, 11, 4, 'm')
    c.line(1, 6, 7, 12, 'M')
    c.line(12, 6, 7, 12, 'M')
    c.pts('w', (5, 4), (9, 5), (7, 8), (6, 6))
    c.pts('m', (7, 10), (6, 9), (8, 9))


RELICS = {
    'callo-de-oro': r_callo, 'pico-ancestral': r_pico_ancestral, 'pluma-eterna': esmeralda_eterna,  # noqa: F821 'reloj-de-bolsillo': r_reloj,
    'muelle-magico': r_muelle, 'monedero-sin-fondo': r_monedero, 'corazon-de-agujero': r_corazon_agujero,
}
RELICS.update(NEW_RELICS)  # noqa: F821 (reliquias de las criaturas, definidas en _gems.py)


def main() -> None:
    args = sys.argv[1:]
    out = Path(args[args.index('--out') + 1]) if '--out' in args else ROOT / 'public' / 'art'
    sheets = []
    for folder, table in (('tools', TOOLS), ('companions', COMPANIONS), ('cave', CAVE), ('flowers', FLOWERS), ('furnaces', FURNACES), ('ui', UI), ('ui', GEMS), ('relics', RELICS), ('creatures', CREATURES)):  # noqa: F821
        (out / folder).mkdir(parents=True, exist_ok=True)
        for sprite_id, fn in table.items():
            c = Canvas()
            fn(c)
            img = c.image()
            img.save(out / folder / f'{sprite_id}.png')
            sheets.append(img)
    if '--preview' in args:
        scale, cols = 6, 10
        rows = (len(sheets) + cols - 1) // cols
        cell = (N + 2) * scale + 8
        sheet = Image.new('RGBA', (cols * cell, rows * cell), (225, 235, 215, 255))
        for i, img in enumerate(sheets):
            big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
            sheet.paste(big, ((i % cols) * cell + 4, (i // cols) * cell + 4), big)
        sheet.save(args[args.index('--preview') + 1])
    print(f'{len(sheets)} sprites')


if __name__ == '__main__':
    main()
