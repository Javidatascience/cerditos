// Conversión GameState ⇄ SaveData (Decimal ⇄ string). Ver docs/06-mina.md.
// No vive en src/core/: core no sabe nada de guardado, solo del estado en memoria.

import { Decimal } from '../core/num.ts';
import type { Buff, GameState, JournalEntry, Settings } from '../core/state.ts';

export const CURRENT_VERSION = 4;

export interface SerializedGameState {
  version: number;
  createdAt: number;
  lastTickAt: number;
  time: number;
  coins: string;
  depth: number;
  blockHp: number;
  runMaxDepth: number;
  materials: Record<string, string>;
  gear: Record<string, number>;
  farmZone: number | null;
  runSeconds: number;
  plumas: string;
  plumasTotal: string;
  perks: Record<string, number>;
  ascensions: number;
  records: { maxDepth: number; blocks: number };
  taps: number;
  burstReadyAt: number;
  basketSince: number;
  achievements: Record<string, { at: number }>;
  buff: Buff | null;
  journal: JournalEntry[];
  settings: Settings;
}

export interface SaveData {
  format: 'cerditos';
  version: number;
  /** epoch ms en que se generó este SaveData (no tiene por qué coincidir con lastTickAt). */
  savedAt: number;
  state: SerializedGameState;
}

export function serialize(state: GameState, savedAt: number): SaveData {
  return {
    format: 'cerditos',
    version: CURRENT_VERSION,
    savedAt,
    state: {
      version: state.version,
      createdAt: state.createdAt,
      lastTickAt: state.lastTickAt,
      time: state.time,
      coins: state.coins.toString(),
      depth: state.depth,
      blockHp: state.blockHp,
      runMaxDepth: state.runMaxDepth,
      materials: Object.fromEntries(Object.entries(state.materials).map(([id, v]) => [id, v.toString()])),
      gear: { ...state.gear },
      farmZone: state.farmZone,
      runSeconds: state.runSeconds,
      plumas: state.plumas.toString(),
      plumasTotal: state.plumasTotal.toString(),
      perks: { ...state.perks },
      ascensions: state.ascensions,
      records: { ...state.records },
      taps: state.taps,
      burstReadyAt: state.burstReadyAt,
      basketSince: state.basketSince,
      achievements: Object.fromEntries(Object.entries(state.achievements).map(([id, v]) => [id, { ...v }])),
      buff: state.buff ? { ...state.buff } : null,
      journal: state.journal.map((e) => ({ ...e })),
      settings: { ...state.settings },
    },
  };
}

export function deserialize(data: SaveData): GameState {
  const s = data.state;
  return {
    version: s.version,
    createdAt: s.createdAt,
    lastTickAt: s.lastTickAt,
    time: s.time,
    coins: new Decimal(s.coins),
    depth: s.depth,
    blockHp: s.blockHp,
    runMaxDepth: s.runMaxDepth,
    materials: Object.fromEntries(Object.entries(s.materials).map(([id, v]) => [id, new Decimal(v)])),
    gear: { ...s.gear },
    farmZone: s.farmZone,
    runSeconds: s.runSeconds,
    plumas: new Decimal(s.plumas),
    plumasTotal: new Decimal(s.plumasTotal),
    perks: { ...s.perks },
    ascensions: s.ascensions,
    records: { ...s.records },
    taps: s.taps,
    burstReadyAt: s.burstReadyAt,
    basketSince: s.basketSince,
    achievements: Object.fromEntries(Object.entries(s.achievements).map(([id, v]) => [id, { ...v }])),
    buff: s.buff ? { ...s.buff } : null,
    journal: s.journal.map((e) => ({ ...e })),
    settings: { ...s.settings },
  };
}
