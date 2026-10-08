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


# ---------------------------------------------------------------- etapas del dragón (huevo, cría, joven, adulto, anciano)


def dragon_huevo(c):
    for y, x0, x1 in [(2, 5, 8), (3, 4, 9), (4, 3, 10), (5, 3, 10), (6, 2, 11), (7, 2, 11), (8, 2, 11), (9, 3, 10), (10, 3, 10), (11, 4, 9), (12, 5, 8)]:
        c.rect(x0, y, x1, y, 'w')
    c.rect(9, 5, 10, 11, 'W')
    c.pts('n', (5, 4), (6, 4), (4, 7), (5, 7), (8, 8), (9, 8), (6, 10), (7, 10), (7, 5))
    c.pts('N', (5, 5), (4, 8), (9, 9), (7, 11))
    c.pts('k', (6, 6), (7, 7), (6, 8))  # grieta


def dragon_cria(c):
    c.ell(7, 10, 4, 3, 'n')
    c.ell(7, 6, 3.6, 3.2, 'n')
    c.ell(7, 11, 2.4, 1.8, 'l')
    c.pts('w', (3, 3), (11, 3))
    c.pts('y', (4, 4), (10, 4))
    c.pts('k', (5, 6), (9, 6))
    c.pts('N', (6, 8), (8, 8))
    c.pts('N', (2, 9), (1, 9), (12, 9), (13, 9))
    c.pts('O', (7, 12))
    c.rect(4, 13, 5, 13, 'N')
    c.rect(9, 13, 10, 13, 'N')


def dragon_adulto(c):
    c.ell(7, 8, 5, 4.4, 'n')
    c.ell(7, 9, 3, 2.8, 'l')
    c.rect(0, 2, 3, 8, 'N')
    c.rect(11, 2, 14, 8, 'N')
    c.rect(1, 3, 2, 6, 'n')
    c.rect(12, 3, 13, 6, 'n')
    c.pts('w', (4, 1), (10, 1), (3, 0), (11, 0))
    c.pts('y', (4, 2), (10, 2))
    c.pts('y', (5, 6), (9, 6))
    c.pts('k', (5, 6), (9, 6))
    c.pts('N', (6, 8), (8, 8))
    c.pts('r', (6, 10), (7, 10), (8, 10))
    c.pts('O', (6, 11), (7, 12), (8, 11))
    c.rect(4, 12, 10, 13, 'n')
    c.pts('Y', (6, 3), (7, 2), (8, 3), (7, 4))


def dragon_anciano(c):
    c.ell(7, 8, 5, 4.4, 'y')
    c.ell(7, 9, 3, 2.8, 'w')
    c.rect(0, 2, 3, 8, 'O')
    c.rect(11, 2, 14, 8, 'O')
    c.rect(1, 3, 2, 6, 'y')
    c.rect(12, 3, 13, 6, 'y')
    c.pts('w', (4, 1), (10, 1), (3, 0), (11, 0))
    c.pts('r', (4, 2), (10, 2))
    c.pts('k', (5, 6), (9, 6))
    c.pts('W', (6, 8), (7, 9), (8, 8), (6, 10), (8, 10))  # barba
    c.pts('r', (6, 11), (7, 12), (8, 11))
    c.rect(4, 12, 10, 13, 'y')
    c.rect(5, 0, 9, 0, 'r')
    c.pts('y', (5, 1), (7, 1), (9, 1))
    c.pts('w', (12, 1), (1, 1), (13, 9))


CAVE.update({'dragon-0': dragon_huevo, 'dragon-1': dragon_cria, 'dragon-2': dragon, 'dragon-3': dragon_adulto, 'dragon-4': dragon_anciano})  # noqa: F821


# ---------------------------------------------------------------- compañeros nuevos: pato, mariposa y lagarto


def pato(c):
    c.ell(6.5, 9, 5.2, 3.8, 'y')                  # cuerpo
    c.ell(9.5, 4.5, 3, 3, 'y')                    # cabeza
    c.rect(11, 4, 13, 5, 'O')                     # pico
    c.pts('k', (9, 3))
    c.pts('Y', (2, 9), (3, 10), (4, 10), (5, 11))  # ala
    c.rect(1, 6, 2, 7, 'y')                       # cola
    c.rect(5, 12, 5, 13, 'O')
    c.rect(8, 12, 8, 13, 'O')
    c.pts('w', (7, 2), (4, 8))


def mariposa(c):
    c.ell(3.5, 4.5, 3.4, 3.4, 'm')                # alas de arriba
    c.ell(10.5, 4.5, 3.4, 3.4, 'm')
    c.ell(4, 9.5, 2.6, 2.6, 'p')                  # alas de abajo
    c.ell(10, 9.5, 2.6, 2.6, 'p')
    c.rect(6, 3, 7, 11, 'k')                      # cuerpo
    c.pts('w', (3, 3), (11, 3), (4, 9), (10, 9))
    c.pts('M', (2, 5), (12, 5), (1, 4), (13, 4))
    c.line(6, 3, 4, 0, 'k')
    c.line(7, 3, 9, 0, 'k')


def lagarto(c):
    c.ell(8, 8, 4.4, 2.8, 'n')                    # cuerpo
    c.ell(11.5, 7, 2.4, 2.2, 'n')                 # cabeza
    c.pts('k', (12, 6))
    c.pts('r', (13, 8), (13, 9))                  # lengua
    c.line(4, 8, 1, 11, 'N')                      # cola
    c.line(1, 11, 3, 13, 'N')
    c.pts('N', (4, 9), (3, 10), (2, 12))
    c.rect(5, 10, 6, 12, 'n')                     # patas
    c.rect(10, 10, 11, 12, 'n')
    c.pts('l', (6, 7), (8, 6), (10, 7), (7, 8))
    c.pts('y', (9, 5))


COMPANIONS.update({'pato': pato, 'mariposa': mariposa, 'lagarto': lagarto})  # noqa: F821


# ---------------------------------------------------------------- criaturas del Nido (huevo, cría, joven, adulta)


def huevo(c, base, spot, shade, light):
    c.ell(7, 7.5, 4.4, 5.6, base)
    for y in range(N):
        for x in range(N):
            if c.g[y][x] == base and x >= 10:
                c.g[y][x] = shade
    c.pts(spot, (5, 5), (8, 9), (9, 4), (6, 10), (7, 7))
    c.pts(light, (5, 3), (5, 4), (6, 3))


def fenix_0(c):
    huevo(c, 'r', 'O', 'R', 'p')


def fenix_1(c):
    c.ell(7, 9, 4.4, 3.8, 'r')
    c.ell(7, 5, 3.2, 3, 'r')
    c.ell(7, 10.5, 2, 1.5, 'O')
    c.pts('k', (5, 4), (9, 4))
    c.rect(6, 6, 8, 6, 'y')
    c.pts('O', (7, 1), (6, 2), (8, 2))
    c.pts('R', (2, 9), (3, 10), (12, 9), (11, 10))
    c.pts('y', (5, 13), (9, 13), (4, 13), (10, 13))


def fenix_2(c):
    c.ell(7, 9, 5.4, 4.2, 'r')
    c.ell(7, 4.5, 3, 2.8, 'r')
    c.pts('y', (7, 0), (7, 1))
    c.pts('O', (6, 1), (8, 1), (6, 2), (8, 2))
    c.pts('k', (5, 4), (9, 4))
    c.pts('y', (7, 5), (7, 6))
    c.rect(1, 7, 3, 11, 'R')
    c.rect(11, 7, 13, 11, 'R')
    c.pts('O', (13, 5), (13, 6), (12, 6))
    c.pts('y', (13, 4), (12, 5))
    c.pts('O', (7, 10), (6, 11), (8, 11))
    c.pts('y', (5, 13), (9, 13), (4, 13), (10, 13))


def fenix_3(c):
    for y, x0, x1 in [(2, 0, 3), (3, 0, 4), (4, 0, 5), (5, 0, 5), (6, 1, 5), (7, 2, 5), (8, 3, 5)]:
        c.rect(x0, y, x1, y, 'O')
        c.rect(13 - x1, y, 13 - x0, y, 'O')
    c.pts('y', (0, 2), (0, 3), (13, 2), (13, 3), (1, 4), (12, 4))
    c.ell(7, 8, 3.2, 4.4, 'r')
    c.ell(7, 4, 2.4, 2.4, 'r')
    c.pts('y', (6, 0), (7, 0), (8, 0), (7, 1))
    c.pts('O', (6, 1), (8, 1))
    c.pts('k', (6, 4), (8, 4))
    c.pts('y', (7, 5), (7, 6))
    c.pts('O', (6, 11), (7, 12), (8, 11), (7, 13))
    c.pts('y', (7, 11), (6, 12), (8, 12))


def tiburon_0(c):
    huevo(c, 'C', 'c', 'D', 'w')
    c.pts('c', (5, 7), (6, 8), (7, 7), (8, 8), (9, 7))


def tiburon_1(c):
    c.ell(7, 7.5, 4.6, 3, 'C')
    c.rect(0, 5, 2, 10, 'D')
    c.pts('D', (6, 3), (7, 4), (8, 4))
    c.pts('c', (6, 9), (7, 9), (8, 9))
    c.pts('w', (9, 6))
    c.pts('k', (10, 6), (12, 8))


def tiburon_2(c):
    c.ell(7.5, 7.5, 5.4, 4.4, 'C')
    c.ell(7.5, 10, 4.2, 1.8, 'O')
    c.rect(0, 4, 2, 11, 'D')
    c.rect(5, 2, 8, 3, 'D')
    c.pts('k', (11, 7), (12, 8), (11, 9), (12, 9))
    c.pts('w', (11, 6), (12, 7), (10, 8), (11, 10), (12, 10), (13, 9))
    c.pts('y', (9, 5))
    c.pts('k', (9, 5))
    c.pts('D', (8, 4), (9, 4), (10, 4))


def tiburon_3(c):
    c.ell(7, 8, 6.5, 3.4, 'g')
    c.ell(7, 9.4, 5.2, 1.6, 'w')
    c.pts('G', (7, 1), (6, 2), (7, 2), (5, 3), (6, 3), (7, 3), (7, 4), (6, 4))
    c.rect(0, 3, 2, 5, 'G')
    c.rect(0, 9, 2, 11, 'G')
    c.rect(9, 9, 13, 9, 'k')
    c.pts('w', (9, 8), (11, 8), (13, 8), (10, 10), (12, 10))
    c.pts('r', (10, 6))
    c.pts('G', (6, 7), (6, 8), (6, 9), (3, 7))


def ornitorrinco_0(c):
    huevo(c, 'b', 'B', 'B', 'o')


def ornitorrinco_1(c):
    c.ell(7, 9, 5, 3.8, 'o')
    c.ell(5, 5.5, 2.6, 2.6, 'b')
    c.ell(9.5, 6.5, 2.2, 2.4, 'o')
    c.pts('p', (3, 10), (11, 10), (8, 12))
    c.pts('w', (5, 5))
    c.pts('k', (6, 5), (10, 8))
    c.pts('B', (4, 11), (7, 10), (9, 11), (10, 5), (3, 6))


def ornitorrinco_2(c):
    c.ell(6.5, 9, 4.6, 3, 'b')
    c.ell(10, 7, 2.6, 2.4, 'b')
    c.rect(11, 8, 13, 9, 'O')
    c.pts('Y', (12, 9), (13, 9))
    c.pts('k', (10, 6))
    c.rect(0, 9, 2, 11, 'B')
    c.rect(3, 12, 5, 12, 'O')
    c.rect(7, 12, 9, 12, 'O')
    c.ell(6.5, 10, 2.6, 1.4, 'o')


def ornitorrinco_3(c):
    c.ell(6.5, 8, 5.4, 4.2, 'b')
    c.ell(10.5, 5.5, 3, 2.8, 'b')
    c.rect(11, 6, 13, 8, 'O')
    c.rect(11, 8, 13, 8, 'Y')
    c.rect(9, 4, 12, 5, 'k')
    c.pts('w', (10, 4))
    c.rect(0, 8, 2, 11, 'B')
    c.rect(2, 12, 5, 13, 'O')
    c.rect(7, 12, 10, 13, 'O')
    c.ell(6.5, 9.5, 3, 2, 'o')
    c.pts('y', (3, 11))


CREATURES = {
    'fenix-0': fenix_0, 'fenix-1': fenix_1, 'fenix-2': fenix_2, 'fenix-3': fenix_3,
    'tiburon-0': tiburon_0, 'tiburon-1': tiburon_1, 'tiburon-2': tiburon_2, 'tiburon-3': tiburon_3,
    'ornitorrinco-0': ornitorrinco_0, 'ornitorrinco-1': ornitorrinco_1, 'ornitorrinco-2': ornitorrinco_2, 'ornitorrinco-3': ornitorrinco_3,
}


def nido(c):
    c.ell(7, 6.5, 3.8, 5, 'w')
    c.pts('W', (9, 4), (10, 6), (9, 8), (8, 9))
    c.pts('p', (6, 4), (8, 6), (5, 7), (7, 9))
    c.ell(7, 11, 6, 2.4, 'b')
    c.pts('B', (3, 11), (5, 12), (8, 12), (10, 11), (7, 10), (11, 12))
    c.pts('o', (2, 10), (12, 10), (4, 13), (9, 13))


def r_fenix(c):
    r = 2 ** 0.5
    for y in range(N):
        for x in range(N):
            u = ((x - 7.5) + (6.5 - y)) / r
            v = ((x - 7.5) - (6.5 - y)) / r
            if (u / 6.2) ** 2 + (v / 2.9) ** 2 <= 1:
                c.p(x, y, 'y' if abs(v) < 0.55 else ('O' if v > 0 else 'r'))
    c.line(1, 13, 4, 10, 'B')
    c.pts('w', (10, 3), (11, 2), (7, 5), (12, 0), (1, 5))


def r_diente(c):
    for y, x0, x1 in [(2, 5, 8), (3, 4, 9), (4, 4, 9), (5, 4, 9), (6, 4, 9), (7, 5, 8), (8, 5, 8), (9, 6, 8), (10, 6, 7), (11, 7, 7)]:
        c.rect(x0, y, x1, y, 'w')
    c.rect(3, 1, 10, 2, 'p')
    c.rect(8, 3, 9, 7, 'W')
    c.pts('s', (5, 4), (5, 5))
    c.pts('y', (12, 4), (1, 8), (11, 11))


def r_pico_ornit(c):
    for y, x0, x1, col in [(5, 4, 10, 'O'), (6, 2, 12, 'O'), (7, 1, 13, 'O'), (8, 1, 13, 'Y'), (9, 2, 12, 'Y'), (10, 4, 10, 'Y')]:
        c.rect(x0, y, x1, y, col)
    c.pts('k', (4, 6), (9, 6))
    c.pts('y', (3, 7), (5, 6), (7, 6))
    c.pts('w', (12, 2), (1, 3), (7, 2))


NEW_RELICS = {'pluma-de-fenix': r_fenix, 'diente-de-tiburon': r_diente, 'pico-de-ornitorrinco': r_pico_ornit}


def perk_compania(c):
    c.ell(6, 9, 3.4, 3, 'p')
    for x, y in [(2, 5), (4, 2), (8, 2), (10, 5)]:
        c.ell(x, y, 1.5, 1.8, 'p')
    c.pts('P', (5, 10), (7, 10))
    c.rect(11, 8, 11, 13, 'y')
    c.rect(9, 10, 13, 11, 'y')
    c.pts('w', (11, 9), (10, 10))


def perk_parcelas(c):
    for x0, y0 in [(1, 6), (7, 6), (1, 10), (7, 10)]:
        c.rect(x0, y0, x0 + 4, y0 + 3, 'b')
        c.rect(x0, y0 + 3, x0 + 4, y0 + 3, 'B')
    c.line(4, 5, 4, 2, 'N')
    c.ell(2.5, 2, 2, 1.2, 'n')
    c.ell(5.8, 1.5, 2, 1.2, 'l')
    c.pts('n', (9, 8), (10, 7), (9, 7))


def perk_crecimiento(c):
    c.ell(5, 12, 4.5, 1.4, 'B')
    c.line(5, 12, 5, 6, 'N')
    c.ell(3, 7, 2.4, 1.5, 'n')
    c.ell(7, 6, 2.4, 1.5, 'l')
    c.rect(11, 3, 11, 10, 'y')
    c.pts('y', (10, 4), (12, 4), (9, 5), (13, 5))
    c.pts('Y', (11, 11), (11, 12))


def perk_polen(c):
    petals(c, 4, 9, 'p', 'y', 2.4, 1.5, 6)
    c.line(4, 11, 4, 13, 'N')
    c.pts('y', (9, 2), (11, 4), (8, 5), (12, 1), (10, 7), (7, 3))
    c.pts('Y', (9, 3), (11, 5))


def perk_rocio(c):
    for y, hw in zip(range(3, 12), [0, 1, 1, 2, 3, 3, 4, 4, 3]):
        c.rect(7 - hw, y, 6 + hw + 1, y, 'c')
    c.rect(4, 8, 5, 10, 'w')
    c.rect(10, 9, 10, 11, 'C')
    c.pts('w', (6, 5), (6, 6))
    c.pts('c', (2, 3), (12, 2), (11, 12))


def perk_soplido(c):
    c.line(1, 4, 10, 4, 'w')
    c.line(1, 7, 12, 7, 'W')
    c.line(1, 10, 9, 10, 'w')
    c.pts('w', (11, 3), (12, 4), (11, 5), (13, 8), (12, 9), (10, 11), (10, 9))
    c.pts('O', (12, 6), (13, 7), (11, 6))
    c.pts('y', (12, 7))


GEMS = {
    'nav-nido': nido, 'perk-nidos': nido, 'perk-topo': topo,
    'perk-compania': perk_compania, 'perk-parcelas': perk_parcelas, 'perk-crecimiento': perk_crecimiento, 'perk-polen': perk_polen,
    'perk-rocio': perk_rocio, 'perk-soplido': perk_soplido, 'perk-brillo': destello, 'perk-brasas': brasa, 'perk-hornos': horno,
    'perk-calor': dragon,
    'esmeralda': esmeralda, 'bellota': bellota, 'brasa': brasa, 'moneda': moneda,
    'perk-abono': perk_abono, 'perk-comienzo': perk_comienzo, 'perk-manos': perk_manos, 'perk-descanso': perk_descanso,
    'perk-ahorro': perk_ahorro, 'perk-vuelo': perk_vuelo, 'perk-raices': perk_raices,
}
