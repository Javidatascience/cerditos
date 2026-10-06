# Cerditos — idle de un cerdito minero

Juego idle/incremental web: un cerdito cava una mina por zonas, sube piezas (rascador, capa para el frío, corona…), sube a la superficie a cambio de plumas y compra ventajas permanentes. Pensado para móvil en vertical (PWA en iPhone) y escritorio. Se puede dejar en idle y hacer cosas de vez en cuando (picar, elegir zona, subir piezas, dinamita, cesta, visitante).

> El juego anterior (granjas con 5 mundos) se sustituyó el 2026-10-06; sus documentos están en `docs/archivo-granjas/` solo como referencia histórica.

## Documentación

- [docs/06-mina.md](docs/06-mina.md) — diseño y guía del juego actual: bucle, zonas, piezas, ventajas, estado de la implementación.
- [README.md](README.md) — cómo ejecutarlo, probarlo en el móvil y publicarlo (GitHub Pages).
- `docs/archivo-granjas/` — diseño, arquitectura, economía y plan del juego anterior (histórico).

## Stack

- TypeScript (strict) + Vite, **sin framework de UI** (DOM directo con vistas `mount()`/`update()`).
- `break_infinity.js` (Decimal) para monedas, materiales y plumas; `number` para vida de bloque, cavado y contadores.
- Vitest para tests. `vite-plugin-pwa` para la PWA.
- Guardado en `localStorage` detrás de la interfaz `SaveStorage`, con versionado y migraciones; exportar/importar como texto.
- Node ≥ 22.18 (los scripts de `tools/` ejecutan `.ts` directamente). Desarrollo en Windows: PowerShell 5 no admite `&&`; usar un comando por línea.

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm run build          # typecheck + build de producción (incluye la PWA)
npm run preview        # sirve el build (añadir -- --host para probar desde el móvil)
npm test               # Vitest una vez
npm run typecheck      # tsc --noEmit
npm run calibrate      # simula a un jugador y muestra la curva de progreso (tools/calibrate.ts)
```

## Reglas de código

- **`src/core/` es lógica pura**: no importa `ui/`, no usa `window`/`document`/`localStorage`, ni `Date.now()` ni `Math.random()`. El tiempo entra como parámetro. Todo en `core` tiene tests (`purity.test.ts` lo comprueba).
- **Solo `core/actions.ts`, `core/tick.ts`, `core/offline.ts` (y `core/mining.ts`, que usan los anteriores) mutan el estado.** La UI llama a acciones mediante `dispatch` y lee valores de `core/selectors.ts`; nunca calcula costes ni cavado por su cuenta. El azar (cerdito viajero) vive en `ui/visitor.ts`.
- **Contenido = datos** en `src/content/` (zonas, materiales, peligros, piezas, ventajas, logros y todas las constantes de equilibrio en `mine.ts`). El motor no menciona ninguna zona, pieza ni ventaja por nombre. Añadir contenido no debe requerir tocar `core/`.
- Funciones simples y explícitas. Nada de clases con herencia, DI, observables, decoradores ni "managers". Preferir un `switch` claro a una abstracción.
- Identificadores en inglés; comentarios, textos de UI y documentación en español.
- Ids de contenido estables (minúsculas con guiones). Renombrar un id = migración de guardado.
- **Cambiar la forma del `GameState` = subir `CURRENT_VERSION` (`save/serialize.ts`) y `STATE_VERSION` (`core/state.ts`) + migración + test.** Las versiones 1-3 (granjas) no se pueden migrar.
- Tras tocar números de equilibrio (`content/mine.ts`, costes de piezas): `npm run calibrate` para ver la curva.
- Cada tanda de trabajo termina con `npm run typecheck` y `npm test` en verde, y un commit.
- El arte se deja para el final: de momento emojis y un cerdito SVG sencillo.

## Reglas de diseño (tranquilidad)

Por defecto el juego es tranquilo: sin cajas ni gacha, sin rachas ni recompensas diarias, sin notificaciones push ni badges, sin pantallazos de recompensa (los logros van al Diario), sin monetización ni publicidad, sin comparación social, y toda condición de progreso es visible. **Excepciones decididas por el usuario:**

1. Cerdito viajero (`ui/visitor.ts`): llega al azar cada 1-2 min (solo con el juego abierto) con una inyección de ingresos o un ×5 de cavado de 60 s, y se va a los 10 s.
2. Picar da 1 s de cavado (y también ×5 con el impulso): es la acción activa.
3. Producción offline limitada a las primeras 2 horas de ausencia (ampliable con la ventaja *Siesta larga*).
4. Efectos y animaciones (números que suben) con interruptor en Ajustes; se apagan con `prefers-reduced-motion`.

Si una tarea parece requerir romper otra regla, parar y preguntar.

## Estado actual

Mina jugable de punta a punta: cavado, 14 piezas, 8 zonas con peligros, subida a la superficie, 7 ventajas, 82 logros, cesta, visitante, dinamita, offline, guardado v4, PWA y despliegue en GitHub Pages. Pendiente: arte, afinar el equilibrio jugando y el sonido opcional. Ver docs/06-mina.md.
