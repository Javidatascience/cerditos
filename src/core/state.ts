// Modelo de estado del juego. Ver docs/02-arquitectura.md §3.
// GameState es plano y serializable: la UI se pinta a partir de él y solo lo cambia
// llamando a funciones de core/actions.ts (aún no existe; llega en el hito 3).

import { D, Decimal } from './num.ts';
import type { Content, WorldDef } from '../content/types.ts';

/** Versión de la forma del GameState; debe coincidir con CURRENT_VERSION de save/serialize.ts. */
export const STATE_VERSION = 2;

export type WorldId = string;
export type GeneratorId = string;
export type UpgradeId = string;
export type PerkId = string; // `${worldId}.${local}`, p. ej. 'valle.abono'
export type VarietyId = string;

export interface GeneratorState {
  /** Unidades compradas en esta ronda (base del coste). Nunca crece sin límite: number basta. */
  bought: number;
  /** Unidades poseídas. En mecánica "classic"/"harmony"/"calm" = bought; en "chain" incluye
   * las producidas por los niveles superiores y puede ser fraccionario. */
  owned: Decimal;
}

export interface WorldState {
  unlocked: boolean;
  currency: Decimal;
  /** Ganado en la ronda actual (se reinicia al ascender). */
  runEarned: Decimal;
  /** Ganado en toda la vida del mundo (nunca se reinicia); base del cálculo de plumas. */
  lifetimeEarned: Decimal;
  generators: Record<GeneratorId, GeneratorState>;
  upgrades: Record<UpgradeId, true>;
  /** Plumas sin gastar. */
  plumas: Decimal;
  /** Plumas ganadas en total (histórico); gastar no la reduce. Base del bono pasivo. */
  plumasTotal: Decimal;
  perks: Record<PerkId, number>;
  ascensions: number;
  /** Duración de la ronda actual, en segundos de juego. */
  runSeconds: number;
  /** 0..1. Solo relevante en la mecánica "calm"; vale 1 en las demás. */
  calm: number;
  /** Instante (en segundos de GameState.time) hasta el que una nueva compra no penaliza la calma. */
  calmPenaltyUntil: number;
  /** Cuántos cerditos (por orden) ya se han descubierto: los de índice < revealed se ven enteros,
   * el siguiente se ve difuminado. Solo crece (docs/01 §4). En armonía son todos desde el inicio. */
  revealed: number;
  /** Instante (segundos de GameState.time) desde el que se llena la cesta de la granja. */
  basketSince: number;
  records: {
    /** Máximo histórico de `bought` por generador (para requisitos de colección). */
    maxBought: Record<GeneratorId, number>;
    /** Máximo histórico de armonía alcanzado (solo Huerta). */
    maxHarmony: number;
  };
}

export interface Buff {
  /** Multiplicador de producción en todos los mundos. */
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
  buyAmount: 1 | 10 | 'max';
  autobuyEnabled: boolean;
}

export interface GameState {
  /** Versión del formato de guardado (para migraciones, docs/02 §6). */
  version: number;
  /** epoch ms. */
  createdAt: number;
  /** epoch ms del último avance aplicado; base del cálculo offline. */
  lastTickAt: number;
  /** Segundos de juego simulados en total (reloj interno monótono, no epoch). */
  time: number;
  activeWorld: WorldId;
  worlds: Record<WorldId, WorldState>;
  collection: Record<VarietyId, { adoptedAt: number }>;
  /** Logros conseguidos (sin bonos: solo reconocimiento y una línea en el diario). */
  achievements: Record<string, { at: number }>;
  /** Veces que se ha rascado la barriga (para logros). */
  taps: number;
  /** Multiplicador temporal activo (visitante), o null. */
  buff: Buff | null;
  journal: JournalEntry[];
  settings: Settings;
}

export function createGeneratorState(): GeneratorState {
  return { bought: 0, owned: D(0) };
}

/** Exportado para que save/normalize.ts pueda crear el estado de un mundo nuevo (contenido
 * añadido después de que exista un guardado) sin duplicar esta lógica. */
export function createWorldState(world: WorldDef): WorldState {
  const generators: Record<GeneratorId, GeneratorState> = {};
  const maxBought: Record<GeneratorId, number> = {};
  for (const gen of world.generators) {
    generators[gen.id] = createGeneratorState();
    maxBought[gen.id] = 0;
  }
  return {
    unlocked: world.unlock === null,
    currency: world.unlock === null ? D(world.startCurrency) : D(0),
    runEarned: D(0),
    lifetimeEarned: D(0),
    generators,
    upgrades: {},
    plumas: D(0),
    plumasTotal: D(0),
    perks: {},
    ascensions: 0,
    runSeconds: 0,
    calm: 1,
    calmPenaltyUntil: -1,
    revealed: world.mechanic === 'harmony' ? world.generators.length : 1,
    basketSince: 0,
    records: { maxBought, maxHarmony: 0 },
  };
}

/**
 * Sustituye el contenido de `target` por el de `source`, conservando la referencia a
 * `target` (para que la UI, que recibe `state` por referencia, vea el cambio sin necesitar
 * que quien llama reasigne ninguna variable). Usado al importar una partida (save/transfer.ts)
 * y al borrarla.
 */
export function replaceState(target: GameState, source: GameState): GameState {
  return Object.assign(target, source);
}

/** Crea una partida nueva a partir del contenido. `now`: epoch ms, inyectado por quien llama (no lo lee el reloj del sistema aquí). */
export function createInitialState(content: Content, now: number): GameState {
  const worlds: Record<WorldId, WorldState> = {};
  for (const world of content.worlds) worlds[world.id] = createWorldState(world);
  const firstWorld = content.worlds[0];
  if (!firstWorld) throw new Error('El contenido no tiene ningún mundo definido');
  return {
    version: STATE_VERSION,
    createdAt: now,
    lastTickAt: now,
    time: 0,
    activeWorld: firstWorld.id,
    worlds,
    collection: {},
    achievements: {},
    taps: 0,
    buff: null,
    journal: [],
    settings: { notation: 'es', buyAmount: 1, autobuyEnabled: true },
  };
}
