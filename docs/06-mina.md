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
| **Lo que falta** | Cada herramienta que no puedes pagar dice lo que te falta y el tiempo estimado; también la siguiente por desbloquear: se ve su precio y lo que falta (solo el nombre y el dibujo salen difuminados). |
| **Descubrir** | Solo ves las herramientas que ya has podido comprar; la siguiente sale difuminada (menos cuanto más cerca) y un aviso dice que hay más. |
| **Ascender** | Se desbloquea al tener la herramienta 8 (para siempre). Plumas: `floor((ganado en la vida / 100.000)^0,25 · (1 + Plumas al viento))` menos las ya cobradas, así que nunca se pierde nada por ascender pronto. Cada pluma da +2 % de producción. |
| **Ventajas** | Abono (×1,1 producción, sin tope), Buen comienzo (monedas al empezar), Manos de acero (pico ×), Siesta larga (+1 h offline), Regateo (herramientas más baratas), Plumas al viento, Raíces profundas. |
| **Inercia** | Cada pico sube una barra (+3 %, tope 100 %) que baja sola (−4 % por segundo). Multiplica la producción de ×1 a ×5 según lo llena que esté. Picar seguido (≈1,3 picos por segundo) la mantiene. La reliquia *Muelle mágico* sube el tope. |
| **Mejoras globales** | 8 mejoras de ×1,5 a **toda** la producción, que aparecen al ganar ciertas cantidades en total (500, 50 K, 5 M… ) y se compran con monedas desde la pantalla de Picar. Se pierden al ascender. |
| **Bellotas** | Segunda moneda: el cerdito viajero da siempre 1 al aceptarlo (además de su recompensa). Sirven para cosméticos. |
| **Pieles y compañeros** | En la pestaña *Cerdito*: pieles (color del cerdito) y compañeros (animales que van en la escena, hasta 2). Se compran con bellotas o los regalan logros (piel dorada a 1.000 M, plateada a 5 ascensiones, lila a 10.000 picos, dragoncito a 10 ascensiones). De momento son de adorno. |
| **Reliquias** | 7 bonos permanentes que da un logro concreto (callo de oro = pico ×2, pico ancestral = producción ×1,1, pluma eterna, reloj de bolsillo…). No se compran. |
| **Estadísticas** | En la pestaña *Logros*: monedas ganadas, mejor ingreso por segundo, picos, tiempo de juego, ascensiones, plumas, herramientas, mejoras, cerditos viajeros, logros y reliquias. |
| **Cesta** | Se llena con el 25 % de tus ingresos (tope 30 min); "Recoger" la suma a tus monedas. |
| **Cerdito viajero** | Aparece al azar cada 1-2 min con el juego abierto: 30 s de ingresos de golpe, o ×3 de producción y de picos durante 15 s (el dorado, 10 %: 3 min de ingresos y ×5 durante 25 s). Se va a los 20 s. Siempre da 1 bellota. |
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

Tranquilo por defecto: sin cajas ni gacha, sin rachas ni recompensas diarias, sin notificaciones, sin monetización, sin comparación social, requisitos siempre visibles. Excepciones decididas por el usuario: el cerdito viajero (azar y se va a los 20 s), picar como acción activa y el tope offline de 2 h. Ver CLAUDE.md.

## Estado de la implementación

- El cerdito se ve con la herramienta mejor en la mano, los complementos según lo que tiene y un chip por cada herramienta comprada (con su cantidad).
- Los números grandes salen con sufijos desde 10.000: 12,3 K, 1,23 M, 4,5 B, T, Qa, Qi… (científica a partir de 1e36).
- Núcleo, guardado (versión 7; la v6→v7 añade los campos nuevos; la migración v5→v6 da por compradas las mejoras que ya correspondían), interfaz básica y tests: hechos. Las partidas de versiones anteriores (1-4) no se pueden convertir y se descartan.
- **Calibración** (`npm run calibrate`, un jugador simulado que ve el juego cada minuto): primera ascensión a las ~4,5 horas (hay que comprar también las mejoras), las 12 herramientas hacia las 12 horas y estancamiento tras ~1 día. Es una primera pasada: a afinar jugando (coste, hitos, plumas).
- **Pendiente**: arte (hoy un cerdito SVG con complementos y emojis), sonido opcional y más contenido si hace falta.

## Compañeros y Cueva del Dragón

Se llevan hasta 2 a la vez. Topo: 1 bellota cada 40 picos. Perro: ×1,1 a la mejor herramienta. Pájaro: el cerdito viajero llega un tercio más rápido. Gato: regalo de monedas cada 2 min. Conejo: 1 herramienta gratis cada 6 h reales. La **Cueva del Dragón** ya no es un compañero: se abre al conseguir 10 plumas en total (pestaña propia, permanente): brasas, 4 hornos y un árbol por ramas (Fuego, Escamas, Tesoro) que da hasta ~×1,33 a la producción, más inercia, cesta, estancia del visitante y offline. Contenido en `src/content/cave.ts`.

### Mejoras de compañeros, Jardín y visitante dorado

- **Mejoras de compañeros** (todos menos el dragón): 3 niveles con bellotas en la pestaña Cerdito; cada nivel sustituye la habilidad por una mejor (`upgrades` en `content/game.ts`).
- **Jardín** (`content/garden.ts`): 4 parcelas, 8 flores que tardan de 1 a 24 h de reloj real (también con el juego cerrado). Se abre al ganar 1 millón en total. Plantar es gratis y al recoger da un bono TEMPORAL (×1,5 un minuto, picos ×2, herramientas más baratas, inercia más alta, ingresos de golpe…); 10 % de que salga brillante (dura el doble). Cada flor se desbloquea al recoger la anterior.
- **Cerdito viajero dorado**: 10 % de las visitas; da 30 min de ingresos, ×7 durante 90 s y 3 bellotas. La tarjeta del visitante es ahora flotante sobre la navegación, con cuenta atrás y vibración.
- **Inercia**: empieza en ×1,5 de tope y sube con 6 mejoras de monedas (+0,5 cada una, en la lista de mejoras de la pestaña Picar, se pierden al ascender), reliquias y ventajas. Se empieza con 4 bellotas.
- **Costes**: `costGrowth` 1,15 → 1,17 y mejoras de herramienta ×7 (antes ×5).

### Revisión de economía y jardín (2026-10-07)

- **Herramientas**: 18, con los costes y la producción base de los edificios de Cookie Clicker (wiki: precio × 1,15^n; aquí `costGrowth` 1,17). Cada una cuesta ~12-15× la anterior y produce ~5-8×, así que las altas tardan horas en amortizarse. Con `npm run calibrate`, un jugador óptimo asciende por primera vez a las ~9 h.
- **Plumas**: como las fichas celestiales (1 por cada raíz cúbica de lo ganado entre 1e8; cada pluma +1 %). La Cueva pide 10 plumas en total y el Jardín 5.
- **Inercia**: tope ×1,25 y 6 mejoras de +0,15. Picar da 0,05 s de producción (mín. 1 moneda). Las mejoras globales ×1,5 se desbloquean mucho más tarde.
- **Jardín**: cuadrícula 5×5, plantar gratis, flores comunes de 1-20 min con bonos pequeños y raras de 1-12 h con bonos grandes. Dos flores vecinas maduras se cruzan en una casilla vacía (cada 30 s, 25 %, determinista) y dan flores nuevas; la receta se ve en la lista.
- **Interfaz**: Picar tiene dos secciones (Herramientas / Mejoras); Diario va dentro de Logros.

### Arte (pixel art)

Todo el arte nuevo está dibujado por código, sin imágenes de IA: `tools/make-pig-pixel.py` (el cerdito y sus pieles, `public/pig/`) y `tools/make-pixel-art.py` (18 herramientas y 6 compañeros en 16×16, `public/art/`). Se regeneran con `python tools/make-pig-pixel.py` y `python tools/make-pixel-art.py`. También están dibujadas las flores, los brotes, los hornos y ramas de la cueva, el dragón, el menú, los logros y las mejoras (carpetas de `public/art/`). Quedan con emoji las reliquias y algunos textos sueltos. El cerdito viajero usa la piel dorada. `tools/make-pig-sprites.py` limpia imágenes generadas con IA, por si se vuelve a usar.

### Estilo visual (tema pixel)

Fuente **Jersey 10** (OFL, alojada en `public/fonts/`; se probaron otras pixeladas y esta es la que distingue bien el 5 de la S y el 0 de la O). Paneles y botones con borde grueso oscuro y sombra dura sin difuminar; los botones se hunden con `transform` sin cambiar de tamaño (nada se mueve alrededor). Escena con cielo y hierba planos; barras en bloques. Todo el tema está en el último bloque de `src/ui/styles.css`. Las reliquias también tienen sprite (`public/art/relics/`). Mantener pulsado el botón de comprar herramienta repite la compra.

### Esmeraldas y árbol de ventajas

- Las **plumas** pasan a llamarse **esmeraldas** (solo en pantalla; en el código y el guardado siguen como `plumas`). Hay sprite de esmeralda, bellota y moneda.
- El **cerdito viajero** da 2 bellotas (el dorado, 6).
- **Ascender** muestra un árbol de ventajas (`src/ui/views/perkTreeView.ts`): cada nivel de cada ventaja es un círculo con el dibujo de la ventaja, unidos por líneas. Todas tienen tope de 5 niveles. El Abono es la raíz (horizontal) y cada uno de sus niveles abre una rama (`requiresLevel` en `content/perks.ts`: Buen comienzo con el nivel 1, Manos con el 2, Siesta con el 3, Regateo con el 4); Veta rica (antes Plumas al viento) y Raíces profundas cuelgan del Regateo y la Veta. Las posiciones están en `layout`. Tocar un círculo abre un cuadro con el efecto, el coste y el botón de comprar.
- En la pestaña *Cerdito* van primero los compañeros y debajo las pieles.
- El cerdito respira (dos fotogramas) y se agacha al picar; con *Efectos* desactivado o con `prefers-reduced-motion` no se anima. El icono de la app y el favicon son el cerdito sobre cielo y hierba (`python tools/make-app-icons.py`).
- **Ramas nuevas del árbol:** *Un amigo más* (tercer compañero a la vez; pide Abono al nivel 5) y dos zonas con rótulo, abajo del todo: **Jardín** (Más tierra +1 fila por nivel hasta 3, Tierra buena flores ×0,9 de tiempo, Mucho polen +5 % de cruce, Rocío +20 % de duración, Ojo para lo brillante +2 %) y **Cueva** (Más brasas +25 %, Soplido potente +50 %, Hornos de saldo ×0,92, Calor del dragón ×1,05 a la producción). Cada zona pide 5 y 10 esmeraldas en total (`requiresPlumasTotal`) y sus ventajas forman una escalera. Los efectos nuevos viven en `core/perkEffects.ts`. El tercer compañero va subido en el lomo del cerdito.

### Dragón que crece, lluvia de esmeraldas, pista del topo

- **Dragón** (cueva): 5 etapas (huevo, cría, joven, adulto, anciano) que se compran con brasas (200, 20 K, 2 M, 500 M). Cada una da bonos acumulados a la producción (×1,05 a ×1,15) y a las brasas (×1,2 a ×1,5). Datos en `content/cave.ts` (`dragon`), sprites `cave/dragon-0..4`. Logros por etapa.
- **Ascender** lanza una lluvia de esmeraldas con el total ganado (`ui/effects.ts`; se apaga con los efectos).
- **Pista del topo**: la primera vez que se abre la pestaña Cerdito sin llevar al topo, una caja amarilla dice que lo compres y lo equipes (`localStorage`: `cerditos:hint-topo`).

### Pato, mariposa, lagarto, prendas y pantalla principal (guardado v14)

- **Compañeros nuevos:** Pato jardinero (flores ×0,85 de tiempo), Mariposa (+5 % de cruce y +2 % de brillante) y Lagarto de fuego (brasas ×1,25); cada uno con 3 mejoras de bellotas. Sus efectos se leen con `activeAbilities` (`core/perkEffects.ts`).
- **Aspecto del cerdito** (pestaña Cerdito): cuatro secciones, Color (pieles), Gorro, Ropa y Cola. Las prendas (`content/accessories.ts`) son capas PNG del mismo lienzo que el cerdito (36×30, `public/pig/acc/`, `tools/make-pig-accessories.py`), apiladas sobre el sprite (`pigStack` en `ui/art.ts`). Se compran con bellotas o las da un logro. Para añadir una prenda: dibujarla en el script, añadirla a `ACCESSORIES` y regenerar.
- **Pantalla principal:** ingresos junto a las bellotas, gema de ascender flotando arriba a la derecha (abre el menú de ascender y se mece cuando hay esmeraldas que cobrar), se pica tocando al cerdito (sin botón), los números salen por delante y la compra ×1/×10/Máx se queda pegada bajo la cabecera.
- **Logros:** las reliquias van aquí (donde estaba la gráfica de ingresos, que se ha quitado).
