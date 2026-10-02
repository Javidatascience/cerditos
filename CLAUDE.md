# Cerditos — juego incremental tranquilo

Juego idle/incremental web sobre granjas de cerditos (inspirado en Cookie Clicker, Egg Inc, Dino Mutant y Eat Venture) **sin mecánicas de dopamina**. Varios mundos con reglas propias, ascensión por mundo con Plumas, árbol de ventajas permanentes y un álbum de variedades de cerdito determinista. Pensado para móvil en vertical (PWA en iPhone) y escritorio.

## Documentación (leer lo que indique el hito)

- [docs/01-diseno-juego.md](docs/01-diseno-juego.md) — qué es el juego: pilares, tono, mundos, ascensión, ventajas, colección, reglas anti-dopamina, riesgos.
- [docs/02-arquitectura.md](docs/02-arquitectura.md) — cómo está hecho: carpetas, tipos del estado, tick, offline, guardado/migraciones, contenido, UI, tests, Capacitor.
- [docs/03-economia.md](docs/03-economia.md) — fórmulas, constantes validadas, resultados del simulador y sensibilidad.
- [docs/04-plan-implementacion.md](docs/04-plan-implementacion.md) — hitos ordenados con tareas, criterios de aceptación y tests. **Tabla de estado al principio.**
- [docs/05-guia-del-juego.md](docs/05-guia-del-juego.md) — guía para jugadores: pantallas, mundos, mecánicas y cómo conseguir cada variedad.
- [tools/sim/README.md](tools/sim/README.md) — simulador de economía.

## Stack

- TypeScript (strict) + Vite, **sin framework de UI** (DOM directo con vistas `mount()`/`update()`).
- `break_infinity.js` para números grandes (en `core`); el simulador usa `number`.
- Vitest para tests. `vite-plugin-pwa` para la PWA (hito 10).
- Guardado en `localStorage` detrás de la interfaz `SaveStorage`, con versionado y migraciones; exportar/importar como texto.
- Node ≥ 22.18 (el simulador ejecuta `.ts` directamente). Desarrollo en Windows: los comandos son `npm run …`, sin scripts de shell.

## Comandos

```bash
npm run dev            # servidor de desarrollo (hito 1+)
npm run build          # typecheck + build de producción (hito 1+)
npm run preview        # sirve el build (añadir -- --host para probar desde el iPhone)
npm test               # Vitest una vez (hito 1+)
npm run test:watch
npm run typecheck      # tsc --noEmit (hito 1+)
npm run sim            # simulador de economía: debe salir con código 0
npm run sim:timeline   # evolución diaria (para ajustar requisitos)
npm run sim:tables     # tablas de constantes para docs/03 §8
npm run sim:typecheck
```

## Reglas de código

- **`src/core/` es lógica pura**: no importa `ui/`, no usa `window`/`document`/`localStorage`, ni `Date.now()` ni `Math.random()`. El tiempo entra como parámetro. Todo en `core` tiene tests.
- **Solo `core/actions.ts`, `core/tick.ts`, `core/offline.ts` mutan el estado.** (`greedy.ts` solo lo usan los tests y el simulador.) La UI llama a acciones mediante `dispatch` y lee valores de `core/selectors.ts`; nunca calcula costes ni producciones por su cuenta.
- **Contenido = datos** en `src/content/`. El motor no menciona ninguna raza, mundo ni ventaja por nombre. Añadir contenido no debe requerir tocar `core/`.
- Funciones simples y explícitas. Nada de clases con herencia, DI, observables, decoradores ni "managers". Preferir un `switch` claro a una abstracción.
- Identificadores en inglés; comentarios, textos de UI y documentación en español.
- Ids de contenido estables (minúsculas con guiones). Renombrar un id = migración de guardado.
- **Cambiar la forma del `GameState` = subir `CURRENT_VERSION` + migración + fixture + test** (02 §6).
- **Tras tocar cualquier número de contenido o fórmula económica: `npm run sim` debe seguir pasando** y hay que actualizar docs/03 §8-§10. No tocar exponentes de plumas sin simular (son la constante más sensible, 03 §10).
- Cada hito termina con `npm run typecheck`, `npm test` y, si aplica, `npm run sim` en verde, la tabla de estado de docs/04 actualizada y un commit.
- Si el plan no encaja con la realidad, anotarlo en "Desviaciones" de docs/04 en vez de rediseñar por libre.

## Reglas anti-dopamina (requisitos, no preferencias)

1. Nada aleatorio que afecte al progreso: ni cajas, ni gacha, ni botín, ni críticos. **Excepción decidida por el usuario (2026-10-02):** el cerdito viajero (`ui/visitor.ts`), cuyo momento de llegada (cada 1-2 min) y tipo de recompensa (inyección de moneda o impulso ×5 durante 60 s) son aleatorios, pero la cuantía es fija. **Se queda 10 s y se va (excepción también a la regla 2, decidida por el usuario)**; solo cuenta con el juego abierto. El azar vive fuera de `core`.
2. Sin urgencia: nada caduca, sin ofertas temporales ni eventos de temporada.
3. Sin rachas ni recompensas diarias. Offline al 100 %: ausentarse no se castiga.
4. Sin notificaciones push, badges ni petición de permisos.
5. Sin destellos, confeti, sacudidas, números que saltan, sonidos ni vibración. Como mucho transiciones de opacidad ≤ 150 ms; nada con `prefers-reduced-motion`.
6. Sin pantallazos de recompensa: los logros van al Diario de la granja.
7. Sin clic compulsivo, **revisada por el usuario (2026-10-02):** el toque ("Rascar la barriga") da 1 s de tu producción (mínimo 1) y se muestra lo que da. Sigue sin haber mejoras de toque ni combos.
8. Sin monetización, publicidad ni moneda premium.
9. Toda condición de progreso es visible (requisitos de variedades con su progreso, umbrales de mundos).
10. Sin comparación social.

Si una tarea parece requerir romper alguna, parar y preguntar.

## Estado actual

Hitos 0-12 hechos (los 4 mundos jugables, ascensión, ventajas, colección, logros, diario, guardado v2, offline, tema claro/oscuro, cesta de la granja, cerdito viajero). Pendiente: más pulido gráfico a gusto del usuario y la semana de prueba manual. Ver la tabla de docs/04.
