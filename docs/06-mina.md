# 06 · Cerdito picador (diseño y guía)

> Desde 2026-10-06 el juego es **un solo cerdito que pica**. Sustituye al juego de las granjas con mundos (documentos antiguos en [archivo-granjas/](archivo-granjas/), solo como referencia) y a una primera versión "mina" con zonas, recursos y piezas que no convenció. Este documento dice cómo es el juego y sirve de guía de juego.

## Idea

Un idle clásico y claro, con un único personaje:

- Al empezar **no ganas nada por segundo**: picas tú. Cada pico da 1 moneda.
- Con 10 monedas compras el **Pico de madera**: ahora el cerdito gana **0,1 monedas por segundo**.
- Hay **12 herramientas**, cada una más cara y que da muchísimo más que la anterior. Cada compra encarece la siguiente unidad un 15 %.
- Al **tener 5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400 y 500** unidades de una herramienta se **desbloquea una mejora**: hay que **comprarla** (cuesta 5× el precio de la unidad que la desbloquea) y entonces esa herramienta **produce ×2** (acumulable, en orden).
- Al **conseguir la herramienta 8** (la Grúa perforadora) puedes **ascender**: reinicias monedas y herramientas a cambio de **plumas**, que dan un bono de producción y se gastan en **ventajas permanentes**.

Sin mundos, sin recursos y sin mecánicas especiales por herramienta: todas funcionan igual y solo cambian los números.

## Mecánicas

| Mecánica | Cómo funciona |
|---|---|
| **Picar** | Da 1 s de tu producción (mínimo 1 moneda). Con *Manos de acero* da más. |
| **Herramientas** | Coste de la unidad *n*: `baseCost · 1,15^n`. Compra ×1, ×10 (todo o nada) o Máx. |
| **Mejoras** | A 5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400 y 500 unidades se desbloquea la siguiente mejora de esa herramienta (×2 de producción); se compra con monedas desde la propia fila ("Mejora ×2 (101)"). Mientras está bloqueada, la fila dice cuántas unidades faltan. |
| **Descubrir** | Solo ves las herramientas que ya has podido comprar; la siguiente sale difuminada (menos cuanto más cerca) y un aviso dice que hay más. |
| **Ascender** | Se desbloquea al tener la herramienta 8 (para siempre). Plumas: `floor((ganado en la vida / 100.000)^0,25 · (1 + Plumas al viento))` menos las ya cobradas, así que nunca se pierde nada por ascender pronto. Cada pluma da +2 % de producción. |
| **Ventajas** | Abono (×1,1 producción, sin tope), Buen comienzo (monedas al empezar), Manos de acero (pico ×), Siesta larga (+1 h offline), Regateo (herramientas más baratas), Plumas al viento, Raíces profundas. |
| **Cesta** | Se llena con el 25 % de tus ingresos (tope 30 min); "Recoger" la suma a tus monedas. |
| **Cerdito viajero** | Aparece al azar cada 1-2 min con el juego abierto: 10 min de ingresos de golpe, o ×5 de producción y de picos durante 60 s. Se va a los 10 s. |
| **Offline** | Al volver cuentan solo las primeras 2 horas de ausencia (más con *Siesta larga*). |
| **Logros** | 126, sin bonos: generales (picos, ascensiones, plumas, monedas) y uno por herramienta y cantidad (1, 5, 15, 25, 50, 75, 100, 150, 200, 250). |

## Las 12 herramientas

| # | Herramienta | Coste base | Da por unidad |
|---|---|---|---|
| 1 | ⛏️ Pico de madera | 10 | 0,1/s |
| 2 | 🪣 Cubo y pala | 110 | 0,8/s |
| 3 | 🔨 Martillo de piedra | 1.210 | 6,4/s |
| 4 | 🪓 Hacha de hierro | 13.300 | 51/s |
| 5 | 🧨 Dinamita de feria | 146.000 | 410/s |
| 6 | 🛠️ Taladro de vapor | 1,61 M | 3.277/s |
| 7 | 🚜 Excavadora | 17,7 M | 26.214/s |
| 8 | 🏗️ Grúa perforadora (**permite ascender**) | 195 M | 209.715/s |
| 9 | 🔦 Láser de cristal | 2,1 mil M | 1,68 M/s |
| 10 | ⚡ Taladro de plasma | 24 mil M | 13,4 M/s |
| 11 | 🚀 Cohete excavador | 260 mil M | 107 M/s |
| 12 | 🌌 Agujero negro portátil | 2,9 B | 860 M/s |

Todos los números están en `src/content/game.ts`.

## Reglas de diseño que se mantienen

Tranquilo por defecto: sin cajas ni gacha, sin rachas ni recompensas diarias, sin notificaciones, sin monetización, sin comparación social, requisitos siempre visibles. Excepciones decididas por el usuario: el cerdito viajero (azar y se va a los 10 s), picar como acción activa y el tope offline de 2 h. Ver CLAUDE.md.

## Estado de la implementación

- El cerdito se ve con la herramienta mejor en la mano, los complementos según lo que tiene y un chip por cada herramienta comprada (con su cantidad).
- Núcleo, guardado (versión 6; la migración v5→v6 da por compradas las mejoras que ya correspondían), interfaz básica y tests: hechos. Las partidas de versiones anteriores (1-4) no se pueden convertir y se descartan.
- **Calibración** (`npm run calibrate`, un jugador simulado que ve el juego cada minuto): primera ascensión a las ~4,5 horas (hay que comprar también las mejoras), las 12 herramientas hacia las 12 horas y estancamiento tras ~1 día. Es una primera pasada: a afinar jugando (coste, hitos, plumas).
- **Pendiente**: arte (hoy un cerdito SVG con complementos y emojis), sonido opcional y más contenido si hace falta.
