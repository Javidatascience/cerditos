# Cerditos — idle de un cerdito picador

Juego idle/incremental web: un cerdito pica (empiezas ganando 0 por segundo), compras herramientas que producen cada vez más (al tener 5, 15, 25, 50, 75, 100, 150, 200, 250… unidades se desbloquea una mejora ×2 que se compra), al llegar a la herramienta 8 puedes ascender a cambio de esmeraldas (`plumas` en el código) y compras ventajas permanentes en un árbol. Pensado para móvil en vertical (PWA en iPhone) y escritorio. Se puede dejar en idle y hacer cosas de vez en cuando (picar, comprar, cesta, visitante).

> Los juegos anteriores (granjas con mundos y una primera mina con zonas) se sustituyeron el 2026-10-06; sus documentos están en `docs/archivo-granjas/` solo como referencia histórica.

## Documentación

- [docs/06-mina.md](docs/06-mina.md) — diseño y guía del juego actual: mecánicas, herramientas, estado de la implementación.
- [README.md](README.md) — cómo ejecutarlo, probarlo en el móvil y publicarlo (GitHub Pages).
- `docs/archivo-granjas/` — diseño, arquitectura, economía y plan del juego de las granjas (histórico).

## Stack

- TypeScript (strict) + Vite, **sin framework de UI** (DOM directo con vistas `mount()`/`update()`).
- `break_infinity.js` (Decimal) para monedas, plumas y lo ganado en la vida; `number` para contadores y multiplicadores.
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
- **Solo `core/actions.ts`, `core/tick.ts` y `core/offline.ts` mutan el estado.** La UI llama a acciones mediante `dispatch` y lee valores de `core/selectors.ts`; nunca calcula costes ni producción por su cuenta. El azar (cerdito viajero) vive en `ui/visitor.ts`.
- **Contenido = datos** en `src/content/` (herramientas y todas las constantes de equilibrio en `game.ts`, ventajas, logros). El motor no menciona ninguna herramienta ni ventaja por nombre. Añadir contenido no debe requerir tocar `core/`.
- Funciones simples y explícitas. Nada de clases con herencia, DI, observables, decoradores ni "managers". Preferir un `switch` claro a una abstracción.
- Identificadores en inglés; comentarios, textos de UI y documentación en español.
- Ids de contenido estables (minúsculas con guiones). Renombrar un id = migración de guardado.
- **Cambiar la forma del `GameState` = subir `CURRENT_VERSION` (`save/serialize.ts`) y `STATE_VERSION` (`core/state.ts`) + migración + test.** Las versiones 1-4 (juegos anteriores) no se pueden migrar.
- Tras tocar números de equilibrio (`content/game.ts`): `npm run calibrate` para ver la curva.
- Cada tanda de trabajo termina con `npm run typecheck` y `npm test` en verde, y un commit.
- El arte se deja para el final: de momento emojis y un cerdito SVG sencillo.

## Reglas de diseño (tranquilidad)

Por defecto el juego es tranquilo: sin cajas ni gacha, sin rachas ni recompensas diarias, sin notificaciones push ni badges, sin pantallazos de recompensa (los logros van al Diario), sin monetización ni publicidad, sin comparación social, y toda condición de progreso es visible. **Excepciones decididas por el usuario:**

1. Cerdito viajero (`ui/visitor.ts`): llega al azar cada 1-2 min (solo con el juego abierto) con una inyección de ingresos o un impulso de producción y picos, y se va a los 20 s.
2. Picar da 1 s de producción (y también ×5 con el impulso): es la acción activa.
3. Producción offline limitada a las primeras 2 horas de ausencia (ampliable con la ventaja *Siesta larga*).
4. Segunda moneda (bellotas): la da el cerdito viajero (siempre 2; el dorado, 6) y el compañero Topo (1 cada 40 picos) y solo sirve para cosméticos; no afecta a la producción. Las reliquias (bonos permanentes) solo se consiguen con logros.
5. Efectos y animaciones (números que suben) con interruptor en Ajustes; se apagan con `prefers-reduced-motion`.
6. Al conseguir un logro sale un aviso breve arriba (de uno en uno, sin bloquear nada) para dar sensación de colección; no da premios por sí mismo.

Si una tarea parece requerir romper otra regla, parar y preguntar.

## Estado actual

Jugable de punta a punta: picar, 18 herramientas con mejoras por cantidad, descubrimiento progresivo, ascensión (herramienta 8), 7 ventajas, 138 logros, cesta, visitante, offline, guardado v17, Nido, jardín, compañeros con habilidad y Cueva del Dragón, PWA y despliegue en GitHub Pages. Pendiente: arte, afinar el equilibrio jugando y el sonido opcional. Ver docs/06-mina.md.
