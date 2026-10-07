// Modelo de estado del juego. Ver docs/06-mina.md.
// GameState es plano y serializable: la UI se pinta a partir de él y solo lo cambia llamando a
// funciones de core/actions.ts (y las del tick: tick.ts, offline.ts).

import type { Content } from '../content/types.ts';
import { D, Decimal } from './num.ts';

/** Versión de la forma del GameState; debe coincidir con CURRENT_VERSION de save/serialize.ts. */
export const STATE_VERSION = 13;

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
    cells: ({ flower: string; plantedAt: number } | null)[];
    found: Record<string, { count: number; shiny: boolean }>;
    /** Flor → `time` en que termina su bono temporal. */
    buffs: Record<string, number>;
    /** Epoch ms hasta el que se han comprobado los cruces. */
    mutateAt: number;
    /** Flores recogidas en total. */
    harvests: number;
  };
  /** La Cueva del Dragón: brasas, hornos y ventajas. Permanente (no se reinicia al ascender). */
  cave: { embers: Decimal; furnaces: Record<string, number>; nodes: Record<string, true>; /** `time` del último soplido. */ blowAt: number; /** Etapa del dragón (0 = huevo). */ dragonStage: number };
  /** Estadísticas sueltas. */
  stats: {
    visitors: number;
    /** Mejor ingreso por segundo alcanzado. */
    bestIncome: Decimal;
    /** Historial de ingresos para la gráfica: `t` en segundos de juego, `v` = log10 de las monedas por segundo base. */
    history: { t: number; v: number }[];
    /** Segundos de juego entre muestras del historial (se duplica cuando se llena, para abarcar toda la partida). */
    historyEvery: number;
  };
  /** Instante (segundos de `time`) desde el que se llena la cesta. */
  basketSince: number;
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
    garden: { cells: Array.from({ length: content.garden.cols * content.garden.rows }, () => null), found: {}, buffs: {}, mutateAt: 0, harvests: 0 },
    cave: { embers: D(0), furnaces: {}, nodes: {}, blowAt: -1000, dragonStage: 0 },
    stats: { visitors: 0, bestIncome: D(0), history: [], historyEvery: 300 },
    basketSince: 0,
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
