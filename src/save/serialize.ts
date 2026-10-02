// Conversión GameState ⇄ SaveData (Decimal ⇄ string). Ver docs/02-arquitectura.md §6.
// No vive en src/core/: core no sabe nada de guardado, solo del estado en memoria.

import { Decimal } from '../core/num.ts';
import type { Buff, GameState, GeneratorState, JournalEntry, Settings, WorldState } from '../core/state.ts';

export const CURRENT_VERSION = 3;

export interface SerializedGeneratorState {
  bought: number;
  owned: string;
}

export interface SerializedWorldState {
  unlocked: boolean;
  currency: string;
  runEarned: string;
  lifetimeEarned: string;
  generators: Record<string, SerializedGeneratorState>;
  upgrades: Record<string, true>;
  plumas: string;
  plumasTotal: string;
  perks: Record<string, number>;
  ascensions: number;
  runSeconds: number;
  calm: number;
  calmPenaltyUntil: number;
  revealed: number;
  basketSince: number;
  records: { maxBought: Record<string, number>; maxHarmony: number };
}

export interface SerializedGameState {
  version: number;
  createdAt: number;
  lastTickAt: number;
  time: number;
  activeWorld: string;
  worlds: Record<string, SerializedWorldState>;
  collection: Record<string, { adoptedAt: number }>;
  achievements: Record<string, { at: number }>;
  taps: number;
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

function serializeGenerator(g: GeneratorState): SerializedGeneratorState {
  return { bought: g.bought, owned: g.owned.toString() };
}

function deserializeGenerator(g: SerializedGeneratorState): GeneratorState {
  return { bought: g.bought, owned: new Decimal(g.owned) };
}

function serializeWorld(w: WorldState): SerializedWorldState {
  const generators: Record<string, SerializedGeneratorState> = {};
  for (const [id, gen] of Object.entries(w.generators)) generators[id] = serializeGenerator(gen);
  return {
    unlocked: w.unlocked,
    currency: w.currency.toString(),
    runEarned: w.runEarned.toString(),
    lifetimeEarned: w.lifetimeEarned.toString(),
    generators,
    upgrades: { ...w.upgrades },
    plumas: w.plumas.toString(),
    plumasTotal: w.plumasTotal.toString(),
    perks: { ...w.perks },
    ascensions: w.ascensions,
    runSeconds: w.runSeconds,
    calm: w.calm,
    calmPenaltyUntil: w.calmPenaltyUntil,
    revealed: w.revealed,
    basketSince: w.basketSince,
    records: { maxBought: { ...w.records.maxBought }, maxHarmony: w.records.maxHarmony },
  };
}

function deserializeWorld(w: SerializedWorldState): WorldState {
  const generators: Record<string, GeneratorState> = {};
  for (const [id, gen] of Object.entries(w.generators)) generators[id] = deserializeGenerator(gen);
  return {
    unlocked: w.unlocked,
    currency: new Decimal(w.currency),
    runEarned: new Decimal(w.runEarned),
    lifetimeEarned: new Decimal(w.lifetimeEarned),
    generators,
    upgrades: { ...w.upgrades },
    plumas: new Decimal(w.plumas),
    plumasTotal: new Decimal(w.plumasTotal),
    perks: { ...w.perks },
    ascensions: w.ascensions,
    runSeconds: w.runSeconds,
    calm: w.calm,
    calmPenaltyUntil: w.calmPenaltyUntil,
    revealed: w.revealed,
    basketSince: w.basketSince,
    records: { maxBought: { ...w.records.maxBought }, maxHarmony: w.records.maxHarmony },
  };
}

export function serialize(state: GameState, savedAt: number): SaveData {
  const worlds: Record<string, SerializedWorldState> = {};
  for (const [id, w] of Object.entries(state.worlds)) worlds[id] = serializeWorld(w);
  return {
    format: 'cerditos',
    version: CURRENT_VERSION,
    savedAt,
    state: {
      version: state.version,
      createdAt: state.createdAt,
      lastTickAt: state.lastTickAt,
      time: state.time,
      activeWorld: state.activeWorld,
      worlds,
      collection: Object.fromEntries(Object.entries(state.collection).map(([id, v]) => [id, { ...v }])),
      achievements: Object.fromEntries(Object.entries(state.achievements).map(([id, v]) => [id, { ...v }])),
      taps: state.taps,
      buff: state.buff ? { ...state.buff } : null,
      journal: state.journal.map((e) => ({ ...e })),
      settings: { ...state.settings },
    },
  };
}

export function deserialize(data: SaveData): GameState {
  const worlds: Record<string, WorldState> = {};
  for (const [id, w] of Object.entries(data.state.worlds)) worlds[id] = deserializeWorld(w);
  return {
    version: data.state.version,
    createdAt: data.state.createdAt,
    lastTickAt: data.state.lastTickAt,
    time: data.state.time,
    activeWorld: data.state.activeWorld,
    worlds,
    collection: Object.fromEntries(Object.entries(data.state.collection).map(([id, v]) => [id, { ...v }])),
    achievements: Object.fromEntries(Object.entries(data.state.achievements).map(([id, v]) => [id, { ...v }])),
    taps: data.state.taps,
    buff: data.state.buff ? { ...data.state.buff } : null,
    journal: data.state.journal.map((e) => ({ ...e })),
    settings: { ...data.state.settings },
  };
}
