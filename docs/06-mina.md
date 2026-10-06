# 06 · Cerdito minero (diseño y guía)

> Desde 2026-10-06 el juego es **una sola mina** con un cerdito minero. Sustituye al juego de las granjas y los mundos (diseño, economía y plan antiguos en [archivo-granjas/](archivo-granjas/), solo como referencia histórica). Este documento dice cómo es el juego y sirve de guía de juego.

## Por qué el cambio

El juego de granjas era un incremental puro: números que suben y cinco mundos que repetían el mismo bucle con otra regla, sin una razón propia cada uno. Se rehízo con la idea de los idle de mina (personaje que cava, zonas por profundidad, piezas, subir a la superficie por mejoras permanentes): **un personaje, una escena, una acción activa que importa y progreso por zonas**, dejando el juego tranquilo y "para dejar en idle".

## Bucle

```
el cerdito cava solo ──► rompe bloques ──► monedas + material de la zona ──► sube piezas ──► cava más
        ▲                                                                                         │
        └── subir a la superficie: pierdes la ronda, ganas plumas ──► ventajas permanentes ◄──────┘
```

- **Cavar**: el cerdito rompe un bloque por nivel. La vida del bloque crece ×1,16 por nivel y sus monedas ×1,12. Mientras no tocas nada, cava solo, también offline.
- **Picar** (activo): cada toque equivale a 1 s de cavado (más con los Guantes). Con el ×5 del visitante, también ×5.
- **Zonas**: cada 20 niveles cambia la zona (8 zonas; la última no acaba). Cada una suelta su **material** y tiene su **peligro**.
- **Peligros**: sin la pieza que lo resiste, cavas al 25 %. Cada pieza de resistencia pide un nivel (5 + 3 por zona) para anular su peligro; a medias, frena a medias.
- **Elegir zona**: puedes quedarte cavando en una zona ya alcanzada (en su último nivel) para juntar sus materiales, o ir avanzando. Es la decisión central de la ronda.
- **Piezas** (14): suben de nivel con monedas y, casi todas, con el material de una zona. Cada ×2 a los niveles 10, 25, 50 y 100 de la pieza.
- **Subir a la superficie** (ascensión): cobras plumas según el nivel más hondo de la ronda (`0,05 · nivel^1,6`, más con *Plumas al viento*), pierdes monedas, materiales y piezas, y conservas plumas, ventajas, logros y récords. Cada pluma da +2 % de cavado de forma permanente.
- **Ventajas permanentes** (plumas): Abono (×1,1 cavado, sin tope), Buen comienzo (monedas iniciales), Atajo conocido (empiezas más hondo), Siesta larga (+1 h de producción offline por nivel), Regateo (piezas más baratas), Plumas al viento, Raíces profundas.

## Las 14 piezas

Las 5 primeras están desde el principio; el resto necesita llegar a cierto nivel de la mina **y** haber subido a la superficie varias veces (así hacen falta varias subidas para tenerlas todas, hasta 6).

| Pieza | Efecto | Se desbloquea |
|---|---|---|
| ⛏️ Rascador de hocico | +1 de cavado por nivel | desde el inicio |
| 🥾 Botas de goma | resiste la Humedad (Arcilla) | nivel 5 |
| 🧤 Guantes de lana | cada pico ×(1 + 0,25·nivel) | nivel 3 |
| 👑 Corona de latón | +10 % de monedas por nivel | nivel 8 |
| ⛑️ Casco minero | resiste los Derrumbes (Roca) | nivel 18 |
| 🎒 Mochila con remiendos | +15 % de materiales por nivel | nivel 15 + 1 subida |
| 🏮 Linterna de luciérnagas | resiste la Oscuridad (Cueva) | nivel 38 + 1 subida |
| 🧨 Dinamita de feria | habilidad activa: avanza 30 s + 6 s/nivel de cavado de golpe (recarga 90 s) | nivel 30 + 2 subidas |
| 🧣 Capa para el frío | resiste el Frío (Hielo) | nivel 58 + 2 subidas |
| 🦔 Topo ayudante | +6 de cavado por nivel | nivel 50 + 3 subidas |
| 🕶️ Gafas de sol | resiste el Resplandor (Cristales) | nivel 78 + 3 subidas |
| 🛠️ Taladro de vapor | cavado ×(1 + 0,2·nivel) | nivel 70 + 4 subidas |
| 🧯 Traje ignífugo | resiste el Calor (Magma) | nivel 98 + 5 subidas |
| 😷 Máscara de aire | resiste el Gas (Abismo) | nivel 118 + 6 subidas |

Las piezas bloqueadas se ven siempre con lo que falta para desbloquearlas.

## Zonas y materiales

| Niveles | Zona | Material | Peligro |
|---|---|---|---|
| 1-20 | 🟫 Tierra blanda | Raíces | — |
| 21-40 | 🧱 Arcilla | Arcilla | Humedad |
| 41-60 | 🪨 Roca | Piedra | Derrumbes |
| 61-80 | 🕳️ Cueva oscura | Cobre | Oscuridad |
| 81-100 | 🧊 Cueva de hielo | Hielo | Frío |
| 101-120 | 💎 Cristales | Cristal | Resplandor |
| 121-140 | 🌋 Magma | Obsidiana | Calor |
| 141+ | 🌌 El abismo | Polvo de estrella | Gas |

Cada pieza de resistencia cuesta el material de la zona **anterior** a la que protege (por eso conviene "quedarse" en una zona a farmear).

## Cuando no estás

- Al volver se calcula lo ocurrido con las mismas reglas, pero **solo cuentan las primeras 2 horas** de ausencia (más con *Siesta larga*).
- Dentro del juego: la **cesta de la mina** se llena con un 25 % de tus ingresos (tope 30 min) y se recoge con un botón. Un **cerdito viajero** aparece cada 1-2 min (al azar) con una inyección de 10 min de ingresos o un ×5 de cavado durante 60 s, y se va a los 10 s.

## Logros (82)

Sin bonos. Generales (profundidad, bloques, picos, subidas, plumas) y uno por pieza y nivel (10, 25, 50, 100). Los generales se anotan en el Diario.

## Reglas de diseño que se mantienen

El juego sigue siendo tranquilo: sin cajas ni gacha, sin rachas ni recompensas diarias, sin notificaciones, sin monetización, sin comparación social, requisitos siempre visibles. Excepciones decididas por el usuario: el cerdito viajero (azar en cuándo llega y qué trae, y se va a los 10 s) y el tope offline de 2 h. Ver CLAUDE.md.

## Estado de la implementación

- Núcleo, guardado (versión 4), interfaz básica y tests: hechos.
- **Pendiente**: arte (cerdito animado, escena de la mina y piezas: por ahora son emojis y un cerdito SVG con complementos), sonido opcional, y afinar el equilibrio jugando (`npm run calibrate` simula a un jugador y muestra la curva; hoy sube a la superficie por primera vez casi enseguida y llega al nivel ~100 en unas 6 h y ~140 en un día).
- Las partidas de la versión de las granjas (1-3) no se pueden convertir y se descartan.
