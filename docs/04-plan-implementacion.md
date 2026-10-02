# 04 · Plan de implementación

> Cada hito se puede ejecutar en una sesión independiente leyendo **solo** `CLAUDE.md` y los documentos que el hito indica en "Leer".
> Al terminar un hito: `npm run typecheck`, `npm test` y (si se tocó contenido numérico) `npm run sim` deben pasar; marca el hito como hecho en la tabla de estado y haz commit.
> No adelantes trabajo de hitos posteriores. Si algo del plan es imposible o contradictorio, anótalo en "Desviaciones" al final de este documento en vez de improvisar un rediseño.

## Estado

| # | Hito | Estado |
|---|---|---|
| 0 | Diseño, economía y simulador | ✅ hecho |
| 1 | Esqueleto, estado y tick | ✅ hecho |
| 2 | Contenido completo como datos + simulador unificado | ✅ hecho |
| 3 | Valle jugable: compras, mejoras y UI de granja | ✅ hecho |
| 4 | Guardado, offline, exportar/importar | ✅ hecho |
| 5 | Ascensión, ventajas y autocompra | ✅ hecho |
| 6 | Colección y diario | ✅ |
| 7 | Multi-mundo y el Bosque (cadena) | ✅ |
| 8 | La Huerta (armonía) | ✅ |
| 9 | El Balneario (calma) y bonos entre mundos | ✅ |
| 10 | PWA en iPhone y escritorio | ✅ (falta probar en el iPhone) |
| 11 | Pulido visual, textos y accesibilidad | ✅ (salvo la semana de prueba manual) |
| 12 | Pulido gráfico y juego más activo (extra) | ✅ |

---

## Hito 1 · Esqueleto, estado y tick

**Leer**: CLAUDE.md, 02 §1-§4 y §8, 03 §2-§3.1.

**Objetivo**: proyecto Vite + TypeScript + Vitest funcionando, con un estado mínimo que avanza en el tiempo y una página que muestra bellotas subiendo.

**Archivos**
- Crear: `index.html`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `src/main.ts`, `src/core/num.ts`, `src/core/state.ts`, `src/core/formulas.ts`, `src/core/mechanics/classic.ts`, `src/core/tick.ts`, `src/content/types.ts`, `src/content/worlds/valle.ts` (solo 2 cerditos por ahora), `src/content/index.ts`, `src/ui/dom.ts`, `src/ui/format.ts`, `src/ui/app.ts`, `src/ui/styles.css`, tests `*.test.ts`.
- Modificar: `package.json` (añadir scripts y dependencias, conservar `sim` y `sim:tables`).

**Tareas**
1. `git init` en `cerditos/` (si no existe), commit inicial con los docs y el simulador.
2. Dependencias: `npm i break_infinity.js` y `npm i -D vite typescript vitest`. Nada más.
3. `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `module: "ESNext"`, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022","DOM"]`, `types: ["node", "vite/client"]` (los tests de paridad importan el simulador, que usa `process`), `allowImportingTsExtensions: true` + `noEmit: true` (el simulador importa con extensión `.ts`), `include: ["src","tools"]`. `typescript` y `@types/node` ya están instalados (los usa `sim:typecheck`). Que `core/` no use APIs de Node ni del navegador se comprueba con un test que busca `process.`, `window`, `document`, `localStorage`, `Date.now` y `Math.random` en `src/core/**/*.ts` (excluidos los `.test.ts`).
4. Scripts en `package.json`: `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview` (`vite preview`), `test` (`vitest run`), `test:watch` (`vitest`), `typecheck` (`tsc --noEmit`), `sim`, `sim:tables` (`node tools/sim/tables.ts`).
5. `num.ts`: `export { default as Decimal } from 'break_infinity.js'`, `D(x)`, y helpers `geometricSum(base, r, n, k)`, `maxAffordable(money, base, r, n)` según 03 §2.
6. `state.ts`: tipos de 02 §3 completos (aunque aún no se usen todos) y `createInitialState(content, now)`.
7. `formulas.ts`: `generatorCost`, `bulkCost`, `maxAffordable`, `productionPerSecond(state, content, worldId)` (solo clásica, sin multiplicadores aún: `M = 1`).
8. `tick.ts`: `advance(state, content, dt)` según 02 §4 (solo clásica).
9. UI mínima: cabecera con "Bellotas: N" y "+N/s", botón "Rascar la barriga" (+1), y los 2 cerditos con botón comprar ×1. Bucle de 250 ms en `main.ts`.
10. `format.ts`: `formatNumber(Decimal, notation)` y `formatDuration(seconds)` con las reglas de 02 §8.

**Criterios de aceptación**
- `npm run dev` abre la página; con el botón se llega a 10 bellotas, se compra un Lechón y el contador sube solo.
- `npm test` y `npm run typecheck` pasan. `npm run sim` sigue funcionando.
- `core/` no importa nada de `ui/` ni usa `window`, `document`, `Date.now` o `Math.random` (comprobar con búsqueda).

**Tests esperados**
- `formulas.test.ts`: coste de la unidad 0, 1 y 10; `bulkCost` = suma de costes unitarios; `maxAffordable` en casos límite (dinero justo, 0, enorme).
- `tick.test.ts`: `advance` suma `prod·dt` a currency, runEarned y lifetimeEarned; `advance(10)` = 10×`advance(1)`.
- `format.test.ts`: tabla de casos (0, 12,5, 999, 123.456, 1,23 M, 1,23 mil M, 1,23 B, 1e30 → científica, 45 s, 3 h 20 min).

---

## Hito 2 · Contenido completo como datos + simulador unificado

**Leer**: CLAUDE.md, 02 §7, 03 §8, `tools/sim/content.ts`, `tools/sim/README.md`.

**Objetivo**: todo el contenido de la v1 (4 mundos, ventajas, colección) vive en `src/content/` con ids estables y textos, y el simulador lo usa como única fuente de verdad.

**Archivos**
- Crear: `src/content/worlds/{valle,bosque,huerta,balneario}.ts`, `src/content/perks.ts`, `src/content/collection.ts`, `src/content/upgrades.ts` (generador de mejoras por cerdito), `src/content/validate.ts`, `src/content/validate.test.ts`.
- Modificar: `src/content/types.ts`, `src/content/index.ts`, `tools/sim/content.ts` (pasa a ser un **adaptador**), `docs/03-economia.md` §8 si cambia algo.

**Tareas**
1. Copiar los valores de 03 §8 a los ficheros de mundo con ids en minúsculas y guiones (`lechon`, `cerdita-rosa`…). Los costes y producciones redondeados a 3 cifras significativas tal y como aparecen en la tabla.
2. Añadir `flavor` a cada mundo, cerdito, mejora global, ventaja y variedad (1 frase, tono de 01 §3). Nombres para las mejoras por cerdito: una lista de 8 nombres por mundo en `upgrades.ts` (p. ej. Valle: "Comedero doble", "Paja de avena", "Cepillado diario"…).
3. En colección, los requisitos `genCount` usan id de cerdito (no índice). `harmony` lleva `world: 'huerta'`.
4. `validateContent(content)` según 02 §7, devolviendo lista de errores legibles.
5. Reescribir `tools/sim/content.ts` como adaptador: importa `CONTENT` de `src/content/index.ts` y exporta `WORLDS`, `PERKS`, `VARIETIES`, `SETS`, `WORLD_BY_ID` con la forma que espera `engine.ts` (índices de cerdito, `genUpgradeCounts`, etc.). `engine.ts`, `strategy.ts` y `main.ts` no deberían necesitar cambios (si los necesitan, cambios mínimos).
6. Ejecutar `npm run sim` y comprobar que los hitos coinciden con 03 §9.3 (mismas fechas ±1 visita). Si no, el portado tiene un error: corregir el dato, no la economía.

**Criterios de aceptación**
- `validateContent(CONTENT)` devuelve `[]`.
- `npm run sim` sale con código 0 y los mismos hitos que 03 §9.3.
- `node tools/sim/tables.ts` produce las mismas tablas que 03 §8.
- No queda ninguna constante económica duplicada entre `src/content` y `tools/sim`.

**Tests esperados**
- `validate.test.ts`: `CONTENT` válido; casos negativos (id duplicado, `requires` inexistente, ciclo en ventajas, `genCount` a cerdito inexistente) detectados.

---

## Hito 3 · Valle jugable: compras, mejoras y UI de granja

**Leer**: CLAUDE.md, 01 §3-§4, 02 §4 y §8, 03 §2-§3.1.

**Objetivo**: el Valle completo se juega de principio a fin de una ronda (sin ascensión todavía): 8 cerditos, compra ×1/×10/máx, mejoras por cerdito y globales, multiplicadores.

**Archivos**
- Crear: `src/core/selectors.ts`, `src/ui/views/farmView.ts`, `src/ui/views/upgradesView.ts`, tests.
- Modificar: `src/core/actions.ts` (ya existe desde el hito 1 con `tap`/`buyGenerator` ×1; añadir `amount: 1|10|'max'`, `buyUpgrade`, `setBuyAmount`), `src/core/formulas.ts` (multiplicador global completo de 03 §3, aunque ventajas/colección aún valgan 1), `src/content/worlds/valle.ts` (8 cerditos), `src/ui/app.ts`, `src/ui/styles.css`.

**Tareas**
1. `actions.ts`: `tap`, `buyGenerator(state, content, world, genId, amount: 1|10|'max')`, `buyUpgrade(state, content, world, upgradeId)`, `setBuyAmount`. Devuelven `boolean`/cantidad y nunca dejan moneda negativa. Actualizan `records.maxBought`.
2. `formulas.ts`: `globalMultiplier`, `generatorMultiplier`, `availableUpgrades` (visibilidad: mejoras por cerdito al tener N; globales al 25 % del coste en `runEarned`).
3. `selectors.ts`: por cerdito → `{ name, owned, prodPerSec, nextCost, canAfford, amountToBuy }`; por mejora → `{ name, cost, effectText, canAfford }`; cabecera → `{ currency, perSecond }`. Toda la aritmética de la UI sale de aquí.
4. UI: `farmView` (lista de cerditos, conmutador ×1/×10/máx), `upgradesView` (mejoras disponibles ordenadas por coste; las compradas en un desplegable). Navegación inferior con Granja y Mejoras (el resto de pestañas aparecen en sus hitos). Diseño móvil de 02 §8.
5. Barra de progreso fina bajo el botón de compra más barato: "te faltan 12 s" (sin animación más allá de avanzar).

**Criterios de aceptación**
- En el navegador a 390 px de ancho: se compran los 8 cerditos, aparecen y se compran mejoras, ×10 y máx compran la cantidad correcta.
- Los números coinciden con `tools/sim` para la misma secuencia (ver test).
- Sin saltos de layout al cambiar números (anchos con `font-variant-numeric: tabular-nums`).

**Tests esperados**
- `actions.test.ts`: comprar sin dinero falla y no cambia nada; ×10 cobra `bulkCost`; máx compra `maxAffordable`; mejoras solo visibles/comprables cuando toca; `maxBought` se actualiza.
- `formulas.test.ts`: con 2 mejoras del Lechón compradas su producción es ×4; una global ×1,5 multiplica todo.
- `parity.test.ts` (inicio): guion fijo (comprar siempre el candidato más barato cada 10 s durante 1 h simulada, solo Valle) en `core` y en `tools/sim/engine.ts` → moneda igual con error relativo < 1e-9.

---

## Hito 4 · Guardado, offline, exportar/importar

**Leer**: CLAUDE.md, 02 §5-§6, 01 §10.

**Objetivo**: la partida sobrevive a recargas, se calcula el tiempo fuera y se puede pasar de un dispositivo a otro como texto.

**Archivos**
- Crear: `src/save/serialize.ts`, `src/save/migrations.ts`, `src/save/normalize.ts`, `src/save/storage.ts`, `src/save/transfer.ts`, `src/save/fixtures/v1.json`, `src/core/offline.ts`, `src/ui/views/settingsView.ts`, `src/ui/views/offlineSummary.ts`, tests.
- Modificar: `src/main.ts`, `src/ui/app.ts`.

**Tareas**
1. `serialize`/`deserialize` (Decimal ⇄ string) y `SaveData` de 02 §6 con `CURRENT_VERSION = 1`.
2. `storage.ts`: interfaz `SaveStorage` + implementación `localStorage` con clave principal y backup; `loadGame()` (principal → backup → nueva partida) y `saveGame(state)`.
3. `migrations.ts` con el mecanismo (aún sin migraciones) y `normalize(state, content)`.
4. `offline.ts`: `simulateOffline` según 02 §5 (trozos, tope 30 días, reloj negativo ignorado) devolviendo `OfflineSummary`.
5. `main.ts`: cargar → normalizar → offline → montar UI; guardar cada 10 s, en `visibilitychange` (hidden) y `pagehide`; si el tick detecta `dt > 10 s`, usar `simulateOffline`.
6. `transfer.ts`: `exportSave(state): string` y `parseImport(text): { ok: true; data } | { ok: false; error }` con prefijo `CERDITOS1:` y checksum FNV-1a (02 §6).
7. Ajustes: exportar (textarea + Copiar), importar (textarea + resumen + confirmar), notación de números, texto sobre el almacenamiento separado de la PWA en iOS, y "Borrar partida" con confirmación escribiendo "borrar".
8. Resumen offline sobrio si la ausencia > 60 s.

**Criterios de aceptación**
- Recargar la página conserva todo. Cerrar 5 min y volver muestra el resumen con la moneda correcta.
- Exportar en un navegador e importar en otro (o en una ventana privada) reproduce la partida.
- Corromper a mano `cerditos:save` en DevTools → carga el backup y lo anota.

**Tests esperados**
- `serialize.test.ts`: ida y vuelta idéntica (incluidos Decimal enormes, 1e300 y 1e1000).
- `migrations.test.ts`: `v1.json` carga; versión futura rechazada; datos basura rechazados.
- `normalize.test.ts`: añadir un cerdito al contenido → aparece con 0; eliminar uno → desaparece sin error.
- `transfer.test.ts`: exportar→importar = mismo estado; 1 carácter cambiado o texto truncado → error de checksum.
- `offline.test.ts`: sin autocompra `simulateOffline(8 h)` = `advance(8 h)`; `seconds < 0` no hace nada; > 30 días se recorta.
- `storage.test.ts` con un `SaveStorage` en memoria: principal corrupto → backup.

---

## Hito 5 · Ascensión, ventajas y autocompra

**Leer**: CLAUDE.md, 01 §5-§6, 03 §4-§6, `tools/sim/strategy.ts` (regla de autocompra).

**Objetivo**: ciclo de prestigio completo en el Valle.

**Archivos**
- Crear: `src/core/autobuy.ts`, `src/ui/views/ascendView.ts`, `src/ui/views/perksView.ts`, tests, `src/core/parity.test.ts` (ampliar).
- Modificar: `src/core/actions.ts` (`ascend`, `buyPerk`), `src/core/formulas.ts` (plumas, efectos de ventajas), `src/core/tick.ts`/`offline.ts` (autocompra en cada tick y trozo), `src/content/perks.ts`.

**Tareas**
1. `formulas.ts`: `plumasPending`, `plumaMultiplier`, `perkCost`, `perkAvailable`, y todos los efectos de 03 §6 aplicados (`prodMult`, `costMult`, `upgradeCostMult`, `startCurrency`, `plumaMult`, `crossProd`, `costGrowthDelta`, `perPlumaBonus`).
2. `actions.ts`: `ascend(state, content, world)` (reinicia y conserva según 01 §5; entrada en el diario), `buyPerk`.
3. `autobuy.ts`: regla de 03 §4 idéntica a `tools/sim/strategy.ts > greedyBuy` (incluido el paquete de fila y la condición de calma, aunque esos mundos lleguen después). Ajuste `autobuyEnabled` para pausarla.
4. `ascendView`: plumas actuales, ganancia si asciendes ahora, multiplicador resultante ("tu producción base pasaría de ×12 a ×19"), ritmo de crecimiento de las pendientes en la última hora, botón "Echar a volar" con confirmación simple. Nada parpadea.
5. `perksView`: árbol en lista agrupada por fila, con coste, nivel, efecto actual → siguiente, requisito si está bloqueada.

**Criterios de aceptación**
- Se asciende, se reinicia la ronda, se conservan plumas/ventajas; con Capataz los cerditos se compran solos (también offline).
- `parity.test.ts`: con la estrategia del simulador, `core` y `tools/sim` coinciden en plumas totales tras 24 h simuladas de Valle (misma secuencia de eventos).
- `npm run sim` sigue pasando.

**Tests esperados**
- `ascend.test.ts`: qué se reinicia y qué no; no se puede ascender con 0 pendientes; `P` nunca disminuye.
- `perks.test.ts`: costes por nivel; nivel máximo; requisitos; cada tipo de efecto cambia la fórmula correspondiente.
- `autobuy.test.ts`: compra el candidato de mejor puntuación; nunca gasta más de lo que hay; respeta `autobuyEnabled`.

---

## Hito 6 · Colección y diario

**Leer**: CLAUDE.md, 01 §8, 03 §7.

**Objetivo**: álbum de variedades determinista con progreso visible, y diario de la granja.

**Archivos**
- Crear: `src/core/collection.ts`, `src/core/journal.ts`, `src/ui/views/albumView.ts`, `src/ui/views/journalView.ts`, tests.
- Modificar: `src/core/tick.ts` (llamar a `updateCollection`), `src/core/formulas.ts` (bonos de colección en multiplicadores y costes).

**Tareas**
1. `collection.ts`: `requirementProgress(state, req) → { current, target, done }` para cada tipo; `updateCollection` adopta lo cumplido (en bucle, por los cruces) y escribe en el diario; `collectionMultipliers(state, content, world)`.
2. `journal.ts`: `addEntry(state, text, at)` (máximo 100 entradas, las más antiguas se descartan).
3. `albumView`: sets como secciones; cada variedad con nombre, texto, bono y requisito con progreso ("212 / 245"). Las no conseguidas se ven en silueta pero **con su requisito completo visible**. Bono del set y cuántas faltan.
4. `journalView`: lista cronológica inversa con hora relativa ("hace 2 h").

**Criterios de aceptación**
- Cumplir un requisito añade la variedad sin ventanas emergentes; el diario lo anota; el bono se aplica.
- Todas las variedades muestran su requisito exacto desde el principio.

**Tests esperados**
- `collection.test.ts`: cada tipo de requisito; cruces en cadena en un solo `update`; bono de set solo con el set completo; la colección sobrevive a `ascend`.

---

## Hito 7 · Multi-mundo y el Bosque (cadena)

**Leer**: CLAUDE.md, 01 §7 y §9, 02 §4, 03 §3.2.

**Objetivo**: varios mundos desbloqueables que producen a la vez; el Bosque con su mecánica de cadena exacta.

**Archivos**
- Crear: `src/core/mechanics/chain.ts`, `src/core/unlocks.ts`, tests.
- Modificar: `src/core/tick.ts` (despacho por mecánica), `src/core/formulas.ts`, `src/core/selectors.ts`, `src/ui/app.ts` (pestañas de mundo), `src/ui/views/farmView.ts` (mostrar "produce 0,01 Buscadoras/s" en la cadena), `src/content/worlds/bosque.ts`.

**Tareas**
1. `unlocks.ts`: desbloqueo por plumas totales del mundo previo; al desbloquear, moneda inicial y entrada en el diario. El umbral del siguiente mundo es visible siempre ("El Bosque abrirá con 60.000 plumas del Valle — llevas 12.300").
2. `chain.ts`: actualización exacta de 03 §3.2 con Decimal. `owned` fraccionario (mostrar con 0 o 1 decimal).
3. Pestañas de mundo en la cabecera (solo desbloqueados + el siguiente en gris con su requisito). Cada mundo con su color.
4. Selectores y autocompra con el valor a 30 min vista para la cadena (igual que `valueRate` del simulador).

**Criterios de aceptación**
- Con una partida importada que tenga el Valle en 60.000 plumas se abre el Bosque; ambos producen a la vez, también offline.
- Paridad con el simulador en el Bosque (1 h simulada).

**Tests esperados**
- `chain.test.ts`: un paso de 3600 s = 3600 pasos de 1 s (error < 1e-9); con solo Buscadoras es lineal; valores conocidos a mano para 2 niveles.
- `unlocks.test.ts`: umbral exacto; no se desbloquea dos veces.

---

## Hito 8 · La Huerta (armonía)

**Leer**: CLAUDE.md, 01 §7, 03 §3.3.

**Archivos**
- Crear: `src/core/mechanics/harmony.ts`, tests.
- Modificar: `src/core/formulas.ts`, `src/core/autobuy.ts` (paquete de fila), `src/core/selectors.ts`, `src/ui/views/farmView.ts`, `src/content/worlds/huerta.ts`.

**Tareas**
1. `harmony.ts`: `harmonyLevel(world)` y `harmonyMultiplier(def, world)`; `records.maxHarmony`.
2. UI: indicador "Filas completas: 57 — siguiente ×2 a las 75" y resaltar (con un borde, sin animación) los cerditos que están en el mínimo. Botón "Completar fila" (compra una de cada cerdito en el mínimo si alcanza).
3. La Huerta no tiene mejoras por cerdito: `upgradesView` muestra solo las globales.

**Criterios de aceptación**
- El multiplicador cambia al completar filas y en los umbrales; "Completar fila" compra lo justo.
- Paridad con el simulador en la Huerta (1 h simulada).

**Tests esperados**
- `harmony.test.ts`: mínimo con un cerdito a 0; umbrales; `+2 %` por fila; el paquete de fila de la autocompra.

---

## Hito 9 · El Balneario (calma) y bonos entre mundos

**Leer**: CLAUDE.md, 01 §7 y §9, 03 §3.4.

**Archivos**
- Crear: `src/core/mechanics/calm.ts`, tests.
- Modificar: `src/core/tick.ts`, `src/core/actions.ts` (penalización al comprar), `src/core/autobuy.ts`, `src/core/formulas.ts` (Hermandad entre mundos), `src/ui/views/farmView.ts`, `src/content/worlds/balneario.ts`.

**Tareas**
1. `calm.ts`: subida lineal, integral exacta en `advance`, penalización ×0,5 con ventana de 60 s (en segundos de `state.time`), calma llena al empezar ronda.
2. UI: barra de calma estática con texto ("Calma 80 % · ×3,4"), y aviso suave en el botón de compra: "Comprar molestará a los cerditos (la calma bajará a la mitad)". Sin colores de alarma.
3. Hermandad: `crossProd` de otros mundos en el multiplicador (ya definido en 03 §3); la vista de ventajas muestra "da +30 % a los demás mundos".

**Criterios de aceptación**
- Dos compras en el mismo minuto solo penalizan una vez. La calma sube también offline.
- Paridad con el simulador en el Balneario (1 h simulada) y en los 4 mundos a la vez (24 h).
- `npm run sim` pasa.

**Tests esperados**
- `calm.test.ts`: integral con rampa parcial, completa y mixta; penalización y ventana; calma inicial.

---

## Hito 10 · PWA en iPhone y escritorio

**Leer**: CLAUDE.md, 02 §9 y §11.

**Archivos**
- Crear: `src/pwa/register.ts`, `public/icons/*`, `public/favicon.svg`.
- Modificar: `vite.config.ts` (`vite-plugin-pwa`, `base: './'`), `index.html` (metas de iOS), `package.json`.

**Tareas**
1. `npm i -D vite-plugin-pwa`. Manifest de 02 §9, `registerType: 'autoUpdate'`, sin avisos de actualización.
2. Iconos: dibujar un cerdito sencillo en SVG y exportar PNG 192/512/maskable/apple 180 (con un script de Node si hace falta, o a mano).
3. `navigator.storage?.persist?.()` al arrancar.
4. Probar: `npm run build && npm run preview -- --host`; en iPhone, abrir por HTTPS (despliegue en GitHub Pages o túnel), "Añadir a pantalla de inicio", modo avión → sigue funcionando.
5. Documentar en `README.md` cómo desplegar y cómo pasar la partida de Safari a la app (exportar/importar).

**Criterios de aceptación**
- Lighthouse (Chrome) marca la app como instalable. En iPhone se abre a pantalla completa, respeta el notch y funciona sin conexión.
- El juego no pide ningún permiso (ni notificaciones).

**Tests esperados**
- Ninguno nuevo de unidad; lista de comprobación manual en `README.md`.

---

## Hito 11 · Pulido visual, textos y accesibilidad

**Leer**: CLAUDE.md, 01 §3 y §11.

**Tareas**
1. Paleta y tipografía de 01 §3 como variables CSS; modo oscuro con `prefers-color-scheme`.
2. Ilustración estática sencilla por cerdito (SVG plano o emoji estilizado) y por mundo.
3. Revisar todos los textos (`flavor`) con el tono del juego; ningún texto de urgencia ("¡Rápido!", "¡No te lo pierdas!").
4. Accesibilidad: contraste AA, `prefers-reduced-motion`, navegación por teclado en escritorio, tamaños táctiles ≥ 44 px.
5. Revisión anti-dopamina: recorrer 01 §11 punto por punto y anotar el resultado en este documento.
6. Jugar una semana real con el perfil casual y comparar con 03 §9.3; anotar desviaciones.

**Criterios de aceptación**
- Checklist anti-dopamina completo sin excepciones.
- Semana de prueba anotada.

---

## Desviaciones

**2026-09-30 (hito 1) — `src/core/actions.ts` se crea en el hito 1, no en el hito 3.**
El plan listaba `actions.ts` como archivo a "Crear" en el hito 3, pero la tarea 9 del hito 1
("botón Rascar la barriga (+1)" y "comprar ×1") ya necesita mutar el estado, y la regla de
CLAUDE.md es que solo `core/actions.ts` (junto a `tick.ts`/`offline.ts`) puede hacerlo. Se creó
`actions.ts` ya en el hito 1 con dos funciones mínimas (`tap`, `buyGenerator` ×1). El hito 3
lo **modifica** (no lo crea) para añadir `×10`/`máx`, `buyUpgrade` y `setBuyAmount` — su
descripción de "Archivos" ya se ha corregido para decir "Modificar" en vez de "Crear".

**2026-09-30 (hito 1) — `tsconfig.json` raíz incluye solo `src`, no `tools`.**
El plan decía `include: ["src","tools"]`. Al activar `noUncheckedIndexedAccess` (pedido por el
propio hito 1), `tools/sim/*.ts` —escrito en el hito 0 sin ese flag— generaba ~50 errores de
tipo mecánicos (indexado de arrays/records sin comprobar `undefined`), sin relación con la
lógica económica ya validada por el simulador. Arreglarlos todos habría sido un cambio grande
y fuera del objetivo del hito. Se optó por mantener `tools/sim` fuera del `include` del
tsconfig raíz y seguir comprobando sus tipos con el script independiente `sim:typecheck`
(con sus propios flags, sin `noUncheckedIndexedAccess`) — que además es justo lo que ya
describía CLAUDE.md, que lista `typecheck` y `sim:typecheck` como comandos separados.
**Pendiente para cuando un hito futuro (5 o 7) añada un `parity.test.ts` que importe
`tools/sim/engine.ts` desde `src/`**: ese archivo pasará a formar parte del programa de
`npm run typecheck` en cuanto se importe (TypeScript sigue las importaciones aunque el
fichero no esté en `include`), y volverá a fallar por `noUncheckedIndexedAccess`. En ese
momento habrá que decidir entre (a) arreglar el tipado de `tools/sim` sin tocar su lógica, o
(b) mover la lógica compartida a un módulo con tipos más estrictos que ambos (`core` y
`tools/sim`) importen. No se ha resuelto ahora para no adelantar trabajo de otro hito.

**2026-09-30 (hito 1) — `.claude/launch.json` para el navegador integrado está en
`proyectos/.claude/launch.json` (la carpeta padre), no dentro de `cerditos/`.** Es donde ya
vivían las configuraciones de los demás proyectos de este usuario; se añadió una entrada
`"cerditos"` (`npm run dev` en el puerto 5183) siguiendo el mismo patrón.

**2026-09-30 (hito 2) — se cumplió antes de lo previsto el riesgo anotado en el hito 1**:
`tools/sim/content.ts` pasó a ser un adaptador que importa `src/content/index.ts`
(`import { CONTENT } from '../../src/content/index.ts'`), así que `sim:typecheck` ya
compilaba transitivamente los ficheros de `src/core/` (`num.ts`, `state.ts`, que usan
`break_infinity.js`). Con los flags originales del hito 0 (`--module nodenext
--moduleResolution nodenext`) esto daba errores de tipos (`Cannot use namespace 'Decimal' as
a type`, etc.): la resolución `nodenext` trata `break_infinity.js` (sin `"type"` en su
`package.json`) como CommonJS con reglas de interoperabilidad distintas a las de `bundler`,
que es la resolución que ya usa el `tsconfig.json` raíz y con la que `npm run typecheck` sí
compila `src/core` sin problemas. Se cambiaron los flags de `sim:typecheck` en
`package.json` a `--module esnext --moduleResolution bundler` (alineados con el tsconfig
raíz); con eso `sim:typecheck` vuelve a pasar limpio y ya no hace falta arreglar el tipado de
`tools/sim` a mano como se planteaba como opción (a) en la nota anterior. Confirmado además
que `npm run sim` reproduce **exactamente** (no solo ±1 visita) los hitos de 03 §9.3, y que
`node tools/sim/tables.ts` produce las mismas tablas que 03 §8 (diff sin diferencias salvo
espacios en blanco).

**2026-10-01 (hito 3) — se resolvió la "landmine" anotada en el hito 2: `tools/sim/engine.ts`
se arregló para `noUncheckedIndexedAccess`, sin tocar su lógica.** El `parity.test.ts` que
pide este hito importa `tools/sim/engine.ts` y `tools/sim/content.ts` desde
`src/core/parity.test.ts`, así que esos ficheros pasan a formar parte del programa de
`npm run typecheck` (TypeScript sigue las importaciones aunque el fichero no esté en
`include`) y se comprueban con los flags estrictos del tsconfig raíz. Confirmado: eran
exactamente los ~90 errores de `engine.ts` previstos (indexado de `s.worlds[id]`,
`WORLD_BY_ID[id]` y arrays por posición sin comprobar `undefined`), y ninguno en
`content.ts` (el adaptador del hito 2 ya los tenía controlados). Se optó por la opción (a) de
la nota del hito 2: se añadieron aserciones `!` en cada acceso señalado (todas seguras por
construcción: los ids de mundo siempre vienen de `WORLDS`, los índices siempre recorren
`0..length-1` del array que indexan) y se introdujeron dos helpers internos (`world(s, id)`,
`def(id)`) para no repetir el patrón `s.worlds[id]!`/`WORLD_BY_ID[id]!` por todo el fichero.
Sin cambios de comportamiento: verificado que `npm run sim` sigue dando exactamente los
mismos hitos (diff línea a línea) y que `strategy.ts`/`main.ts`/`tables.ts` (que no importa
`parity.test.ts`, así que no entran en `npm run typecheck`, pero sí en `sim:typecheck`) siguen
compilando y comportándose igual. `npm run typecheck`, `npm test` (79/79) y `npm run sim`
pasan en verde con los ficheros de `tools/sim` ahora totalmente limpios bajo
`noUncheckedIndexedAccess`.

**2026-10-01 (hito 4) — `loadGame` ya anota en `state.journal` la caída al respaldo, aunque
la vista del Diario sea del hito 6.** 02 §6 especifica "si al cargar el principal está
corrupto, se usa el backup y se anota en el diario"; `GameState.journal` existe desde el
hito 1, así que se ha podido cumplir la letra de esa frase ya, sin esperar a `journal.ts`/
`journalView.ts`. Solo se añadió el `push` a la entrada existente del array; no se creó
ninguna vista ni lógica nueva de diario (eso lo hace el hito 6 por completo). No se considera
una invasión del hito 6 porque es una única línea en `storage.ts` (ya en el alcance de este
hito) que usa una estructura de datos que ya existía.

**2026-10-01 (hito 4) — aviso para quien verifique este hito a mano en el navegador:**
durante la verificación manual se observó que recargar la página (`navigate()`/`reload()`)
en el navegador integrado de esta sesión a veces no detiene el `setInterval` de guardado
automático de la página anterior con la fiabilidad esperada: si se edita `localStorage` a
mano entre una recarga y otra (para simular una ausencia larga, por ejemplo) y pasan varios
segundos reales antes de que la recarga "se note", la página anterior puede sobrescribir el
cambio antes de desaparecer, dando la falsa impresión de que `simulateOffline`/`loadGame` no
funcionan. **No es un fallo del juego**: se verificó exhaustivamente importando los módulos
directamente en la consola del navegador (`await import('/src/core/offline.ts')` etc., sin
pasar por una recarga de página) y los números cuadraban exactamente en todos los casos; los
123 tests automatizados (`serialize`, `migrations`, `normalize`, `transfer`, `offline`,
`storage`) tampoco dependen de recargas y pasan todos. Para verificar escenarios de ausencia
larga a mano en el futuro, mejor construir el `GameState` y llamar a `simulateOffline`/
`loadGame` directamente por consola (como se hizo aquí) que fiarse de editar `localStorage`
y recargar.

**2026-10-01 (hito 5) — `tools/sim/strategy.ts` necesitó el mismo arreglo de tipado que
`engine.ts` en el hito 3.** `parity.test.ts` pasa a importar también `tools/sim/strategy.ts`
(para reutilizar `playerAct`/`resetStrategyMemory` tal cual, sin reimplementar la estrategia
del simulador en el lado `sim`), así que ese fichero entra en `npm run typecheck` y falló por
los mismos motivos (`noUncheckedIndexedAccess`). Se arregló igual: solo aserciones `!` seguras
por construcción, sin tocar lógica — confirmado con `npm run sim` dando los mismos resultados
antes y después.

**2026-10-01 (hito 5) — `core/autobuy.ts` exporta `greedyBuy` (no solo `runAutobuy`), para que
`parity.test.ts` pueda reproducir fielmente al "jugador conectado" de
`tools/sim/strategy.ts > playerAct`.** `playerAct` llama a `greedyBuy(s, world, true, true)`
**sin comprobar** si el jugador simulado posee Capataz/Encargada (representa a una persona
decidiendo comprar, no a la automatización); `runAutobuy`, en cambio, sí exige tener esas
ventajas (es la autocompra real de cuando el jugador no está). El primer intento de este test
usaba `runAutobuy` para el lado `core` y daba 0 ascensiones en 24 h porque, sin Capataz,
nunca compraba nada — el fallo reveló la diferencia de diseño a tiempo. `greedyBuy` queda
exportada con un comentario explicando por qué existen las dos funciones.

**2026-10-01 (hito 5) — no se tocó `core/tick.ts`.** El plan decía "Modificar
core/tick.ts/offline.ts (autocompra en cada tick y trozo)", pero `advance()` debe seguir
siendo pura (02 §4: "si no hay autocompradores, advance es exacta"); mezclar la autocompra ahí
dentro rompería esa invariante. `offline.ts` sí se modificó (cada trozo ya hace
`advance()` + `runAutobuyForAllWorlds()`); el tick "normal" de cada 250 ms vive en `main.ts`
(no en `core/`), así que ahí es donde se añadió la llamada a `runAutobuyForAllWorlds()` tras
`advance()`. `tick.ts` sigue exactamente igual que en el hito 1.

**2026-10-01 (hito 5) — se añadió un ajuste de Capataz/Encargada (activar/pausar) en la vista
Ajustes**, no prevista explícitamente en la lista de archivos del hito pero pedida por la
propia tarea 3 ("Ajuste autobuyEnabled para pausarla"): sin una forma de cambiar ese ajuste
desde la UI, el campo `settings.autobuyEnabled` (que ya existía desde el hito 1) quedaría sin
ningún uso real.

**2026-10-02 (hito 6) — la adopción de variedades vive dentro de `advance()`** (02 §4 paso 3),
a diferencia del hito 5. Como `core` no puede usar `Date.now()`, la hora de adopción y de las
entradas del diario que escribe `advance` sale de `gameClockMs(state) = createdAt + time·1000`
(`core/journal.ts`), un pseudo-epoch que coincide con el reloj real mientras no haya saltos.
`ascend` y `storage.ts` también usan `addEntry` (tope de 100 entradas).

**2026-10-02 (hito 6) — `totalCostMultiplier`** (formulas.ts) = ventajas × bono de coste de la
colección (set Curiosos −5 %); lo usan `buyGenerator`, selectors y autobuy en lugar de
`perkCostMultiplier`. El precio unitario de las mejoras de generador sigue sin multiplicador de
coste, igual que `tools/sim`.

**2026-10-02 (hito 6) — el álbum se construye desde selectors** (`albumViews`,
`describeRequirement`, `journalEntries`), no hay lógica en la vista. Con 7 pestañas se redujo
el padding/tamaño de fuente de la barra inferior. El requisito `harmony` lee
`records.maxHarmony`, que `core` no actualiza hasta el hito 8. En `parity.test.ts` el bucle de
24 h llama a `sim.updateCollectionAndUnlocks` porque ahora `advance()` adopta variedades.

**2026-10-02 (hito 7) — el cambio de mundo se resuelve remontando la vista.** `UiContext` ganó
`activeWorld()`; las vistas Granja, Mejoras, Volar y Ventajas lo leen al montarse y `app.ts` las
vuelve a montar cuando cambia `state.activeWorld` (en vez de hacerlas reactivas por dentro).
Las pestañas de mundo viven en una barra bajo la cabecera, con el requisito del siguiente
mundo en una línea ("El Bosque abrirá con 60.000 plumas de El Valle: llevas X"). Los colores
por mundo son solo de presentación (`WORLD_ACCENTS` en `ui/app.ts`); el pulido va en el hito 11.

**2026-10-02 (hito 7) — `tick.ts` despacha por mecánica** (chain usa `advanceChain`, el resto
sigue con `productionPerSecond`) y llama a `updateUnlocks` tras `updateCollection`. Nueva acción
`setActiveWorld` (solo mundos desbloqueados). `GeneratorView` incluye `prodUnit` para mostrar
"produce 0,1 Buscadoras/s" en los niveles superiores de la cadena. `productionPerSecond` de la
cadena cuenta solo las Buscadoras (como `income()` del simulador); `valueRate` ya estaba hecho
desde el hito 5. Test de paridad nuevo con el Bosque (1 h, error < 1e-9 en moneda y unidades).

**2026-10-02 (hito 6, retoque) — el Álbum etiqueta cada requisito** con "Cómo conseguirla:" y
lo muestra en texto normal (antes iba en gris pequeño dentro de una tarjeta apagada y pasaba
desapercibido).

**2026-10-02 (hito 8) — "Completar fila" vive en `core/actions.ts`** (`buyRow`, `rowBundleCost`):
la autocompra (`execute` del paquete) y el botón de la UI comparten la misma función, así que el
paquete que decide el simulador y el que compra el jugador son idénticos. `buyGenerator` actualiza
`records.maxHarmony` (igual que `tools/sim`), con lo que los requisitos de armonía del álbum
(Calabacero, Cerdo espantapájaros, Gran calabaza) ya avanzan. El multiplicador de armonía entra en
`globalMultiplier` (no en `productionPerSecond`), por lo que también lo ven `valueRate` y la autocompra.
`upgradesView` no necesitó cambios: `genUpgrades: null` ya devolvía solo las globales. El indicador
dice "siguiente ×2 a las N filas"; los cerditos en el mínimo se resaltan con borde (sin animación).
Paridad nueva con la Huerta (1 h; moneda y `maxHarmony` idénticos).

**2026-10-02 (hito 9) — la calma no entra en `globalMultiplier`**, igual que en `tools/sim` (donde
`income()` no la incluye y solo `produce` la aplica). `productionPerSecond` y `valueRate` (las que usan
la autocompra y sus puntuaciones) quedan sin calma para mantener la paridad; el tick multiplica por el
factor medio de calma (`advanceCalm`, integral exacta) y la UI usa `displayProductionPerSecond`
(cabecera, por cerdito y tiempo estimado hasta la próxima compra). Comprar un cerdito o una mejora llama
a `touchCalm` (una penalización por ventana de 60 s de `state.time`); comprar ventajas con plumas no
molesta, como en el simulador. El aviso "Comprar molestará a los cerditos" es una línea de texto bajo la
barra de calma (no cambia de color ni se anima) y pasa a decir cuánto dura la ventana sin molestar.

**2026-10-02 (hito 9) — Hermandad ya estaba implementada** en `globalMultiplier` desde el hito 5 (y su
texto "+X % producción en los demás mundos" en la vista de Ventajas), así que esta tarea no requirió
cambios. La paridad de los 4 mundos a la vez (24 h) fuerza todos los mundos abiertos desde el inicio
(en una partida real el Balneario tarda ~17 días, 03 §8) para ejercitar Hermandad, calma, armonía y
cadena a la vez.

**2026-10-02 (hito 11) — se salta el hito 10 (PWA) por decisión del usuario; el hito 11 se hace sin él.**
Tabla de estado: el 10 queda como ⏭ saltado (pendiente si se quiere instalar en el iPhone).

**Hecho en el hito 11**
1. *Paleta y tipografía*: variables CSS en `ui/styles.css` (bg/surface/texto/atenuado/botón/borde), fuente
   redondeada (`ui-rounded`, SF Pro Rounded, Nunito, system-ui) y **modo oscuro** con `prefers-color-scheme`
   (más `color-scheme` en `index.html`). El color de cada mundo ya no lo pone JS: `app.ts` marca
   `data-world` en `<html>` y el CSS elige el acento (claro y oscuro).
2. *Ilustraciones*: `ui/art.ts` dibuja un cerdito SVG plano (color por cerdito y mundo) en cada fila de la
   Granja y en cada ficha del Álbum (apagado si no se tiene); cada mundo tiene un emoji en su pestaña.
   Es la versión sencilla; el pulido gráfico queda para la siguiente tanda.
3. *Textos*: revisados con `grep` buscando lenguaje de urgencia (rápido, oferta, última oportunidad, ¡…!,
   caduca…): sin resultados en `src/content`, `src/ui` ni `src/core`.
4. *Accesibilidad*: contraste AA medido (texto 12:1, atenuado 6:1, botones 5,6:1; el antiguo botón de acento
   daba 4,3:1 y el deshabilitado 1,5:1, corregidos); `:focus-visible` con contorno de 3 px; objetivos táctiles
   ≥ 44 px (botones de cantidad y pestañas de mundo subieron de 40); `aria-current` en la barra inferior y en
   la pestaña de mundo activa, `aria-label` en las barras; `prefers-reduced-motion` ya existía; todo son
   `<button>` nativos, así que el teclado funciona sin más.
5. *Revisión anti-dopamina* (01 §11, punto por punto):

| # | Regla | Resultado |
|---|---|---|
| 1 | Nada aleatorio | ✅ `Math.random` no aparece en `src/` (lo garantiza también `purity.test.ts` en `core`) |
| 2 | Sin urgencia | ✅ no hay temporizadores que caduquen; la "ventana" del Balneario solo evita una segunda penalización |
| 3 | Sin rachas ni premios por entrar | ✅ no existen; offline al 100 % (tope técnico de 30 días) |
| 4 | Sin notificaciones | ✅ ni `Notification`, ni badges, ni permisos |
| 5 | Sin estímulos agresivos | ✅ sin `@keyframes`, sin sonido (`Audio`), sin `vibrate`; la única transición es la barra de progreso (150 ms) y se anula con `prefers-reduced-motion` |
| 6 | Sin pantallazos de recompensa | ✅ variedades, mundos y vuelos van al Diario; el único modal es el resumen offline (informativo, un "Vale") |
| 7 | Sin clic compulsivo | ✅ `tap` suma +1 y no escala |
| 8 | Sin monetización | ✅ nada |
| 9 | Sin información oculta | ✅ requisitos del álbum con progreso, umbrales de mundos visibles, ventana de calma anunciada |
| 10 | Sin comparación social | ✅ nada |

**No hecho / pendiente**
- *Tarea 6 (una semana real de juego con el perfil casual)*: no se puede hacer en una sesión de desarrollo.
  La comparación con 03 §9.3 sigue cubierta por `npm run sim` (verde); queda como prueba manual del usuario.
- *Maquetación en móvil*: con 375 px de ancho la pestaña del cuarto mundo se sale de la fila (hay scroll
  horizontal) y el contador "× N" del nombre del cerdito se parte a veces en dos líneas. Se deja para el
  pulido gráfico.

**Extra pedido por el usuario**: `docs/05-guia-del-juego.md`, guía para jugadores con las pantallas, los
cuatro mundos y sus mecánicas, las ventajas y las tablas del álbum (generadas desde el contenido).

---

## Hito 12 · Pulido gráfico y juego más activo (petición del usuario, 2026-10-02)

Fuera del plan original. Decisiones del usuario: cesta de la granja, evento aleatorio y que rascar dé
segundos de producción (con las reglas anti-dopamina 1 y 7 **revisadas** en CLAUDE.md y docs/01 §11).

**Hecho**
- **Forma del estado → versión 2** (`CURRENT_VERSION`/`STATE_VERSION` = 2, migración `v1ToV2`, fixture
  `v2.json`, tests): `worlds[*].revealed`, `worlds[*].basketSince`, `buff`, `achievements`, `taps`.
- **Rascar** da `TAP_SECONDS` (1 s) de producción, mínimo 1, y muestra lo que da en el botón.
  No cuenta para las plumas (solo suma moneda).
- **Cesta** (`core/basket.ts`): llena con el 25 % de la producción, tope 30 min, "Recoger" en la Granja.
- **Cerdito viajero**: `core/actions.claimVisitor` (inyección = 10 min de producción del mundo activo;
  impulso = ×5 durante 60 s, integral exacta en `advance`) y `ui/visitor.ts` (el azar y el reloj, fuera de
  `core`; 5-10 min de juego abierto, no cuenta el offline, no caduca). Tarjeta fija bajo las pestañas.
- **Cerditos descubiertos** (`core/reveal.ts`): solo se ven los ya pagables; el siguiente, difuminado (menos
  cuanto más cerca); aviso "Hay más cerditos por descubrir". La Huerta los muestra todos (la armonía los necesita).
  El "te faltan X" de la Granja ya solo mira los cerditos descubiertos.
- **Por cerdito**: "Cada uno da +X/s · en total +Y/s" (en la cadena, lo que produce del nivel inferior).
- **Logros** (`content/achievements.ts`, `core/achievements.ts`): 20, sin bonos (no tocan la economía ni la
  paridad con el simulador), requisito visible con progreso, línea en el Diario; sección "Logros" en el Álbum.
- **Bug "hay que pulsar varias veces la mejora"**: las listas de Mejoras y Ventajas se reconstruían
  cada 250 ms, así que un clic entre el pulsar y el soltar se perdía. Ahora se sincronizan por clave
  (`ui/dom.ts > createListSync`) y los botones no se recrean (comprobado: mismo nodo tras 1 s y una compra
  con un solo clic).
- **Gráficos**: cerditos SVG con accesorio propio (sombrero, gafas, corona, seta, toalla…), escena por mundo
  tras la cabecera, imagen del cerdito en cada mejora por cerdito, emojis para mejoras globales, ventajas y
  logros, iconos en el Álbum, pestañas de mundo en 4 columnas iguales (ya caben en 375 px).

**Pendiente / a revisar**
- La economía del juego activo (rascar 1 s, cesta 25 %, visitante) no pasa por el simulador: el simulador sigue
  modelando solo al jugador "sin toque". Los jugadores muy activos irán algo más rápido que lo de 03 §9.
- Posible afinar: tamaño de las constantes (`TAP_SECONDS`, `BASKET_RATE`, `VISITOR_*`) tras jugar.

**2026-10-02 (hito 10, hecho después del 12 a petición del usuario) — PWA.**
`vite-plugin-pwa` (`registerType: 'autoUpdate'`, manifest de 02 §9, precache de 16 ficheros), `src/pwa/register.ts`
(`storage.persist()` silencioso; el service worker solo se registra en producción), metas de iOS/tema en
`index.html`, iconos generados por código (`tools/make-icons.ts`: cerdito en PNG 192/512/maskable/apple-180 con
zlib, sin dependencias) y `public/favicon.svg`, nota en Ajustes sobre el almacenamiento separado de la app
de iOS, `README.md` (cómo probar en el móvil por wifi, con túnel HTTPS o en GitHub Pages; lista de
comprobación manual) y `.github/workflows/deploy.yml` (Pages en cada push a `main`).
- **No verificado aquí**: el service worker no se pudo registrar en el navegador integrado de la herramienta
  (`sw.js` y todos los recursos responden 200; el fallo es del propio panel). Manifest, iconos y build sí
  comprobados. Falta la lista manual del README en un navegador y un iPhone reales.
- El repo no tiene remoto: el workflow queda listo pero no se ha ejecutado.
