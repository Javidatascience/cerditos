# ---------------------------------------------------------------- esmeralda, moneda, bellota y árbol de ventajas


def esmeralda(c):
    rows = [(1, 5, 8), (2, 3, 10), (3, 2, 11), (4, 1, 12), (5, 1, 12), (6, 2, 11), (7, 3, 10), (8, 4, 9), (9, 5, 8), (10, 6, 7)]
    for y, x0, x1 in rows:
        c.rect(x0, y, x1, y, 'n')
    c.rect(5, 1, 8, 3, 'l')
    c.rect(2, 3, 4, 3, 'l')
    c.rect(1, 4, 12, 4, 'l')
    for y, x0, x1 in rows[5:]:
        c.rect(7, y, x1, y, 'N')
    c.rect(7, 5, 12, 5, 'N')
    c.rect(1, 5, 6, 5, 'n')
    c.pts('w', (3, 2), (4, 2), (3, 3), (6, 2))
    c.pts('y', (12, 1), (13, 0), (0, 8), (1, 9))


def esmeralda_eterna(c):
    esmeralda(c)
    c.pts('y', (6, 6), (7, 6), (6, 7), (7, 7), (11, 9), (2, 10))
    c.pts('w', (12, 2), (1, 2))


def bellota(c):
    c.rect(4, 1, 9, 2, 'B')
    c.rect(3, 2, 10, 4, 'b')
    c.rect(3, 2, 10, 2, 'B')
    c.pts('B', (6, 0), (7, 0), (7, 1))
    for y, x0, x1 in [(5, 4, 9), (6, 4, 9), (7, 4, 9), (8, 5, 8), (9, 5, 8), (10, 6, 7), (11, 6, 7)]:
        c.rect(x0, y, x1, y, 'o')
    c.rect(4, 5, 5, 8, 'y')
    c.rect(8, 6, 9, 8, 'Y')
    c.pts('w', (4, 3), (5, 3))


def brasa(c):
    flama(c, 7, 12, 12)


def perk_abono(c):
    c.ell(7, 9, 4.8, 4.2, 'b')
    c.rect(5, 4, 8, 5, 'B')
    c.pts('y', (5, 4), (8, 4))
    c.pts('B', (6, 8), (7, 9), (8, 8), (6, 10), (8, 10))
    c.line(7, 3, 7, 1, 'N')
    c.ell(5, 1, 2.2, 1.2, 'n')
    c.ell(9, 1, 2.2, 1.2, 'l')


def perk_comienzo(c):
    for y, c1, c2 in [(10, 'y', 'Y'), (7, 'y', 'Y'), (4, 'y', 'Y')]:
        c.rect(2, y, 11, y + 1, c1)
        c.rect(2, y + 2, 11, y + 2, c2)
        c.pts('w', (3, y))
    c.rect(9, 11, 11, 12, 'Y')
    c.pts('w', (5, 1), (6, 0), (7, 1), (6, 2))


def perk_manos(c):
    c.rect(3, 5, 10, 11, 'g')
    for x in (3, 5, 7, 9):
        c.rect(x, 2, x + 1, 5, 's')
    c.rect(0, 6, 2, 9, 's')
    c.pts('G', (4, 3), (6, 3), (8, 3), (10, 3), (4, 11), (7, 11), (10, 11), (5, 8), (8, 8))
    c.rect(3, 11, 10, 12, 'G')
    c.pts('w', (4, 6), (5, 6))


def perk_descanso(c):
    c.ell(6, 7, 5, 5, 'y')
    for y in range(N):
        for x in range(N):
            if ((x - 8.2) / 4.2) ** 2 + ((y - 5.8) / 4.2) ** 2 <= 1:
                c.g[y][x] = None
    c.pts('Y', (2, 8), (3, 9), (4, 10))
    c.pts('w', (9, 2), (10, 2), (11, 2), (10, 3), (9, 4), (10, 4), (11, 4))
    c.pts('c', (12, 9), (11, 11), (1, 1))


def perk_ahorro(c):
    for y, x0, x1 in [(2, 3, 9), (3, 2, 10), (4, 1, 11), (5, 1, 11), (6, 1, 11), (7, 1, 11), (8, 1, 11), (9, 2, 10), (10, 3, 9)]:
        c.rect(x0, y, x1, y, 'r')
    c.rect(1, 3, 2, 3, 'R')
    c.ell(3, 4, 1.2, 1.2, 'w')
    c.rect(6, 4, 9, 4, 'w')
    c.rect(6, 6, 9, 6, 'w')
    c.rect(5, 8, 9, 8, 'p')
    c.line(2, 4, 0, 1, 'y')
    c.pts('R', (3, 10), (9, 10))


def perk_vuelo(c):
    for (cx, cy, r) in [(7, 7, 4.5), (3, 3, 2.2), (11, 4, 2.2)]:
        c.ell(cx, cy, r, r, 'n')
        c.ell(cx - r * 0.25, cy - r * 0.3, r * 0.45, r * 0.45, 'l')
    c.ell(7, 8, 3, 3, 'N')
    c.ell(7, 7, 3, 3, 'n')
    c.pts('w', (5, 5), (6, 5), (5, 6), (3, 2), (11, 3))
    c.pts('y', (12, 10), (1, 9), (7, 12))


def perk_raices(c):
    c.rect(6, 3, 7, 8, 'B')
    c.ell(7, 3, 5, 3, 'n')
    c.ell(7, 2, 3, 1.4, 'l')
    c.line(6, 9, 3, 12, 'b')
    c.line(7, 9, 7, 13, 'b')
    c.line(7, 9, 11, 12, 'b')
    c.line(3, 12, 1, 13, 'b')
    c.line(11, 12, 13, 13, 'b')
    c.pts('B', (6, 9), (7, 9))
    c.pts('y', (3, 2), (11, 3))


GEMS = {
    'esmeralda': esmeralda, 'bellota': bellota, 'brasa': brasa, 'moneda': moneda,
    'perk-abono': perk_abono, 'perk-comienzo': perk_comienzo, 'perk-manos': perk_manos, 'perk-descanso': perk_descanso,
    'perk-ahorro': perk_ahorro, 'perk-vuelo': perk_vuelo, 'perk-raices': perk_raices,
}
