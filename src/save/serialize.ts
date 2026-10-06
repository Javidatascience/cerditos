// Conversión GameState ⇄ SaveData (Decimal ⇄ string). Ver docs/06-mina.md.
// No vive en src/core/: core no sabe nada de guardado, solo del estado en memoria.

import { Decimal } from '../core/num.ts';
import type { Buff, GameState, JournalEntry, Settings } from '../core/state.ts';

export const CURRENT_VERSION = 8;

export interface SerializedGameState {
  version: number;
  createdAt: number;
  lastTickAt: number;
  time: number;
  coins: string;
  tools: Record<string, number>;
  upgrades: Record<string, number>;
  globalUpgrades: Record<string, true>;
  momentum: number;
  revealed: number;
  lifetime: string;
  plumas: string;
  plumasTotal: string;
  perks: Record<string, number>;
  ascensions: number;
  maxOwned: Record<string, number>;
  taps: number;
  acorns: number;
  skins: Record<string, true>;
  activeSkin: string;
  companions: Record<string, true>;
  activeCompanions: string[];
  companionProgress: Record<string, number>;
  stats: { visitors: number; bestIncome: string };
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
      tools: { ...state.tools },
      upgrades: { ...state.upgrades },
      globalUpgrades: { ...state.globalUpgrades },
      momentum: state.momentum,
      revealed: state.revealed,
      lifetime: state.lifetime.toString(),
      plumas: state.plumas.toString(),
      plumasTotal: state.plumasTotal.toString(),
      perks: { ...state.perks },
      ascensions: state.ascensions,
      maxOwned: { ...state.maxOwned },
      taps: state.taps,
      acorns: state.acorns,
      skins: { ...state.skins },
      activeSkin: state.activeSkin,
      companions: { ...state.companions },
      activeCompanions: [...state.activeCompanions],
      companionProgress: { ...state.companionProgress },
      stats: { visitors: state.stats.visitors, bestIncome: state.stats.bestIncome.toString() },
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
    tools: { ...s.tools },
    upgrades: { ...s.upgrades },
    globalUpgrades: { ...s.globalUpgrades },
    momentum: s.momentum,
    revealed: s.revealed,
    lifetime: new Decimal(s.lifetime),
    plumas: new Decimal(s.plumas),
    plumasTotal: new Decimal(s.plumasTotal),
    perks: { ...s.perks },
    ascensions: s.ascensions,
    maxOwned: { ...s.maxOwned },
    taps: s.taps,
    acorns: s.acorns,
    skins: { ...s.skins },
    activeSkin: s.activeSkin,
    companions: { ...s.companions },
    activeCompanions: [...s.activeCompanions],
    companionProgress: { ...s.companionProgress },
    stats: { visitors: s.stats.visitors, bestIncome: new Decimal(s.stats.bestIncome) },
    basketSince: s.basketSince,
    achievements: Object.fromEntries(Object.entries(s.achievements).map(([id, v]) => [id, { ...v }])),
    buff: s.buff ? { ...s.buff } : null,
    journal: s.journal.map((e) => ({ ...e })),
    settings: { ...s.settings },
  };
}
