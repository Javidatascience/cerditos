# 02 · Arquitectura

> Cómo está construido el juego. Qué es el juego: [01-diseno-juego.md](01-diseno-juego.md). Números: [03-economia.md](03-economia.md). Orden de trabajo: [04-plan-implementacion.md](04-plan-implementacion.md).

## 1. Principios

1. **Lógica separada de la UI.** `src/core/` no importa nada del DOM ni de `window`. Todo en `core` se prueba con Vitest en Node.
2. **El estado es un objeto plano serializable** (`GameState`). La UI se pinta a partir de él y solo lo cambia llamando a funciones de `core/actions.ts`.
3. **Contenido como datos.** Mundos, cerditos, mejoras, ventajas y colección viven en `src/content/` como objetos TypeScript tipados. El motor no conoce ningún nombre concreto: añadir un cerdito o una variedad no toca `core/`.
4. **Funciones simples y explícitas.** Nada de clases con herencia, inyección de dependencias, observables ni decoradores. Funciones que reciben el estado y el contenido y lo modifican o devuelven un valor.
5. **Determinismo.** Sin `Math.random()` en `core`. El tiempo entra siempre como parámetro (`dt`, `now`); `core` nunca llama a `Date.now()`.

### Decisiones y motivos

| Decisión | Motivo |
|---|---|
| **Mutación explícita** del estado en `core` (`advance(state, dt)` modifica `state`) en lugar de estado inmutable | Con números grandes (objetos `Decimal`) copiar el estado 4 veces por segundo es caro y no aporta nada; las funciones son igual de testeables (se crea un estado, se llama, se comprueba). La regla es: solo `core/actions.ts`, `core/tick.ts` y `core/offline.ts` mutan el estado. |
| **`break_infinity.js`** y no `decimal.js` | Está hecho para juegos incrementales: mantisa `number` + exponente, rapidísimo, rango hasta 1e(9e15). `decimal.js` es de precisión arbitraria y 10-50× más lento; no necesitamos precisión, necesitamos rango. |
| **Sin framework de UI**, vistas con `mount()` + `update()` | Pocas pantallas, listas pequeñas (≤ 30 filas). Actualizar solo los nodos de texto que cambian es sencillo y rapidísimo. |
| **Contenido en `.ts` y no en `.json`** | El compilador comprueba los tipos y las referencias; se pueden usar comentarios. Sigue siendo declarativo: solo `export const … = {…}`. |
| **`vite-plugin-pwa`** para el service worker | Generar a mano la lista de ficheros cacheados es propenso a errores; el plugin lo hace en el build. Es la única dependencia de runtime además de `break_infinity.js`. |

## 2. Estructura de carpetas

```
cerditos/
├── CLAUDE.md
├── package.json · tsconfig.json · vite.config.ts · index.html
├── public/
│   ├── icons/ (icon-192.png, icon-512.png, apple-touch-icon-180.png, maskable-512.png)
│   └── favicon.svg
├── src/
│   ├── main.ts                 # arranque: carga, offline, bucle, montar UI, guardado periódico
│   ├── core/                   # LÓGICA PURA (sin DOM)
│   │   ├── num.ts              # re-exporta Decimal y helpers (D(), sumGeometric, min/max…)
│   │   ├── state.ts            # tipos GameState/WorldState + createInitialState(content)
│   │   ├── formulas.ts         # costes, compra en bloque, plumas, multiplicadores
│   │   ├── mechanics/
│   │   │   ├── classic.ts      # producción lineal (Valle)
│   │   │   ├── chain.ts        # cadena exacta (Bosque)
│   │   │   ├── harmony.ts      # armonía (Huerta)
│   │   │   └── calm.ts         # calma (Balneario)
│   │   ├── tick.ts             # advance(state, content, dt)
│   │   ├── actions.ts          # buyGenerator, buyUpgrade, buyPerk, ascend, setActiveWorld, tap…
│   │   ├── autobuy.ts          # Capataz / Encargada
│   │   ├── offline.ts          # simulateOffline(state, content, seconds) → resumen
│   │   ├── collection.ts       # requisitos, progreso y adopción de variedades
│   │   ├── unlocks.ts          # desbloqueo de mundos
│   │   ├── journal.ts          # diario de la granja (entradas de texto)
│   │   └── selectors.ts        # datos derivados para la UI (coste visible, ganancia, progreso…)
│   ├── content/                # DATOS
│   │   ├── types.ts            # WorldDef, GeneratorDef, PerkDef, VarietyDef…
│   │   ├── worlds/valle.ts · bosque.ts · huerta.ts · balneario.ts
│   │   ├── perks.ts
│   │   ├── collection.ts
│   │   ├── index.ts            # export const CONTENT: Content
│   │   └── validate.ts         # validateContent(content): string[] (errores)
│   ├── save/
│   │   ├── serialize.ts        # GameState ⇄ SaveData (Decimal ⇄ string)
│   │   ├── migrations.ts       # CURRENT_VERSION, migrate(raw)
│   │   ├── normalize.ts        # rellena lo que falte al añadir contenido nuevo
│   │   ├── storage.ts          # interfaz SaveStorage + implementación localStorage
│   │   ├── transfer.ts         # exportar/importar como texto
│   │   └── fixtures/           # partidas de cada versión para tests de migración
│   ├── ui/
│   │   ├── dom.ts              # h(tag, attrs, children), setText(node, text) sin repintar si no cambia
│   │   ├── format.ts           # formato de números y tiempos en español
│   │   ├── app.ts              # layout, pestañas de mundo, navegación inferior
│   │   ├── views/              # farmView, upgradesView, ascendView, perksView, albumView,
│   │   │                       # journalView, settingsView, offlineSummary
│   │   └── styles.css
│   └── pwa/register.ts         # registro del service worker (desactivable)
└── tools/sim/                  # simulador de economía (Node, sin DOM)
```

Tests junto al código: `src/core/formulas.test.ts`, `src/save/migrations.test.ts`, etc.

## 3. Modelo de estado

```ts
// src/core/state.ts  (ejemplo de tipos; los nombres son los definitivos)
import type Decimal from 'break_infinity.js';

export type WorldId = string;      // 'valle' | 'bosque' | … viene del contenido
export type GeneratorId = string;
export type UpgradeId = string;
export type PerkId = string;       // `${worldId}.${local}` p. ej. 'valle.abono'
export type VarietyId = string;

export interface GameState {
  version: number;                 // versión del formato de guardado (migraciones)
  createdAt: number;               // epoch ms
  lastTickAt: number;              // epoch ms del último avance aplicado (para offline)
  time: number;                    // segundos de juego simulados en total (reloj interno, monótono)
  activeWorld: WorldId;
  worlds: Record<WorldId, WorldState>;
  collection: Record<VarietyId, { adoptedAt: number }>;  // epoch ms
  journal: JournalEntry[];         // últimas 100 entradas
  settings: Settings;
}

export interface WorldState {
  unlocked: boolean;
  currency: Decimal;
  runEarned: Decimal;              // ganado en la ronda actual
  lifetimeEarned: Decimal;         // ganado en toda la vida del mundo (base de las plumas)
  generators: Record<GeneratorId, GeneratorState>;
  upgrades: Record<UpgradeId, true>;
  plumas: Decimal;                 // sin gastar
  plumasTotal: Decimal;            // ganadas en total (base del bono pasivo)
  perks: Record<PerkId, number>;   // nivel
  ascensions: number;
  runSeconds: number;              // duración de la ronda actual
  calm: number;                    // 0..1 (solo mecánica calm; 1 en las demás)
  calmPenaltyUntil: number;        // en segundos de `GameState.time`
  records: {                       // estadísticas permanentes para la colección
    maxBought: Record<GeneratorId, number>;
    maxHarmony: number;
  };
}

export interface GeneratorState {
  bought: number;                  // compradas en esta ronda (base del coste)
  owned: Decimal;                  // poseídas (en chain incluye las producidas; fraccionario)
}

export interface JournalEntry { at: number; text: string }

export interface Settings {
  notation: 'es' | 'cientifica';
  buyAmount: 1 | 10 | 'max';
  autobuyEnabled: boolean;         // el jugador puede pausar a Capataz/Encargada
}
```

Reglas:
- `bought` es `number` (nunca pasa de miles). Todo lo que puede crecer sin límite (`currency`, `owned` en chain, plumas) es `Decimal`.
- Nada en el estado es derivable de otra cosa del estado (multiplicadores, producción/s, costes): eso lo calculan `formulas.ts`/`selectors.ts` cada vez. Motivo: un único origen de verdad y guardados pequeños.
- Los ids de contenido son **estables**: renombrar un id exige una migración.

## 4. Bucle de juego y tick

```
main.ts
  cargar partida (o crear) → normalizar → aplicar offline (now − lastTickAt)
  montar UI
  cada 250 ms:  now = Date.now()
                dt = (now − state.lastTickAt) / 1000
                si dt > 10 s  → simulateOffline(state, content, dt)   (pestaña dormida, móvil bloqueado…)
                si no         → advance(state, content, dt); runAutobuy(state, content)
                state.lastTickAt = now
                ui.update(state)
  cada 10 s y en visibilitychange(hidden) / pagehide:  guardar
```

`advance(state, content, dt)` — la única función que hace pasar el tiempo:

1. `state.time += dt`
2. Para cada mundo desbloqueado, según `world.mechanic`:
   - **classic / harmony**: `ganado = producciónPorSegundo × dt` (la producción es constante entre compras).
   - **chain**: actualización **exacta** de la cadena (03 §3.2); da la moneda ganada y las nuevas cantidades.
   - **calm**: integral exacta del bono de calma, que sube linealmente hasta 1.
   - Suma `ganado` a `currency`, `runEarned`, `lifetimeEarned`; `runSeconds += dt`.
3. `updateCollection(state, content)` y `updateUnlocks(state, content)` (añaden entradas al diario).

Como `advance` es exacta para cualquier `dt` **si no hay compras**, llamar `advance(dt=3600)` una vez o `advance(dt=1)` 3600 veces da el mismo resultado (hay un test que lo comprueba). Solo las compras (manuales o del autocomprador) rompen esa equivalencia.

Las **acciones** (`actions.ts`) validan y aplican: `buyGenerator(state, content, world, gen, amount)` devuelve `boolean` (o el número comprado) y nunca deja moneda negativa. La UI no calcula costes: pregunta a `selectors.ts`.

## 5. Cálculo offline

```ts
simulateOffline(state, content, seconds): OfflineSummary
```

- `seconds = min(seconds, 2 horas)` (tope de producción offline, decisión del usuario); si `seconds < 0` (reloj del sistema atrasado) → se ignora.
- Se trocea en `n = clamp(ceil(seconds / 15), 1, 2000)` trozos iguales. En cada trozo: `advance(trozo)` + `runAutobuy()`.
- Sin autocompradores la precisión es total (advance es exacta). Con autocompradores, comprar cada 15 s-20 min en vez de cada 250 ms pierde una fracción pequeña, que se acepta.
- Coste: 2000 trozos × 4 mundos, milisegundos. Se ejecuta antes de montar la UI.
- Devuelve un resumen (tiempo fuera, ganado por mundo, compras automáticas, variedades nuevas) que `offlineSummary` muestra si la ausencia fue > 60 s.
- El simulador (`tools/sim`) usa exactamente el mismo esquema, así que sus resultados valen para el juego.

## 6. Guardado, versiones y migraciones

### Formato

```ts
interface SaveData {
  format: 'cerditos';
  version: number;          // = CURRENT_VERSION al guardar
  savedAt: number;          // epoch ms
  state: SerializedState;   // GameState con Decimal → string ("1.234e56")
}
```

- `serialize(state): SaveData` y `deserialize(data): GameState` (convierte strings en `Decimal`).
- **localStorage**, clave `cerditos:save`. Antes de sobrescribir, el guardado anterior válido se copia a `cerditos:save:backup`. Si al cargar el principal está corrupto, se usa el backup y se anota en el diario.
- Todo el acceso pasa por la interfaz `SaveStorage { read(key): string | null; write(key, value): void }` para poder cambiar el almacenamiento (Capacitor) sin tocar nada más.
- Se guarda: cada 10 s, al ocultarse la página (`visibilitychange` → hidden, `pagehide`), tras ascender, tras importar.

### Migraciones

```ts
export const CURRENT_VERSION = 1;
const MIGRATIONS: Record<number, (old: any) => any> = {
  // 1: (v1) => ({ ...v1, version: 2, settings: { ...v1.settings, nueva: valorPorDefecto } }),
};
export function migrate(raw: unknown): SaveData  // aplica MIGRATIONS[v] mientras v < CURRENT_VERSION
```

- Una migración por salto de versión, pura, sin acceder al contenido.
- Cada versión deja un **fixture** (`save/fixtures/v1.json`, …) y un test que migra cada fixture hasta la versión actual y comprueba que carga.
- Una partida con `version > CURRENT_VERSION` (de un juego más nuevo) no se carga: se avisa y no se sobrescribe.
- **Cambio de forma del estado → subir versión + migración + fixture.** **Contenido nuevo** (otro cerdito, otra variedad) **no** necesita migración: `normalize(state, content)` rellena lo que falte con valores por defecto y descarta ids que ya no existan.

### Exportar / importar como texto

- Exportar: `JSON.stringify(SaveData)` → UTF-8 → base64 → `CERDITOS1:` + base64 + `:` + checksum (FNV-1a de 32 bits en hex). Se muestra en un `<textarea>` de solo lectura con botón "Copiar" (API `navigator.clipboard`, con fallback de seleccionar texto).
- Importar: `<textarea>` + botón. Se valida prefijo, checksum (detecta copias incompletas), JSON, `format`, versión; se migra y normaliza; se muestra un resumen ("Valle: 12 ascensiones… ¿Reemplazar la partida actual?") y solo entonces se sustituye (el estado actual queda en backup).
- Motivo del texto y no de un fichero: es lo más fiable para pasar entre PC y iPhone (notas, mensaje a uno mismo, AirDrop de texto).

## 7. Formato de datos de contenido

```ts
// src/content/types.ts (resumen; valores reales en 03-economia.md §8)
export type Mechanic = 'classic' | 'chain' | 'harmony' | 'calm';

export interface WorldDef {
  id: WorldId; name: string; currency: string; prestigeCurrency: string; // "Plumas del Valle"
  mechanic: Mechanic;
  costGrowth: number;                    // por defecto para sus cerditos
  startCurrency: number;
  generators: GeneratorDef[];            // en orden de nivel
  genUpgrades: { counts: number[]; mult: number; costFactor: number } | null;
  globalUpgrades: GlobalUpgradeDef[];
  prestige: { e0: number; exponent: number; perPluma: number };
  unlock: { world: WorldId; plumasTotal: number } | null;
  harmony?: { perLevel: number; thresholds: number[]; mult: number };
  calm?: { maxBonus: number; rampSeconds: number; penalty: number; windowSeconds: number };
  flavor: string;                        // texto de presentación
}
export interface GeneratorDef { id: GeneratorId; name: string; flavor: string; baseCost: number; baseProd: number; costGrowth?: number }
export interface GlobalUpgradeDef { id: UpgradeId; name: string; flavor: string; cost: number; mult: number }
export interface PerkDef { id: PerkId; world: WorldId; name: string; flavor: string; maxLevel: number | null;
                           baseCost: number; costGrowth: number; requires: PerkId[]; effect: PerkEffect }
export type PerkEffect =
  | { kind: 'prodMult'; perLevel: number } | { kind: 'costMult'; perLevel: number }
  | { kind: 'upgradeCostMult'; perLevel: number } | { kind: 'startCurrency'; perLevel: number }
  | { kind: 'plumaMult'; perLevel: number } | { kind: 'crossProd'; perLevel: number }
  | { kind: 'costGrowthDelta'; perLevel: number } | { kind: 'perPlumaBonus'; perLevel: number }
  | { kind: 'autobuyGenerators' } | { kind: 'autobuyUpgrades' };
export type Requirement =
  | { kind: 'genCount'; world: WorldId; gen: GeneratorId; count: number }
  | { kind: 'ascensions'; world: WorldId; count: number }
  | { kind: 'plumasTotal'; world: WorldId; count: number }
  | { kind: 'lifetime'; world: WorldId; amount: number }
  | { kind: 'harmony'; world: WorldId; count: number }
  | { kind: 'varieties'; ids: VarietyId[] };
export type Bonus = { kind: 'prod' | 'cost'; world: WorldId | 'all'; mult: number };
export interface VarietyDef { id: VarietyId; name: string; flavor: string; set: string; requires: Requirement[]; bonus: Bonus }
export interface SetDef { id: string; name: string; bonus: Bonus }
```

- Las mejoras por cerdito se **generan** a partir de `genUpgrades` (ids `${gen}-u${k}`) con una función de `content/`, para no escribir 60 entradas a mano; los nombres ("Comederos dobles"…) se sacan de una lista de nombres por mundo.
- Los números del contenido son `number` (caben de sobra); se convierten a `Decimal` en `formulas.ts`.
- `validateContent()` comprueba: ids únicos, referencias existentes (`requires`, `unlock.world`, `genCount.gen`), sin ciclos en ventajas, costes > 0, un solo mundo sin `unlock`. Hay un test que la ejecuta sobre `CONTENT` y exige cero errores.
- Diferencia con el simulador: `tools/sim/content.ts` indexa los cerditos por posición (`gen: 2`) y usa helpers; el juego usa ids. En el hito 2 el simulador pasa a importar `src/content` (ver 04).

## 8. Capa de UI

- **Patrón de vista**: cada vista exporta `mount(root: HTMLElement, ctx: UiContext): View` con `View = { update(state): void; destroy(): void }`. `mount` crea los nodos una vez; `update` solo cambia textos/atributos/clases cuando el valor nuevo es distinto (`setText` compara antes de escribir).
- `UiContext = { content, dispatch(action) }`. `dispatch` llama a la acción de `core`, y si cambia algo marca `dirty` para repintar en el siguiente frame. Las vistas nunca modifican el estado directamente.
- **Layout móvil en vertical primero** (360-430 px de ancho):
  - Cabecera fija: pestañas de mundos desbloqueados, moneda del mundo activo y producción/s.
  - Contenido desplazable: lista de cerditos (nombre, cantidad, producción, botón de compra con coste y ×1/×10/máx).
  - Barra inferior fija: Granja · Mejoras · Volar · Ventajas · Álbum · Diario · Ajustes (iconos + etiqueta corta).
  - Escritorio: el mismo layout centrado, máximo ~720 px, sin barra inferior (navegación lateral opcional; no prioritario).
- Respetar `env(safe-area-inset-*)` (notch y barra de inicio del iPhone), objetivos táctiles ≥ 44 px, `font-size ≥ 16px` en inputs (Safari hace zoom si es menor), `touch-action: manipulation` para evitar el zoom por doble toque.
- `@media (prefers-reduced-motion: reduce)` desactiva hasta las transiciones de opacidad.
- **Formato de números** (`ui/format.ts`), escala larga española:
  - < 1e6: con separador de miles, `123.456`; con decimales solo si < 100 (`12,5`).
  - 1e6 → `1,23 M` (millones) · 1e9 → `1,23 mil M` · 1e12 → `1,23 B` (billones) · 1e15 → `1,23 mil B` · 1e18 → `1,23 T` (trillones) · 1e21 → `1,23 mil T` · 1e24 → `1,23 C` (cuatrillones) · 1e27 → `1,23 mil C`.
  - ≥ 1e30 o si el ajuste es "científica": `1,23e45`.
  - Tiempos: `45 s`, `12 min`, `3 h 20 min`, `2 d 4 h`.
- Accesibilidad: botones reales (`<button>`), `aria-live="polite"` solo en el resumen offline, contraste AA.

## 9. PWA en iPhone y escritorio

- `vite-plugin-pwa` con `registerType: 'autoUpdate'` (la nueva versión se aplica en silencio la siguiente vez que se abra; nada de avisos "Nueva versión disponible").
- `manifest.webmanifest`: `name`, `short_name: "Cerditos"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` y `theme_color` crema, iconos 192/512 + maskable.
- En `index.html`: `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style` = `default`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`, `viewport` con `viewport-fit=cover`.
- `vite.config.ts` con `base: './'` (sirve igual en GitHub Pages, en un subdirectorio o dentro de Capacitor).
- **Aviso importante de iOS**: la app añadida a la pantalla de inicio tiene **su propio almacenamiento**, separado del de Safari. Una partida empezada en Safari no aparece en la PWA: hay que exportarla e importarla. La pantalla de Ajustes lo explica en una línea.
- Llamar a `navigator.storage?.persist?.()` al arrancar (silencioso, sin diálogo) para reducir el riesgo de que el sistema borre datos.
- Probar en local desde el iPhone: `npm run dev -- --host` y abrir la IP del PC en la misma red (el service worker requiere HTTPS salvo en localhost, así que la PWA completa se prueba con `npm run build && npm run preview -- --host` detrás de un túnel HTTPS o desplegada, p. ej. GitHub Pages).

## 10. Estrategia de tests (Vitest)

| Área | Qué se prueba |
|---|---|
| `formulas` | coste n-ésimo, suma geométrica de compra en bloque, máximo asequible, plumas de una vida, multiplicadores con ventajas y colección |
| `mechanics/*` | producción clásica; cadena exacta (un paso de 3600 s = 3600 pasos de 1 s, error relativo < 1e-9); armonía con umbrales; integral de calma (rampa parcial y completa) |
| `tick` | `advance` suma a currency/runEarned/lifetimeEarned; no toca mundos bloqueados |
| `actions` | no se puede comprar sin dinero; ascender reinicia lo que toca y conserva lo que toca; ventajas respetan requisitos y nivel máximo |
| `offline` | sin autocompra, offline(8 h) = advance(8 h); con autocompra, resultado ≥ 95 % de simular con trozos de 1 s (test con 1 h); relojes negativos ignorados; tope de 30 días |
| `collection` / `unlocks` | cada tipo de requisito; cruces; bonos de set; desbloqueo por plumas |
| `save` | ida y vuelta serialize/deserialize idéntica; migración de cada fixture; backup si el principal está corrupto; `normalize` con contenido añadido/eliminado |
| `transfer` | exportar → importar = mismo estado; checksum detecta un carácter cambiado o texto truncado; rechaza versión futura |
| `content` | `validateContent(CONTENT)` sin errores |
| `ui/format` | tabla de casos de formato de números y tiempos |
| **paridad sim ↔ juego** | un guion fijo de compras durante 2 h simuladas da la misma moneda (±1e-9 relativo) en `core` y en `tools/sim` |

- Los tests de `core` y `save` son la red de seguridad; la UI se prueba a mano con la lista de aceptación de cada hito (04).
- `npm run sim` es la prueba de la economía: debe terminar con "Todos los objetivos de ritmo se cumplen" (código de salida 0) tras cualquier cambio en números de contenido.

## 11. Envolver con Capacitor en el futuro

La arquitectura ya lo permite; lo que habría que cambiar:

1. **Almacenamiento**: en iOS nativo el `localStorage` del WebView puede borrarse bajo presión de espacio. Implementar `SaveStorage` con `@capacitor/preferences` (o `@capacitor/filesystem` para el backup). Es la razón de que todo el acceso pase por esa interfaz.
2. **Ciclo de vida**: sustituir/añadir `visibilitychange`/`pagehide` por `App.addListener('appStateChange', …)` y `'resume'` de `@capacitor/app` para guardar y calcular offline.
3. **Service worker**: no registrarlo dentro de Capacitor (`if (!Capacitor.isNativePlatform())` en `pwa/register.ts`); los ficheros ya van en el paquete.
4. **Exportar/importar**: añadir compartir con `@capacitor/share` y leer/escribir fichero con `@capacitor/filesystem`, además del texto.
5. **Rutas**: `base: './'` ya está puesto; no usar rutas absolutas en el código.
6. **Iconos y splash**: `@capacitor/assets` a partir del icono de 1024 px.
7. **Notificaciones**: **no** se añaden aunque la plataforma lo permita (regla anti-dopamina).
8. Nada en `core/` ni `content/` cambia.
