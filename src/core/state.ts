// Modelo de estado del juego. Ver docs/06-mina.md.
// GameState es plano y serializable: la UI se pinta a partir de él y solo lo cambia llamando a
// funciones de core/actions.ts (y las del tick: tick.ts, offline.ts).

import type { Content } from '../content/types.ts';
import { D, Decimal } from './num.ts';

/** Versión de la forma del GameState; debe coincidir con CURRENT_VERSION de save/serialize.ts. */
export const STATE_VERSION = 20;

export type ToolId = string;
export type PerkId = string;

export interface Buff {
  /** Multiplicador de la producción y de los picos. */
  mult: number;
  /** Instante (en segundos de GameState.time) en que termina. */
  until: number;
}

export interface JournalEntry {
  /** epoch ms. */
  at: number;
  text: string;
}

export interface Settings {
  notation: 'es' | 'cientifica';
  /** Cuántas unidades compra el botón de una herramienta. */
  buyAmount: 1 | 10 | 'max';
  /** Efectos y animaciones. Se ignora con prefers-reduced-motion. */
  effects: boolean;
}

export interface GameState {
  /** Versión del formato de guardado (para migraciones). */
  version: number;
  /** epoch ms. */
  createdAt: number;
  /** epoch ms del último avance aplicado; base del cálculo offline. */
  lastTickAt: number;
  /** Segundos de juego simulados en total (reloj interno monótono, no epoch). */
  time: number;

  // --- La ronda actual (se reinicia al ascender) ---
  coins: Decimal;
  /** Unidades que se tienen de cada herramienta. */
  tools: Record<ToolId, number>;
  /** Mejoras compradas de cada herramienta (en orden: la 1.ª se desbloquea al tener 5, etc.). */
  upgrades: Record<ToolId, number>;
  /** Mejoras globales compradas (se pierden al ascender). */
  globalUpgrades: Record<string, true>;
  /** Sinergias compradas (se pierden al ascender). */
  synergies: Record<string, true>;
  /** Inercia 0..1: sube al picar y baja sola; multiplica la producción hasta ×momentumMax. */
  momentum: number;
  /** Cuántas herramientas (por orden) ya se han descubierto: las demás se ven difuminadas u ocultas. Solo crece. */
  revealed: number;

  // --- Permanente ---
  /** Monedas ganadas en toda la vida (base de las plumas; no se reinicia). */
  lifetime: Decimal;
  plumas: Decimal;
  /** Plumas ganadas en total (histórico); gastar no la reduce. Base del bono pasivo. */
  plumasTotal: Decimal;
  perks: Record<PerkId, number>;
  ascensions: number;
  /** Máximo histórico de unidades de cada herramienta (para logros y para poder ascender). */
  maxOwned: Record<ToolId, number>;
  /** Veces que se ha picado (para logros). */
  taps: number;
  /** Bellotas: segunda moneda (la da el cerdito viajero) para cosméticos. */
  acorns: number;
  /** Pieles y compañeros comprados (los de logro se derivan de los logros) y los que se llevan puestos. */
  skins: Record<string, true>;
  activeSkin: string;
  companions: Record<string, true>;
  activeCompanions: string[];
  /** Avance de la habilidad de cada compañero (picos o segundos hasta su próximo premio). */
  companionProgress: Record<string, number>;
  /** Nivel de mejora (con bellotas) de cada compañero. */
  companionLevels: Record<string, number>;
  /** El Jardín: parcelas (null = vacía; `plantedAt` en epoch ms) y flores ya recogidas. */
  garden: {
    cells: ({ flower: string; plantedAt: number; /** Crecimiento acumulado (ms de "tiempo de flor") hasta `since`. */ grown: number; /** Epoch ms hasta el que está contado `grown`. */ since: number; /** Ya maduró y se tiró el dado del cruce. */ crossed: boolean } | null)[];
    found: Record<string, { count: number; shiny: boolean; /** Cuántas de las recogidas salieron brillantes. */ shinyCount: number }>;
    /** Flor → `time` en que termina su bono temporal. */
    buffs: Record<string, number>;
    /** Flores recogidas en total. */
    harvests: number;
  };
  /** La Cueva del Dragón (el corredor). No se reinicia al ascender; al renacer se reinicia la carrera (no las almas, el dragón ni el récord). */
  cave: {
    /** Brasas para gastar en la armería. */
    embers: Decimal;
    /** Brasas ganadas en esta vida (dan las almas al renacer). */
    runEmbers: Decimal;
    armory: Record<string, number>;
    /** Metros de esta vida y récord de siempre. */
    meters: number;
    bestMeters: number;
    /** Jefes derrotados en esta vida y metros a los que sale el siguiente. */
    bosses: number;
    nextBossAt: number;
    /** Etapa del dragón (0 = huevo): la más alta conseguida, para siempre. */
    dragonStage: number;
    souls: number;
    /** Monstruos derrotados en total. */
    monsters: number;
  };
  /** Estadísticas sueltas. */
  stats: { visitors: number; /** Mejor ingreso por segundo alcanzado. */ bestIncome: Decimal };
  /** Prendas del cerdito: las compradas y la que lleva puesta en cada hueco (el color son las pieles). */
  wardrobe: { owned: Record<string, true>; worn: { head: string | null; body: string | null; tail: string | null } };
  /** El Nido: hasta 3 casillas con una criatura (etapa 0 = huevo; `since` = epoch ms en que se puso a incubar) y las que ya fueron adultas. */
  nest: { slots: ({ creature: string; stage: number; since: number } | null)[]; adults: Record<string, true>; /** Criatura → `time` en que acaba su ofrenda (bono temporal). */ boosts: Record<string, number>; /** Avance (0..1) hacia la próxima bellota del ornitorrinco, en tiempo de juego. */ acornClock: number };
  /** Epoch ms desde el que se acumulan las bellotas de la cesta (Topo excavador); 0 = aún no cuenta. */
  basketAcornsAt: number;
  /** La cesta: lo que el cerdito ha ganado mientras no estabas (se recoge con un toque). */
  basket: Decimal;
  achievements: Record<string, { at: number }>;
  /** Multiplicador temporal del visitante, o null. */
  buff: Buff | null;
  journal: JournalEntry[];
  settings: Settings;
}

/** Partida nueva. `now`: epoch ms, inyectado por quien llama (core no lee el reloj del sistema). */
export function createInitialState(content: Content, now: number): GameState {
  return {
    version: STATE_VERSION,
    createdAt: now,
    lastTickAt: now,
    time: 0,
    coins: D(content.game.startCoins),
    tools: {},
    upgrades: {},
    globalUpgrades: {},
    synergies: {},
    momentum: 0,
    revealed: 1,
    lifetime: D(0),
    plumas: D(0),
    plumasTotal: D(0),
    perks: {},
    ascensions: 0,
    maxOwned: {},
    taps: 0,
    acorns: content.game.startAcorns,
    skins: {},
    activeSkin: content.skins[0]?.id ?? '',
    companions: {},
    activeCompanions: [],
    companionProgress: {},
    companionLevels: {},
    garden: { cells: Array.from({ length: content.garden.cols * content.garden.rows }, () => null), found: {}, buffs: {}, harvests: 0 },
    cave: { embers: D(0), runEmbers: D(0), armory: {}, meters: 0, bestMeters: 0, bosses: 0, nextBossAt: content.cave.bossEvery, dragonStage: 0, souls: 0, monsters: 0 },
    stats: { visitors: 0, bestIncome: D(0) },
    wardrobe: { owned: {}, worn: { head: null, body: null, tail: null } },
    nest: { slots: [null, null, null], adults: {}, boosts: {}, acornClock: 0 },
    basketAcornsAt: 0,
    basket: D(0),
    achievements: {},
    buff: null,
    journal: [],
    settings: { notation: 'es', buyAmount: 1, effects: true },
  };
}

/**
 * Sustituye el contenido de `target` por el de `source`, conservando la referencia a `target`
 * (para que la UI, que recibe `state` por referencia, vea el cambio). Usado al importar una
 * partida (save/transfer.ts) y al borrarla.
 */
export function replaceState(target: GameState, source: GameState): GameState {
  return Object.assign(target, source);
}

export { Decimal };
