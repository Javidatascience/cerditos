// Modelo de estado del juego (la mina). Ver docs/06-mina.md.
// GameState es plano y serializable: la UI se pinta a partir de él y solo lo cambia llamando a
// funciones de core/actions.ts (y las del tick: tick.ts, offline.ts).

import type { Content } from '../content/types.ts';
import { blockHpAt } from './formulas.ts';
import { D, Decimal } from './num.ts';

/** Versión de la forma del GameState; debe coincidir con CURRENT_VERSION de save/serialize.ts. */
export const STATE_VERSION = 4;

export type PieceId = string;
export type PerkId = string;
export type MaterialId = string;

export interface Buff {
  /** Multiplicador del cavado. */
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
  /** Cuántos niveles de pieza compra el botón. */
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

  // --- La ronda actual (se reinicia al subir a la superficie) ---
  coins: Decimal;
  /** Nivel de la mina en el que se está cavando (1 = superficie). */
  depth: number;
  /** Vida que le queda al bloque actual. */
  blockHp: number;
  /** Nivel más hondo alcanzado en esta ronda (base de las plumas). */
  runMaxDepth: number;
  materials: Record<MaterialId, Decimal>;
  gear: Record<PieceId, number>;
  /** Zona en la que se quiere quedar cavando (índice), o null para ir avanzando. */
  farmZone: number | null;
  runSeconds: number;

  // --- Permanente ---
  plumas: Decimal;
  /** Plumas ganadas en total (histórico); gastar no la reduce. Base del bono pasivo. */
  plumasTotal: Decimal;
  perks: Record<PerkId, number>;
  ascensions: number;
  records: {
    /** Nivel más hondo alcanzado alguna vez. */
    maxDepth: number;
    /** Bloques rotos en total. */
    blocks: number;
  };
  /** Veces que se ha picado (para logros). */
  taps: number;
  /** Instante (segundos de `time`) a partir del cual la dinamita vuelve a estar lista. */
  burstReadyAt: number;
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
    coins: D(content.mine.startCoins),
    depth: 1,
    blockHp: blockHpAt(content, 1),
    runMaxDepth: 1,
    materials: {},
    gear: {},
    farmZone: null,
    runSeconds: 0,
    plumas: D(0),
    plumasTotal: D(0),
    perks: {},
    ascensions: 0,
    records: { maxDepth: 1, blocks: 0 },
    taps: 0,
    burstReadyAt: 0,
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
