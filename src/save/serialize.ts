// Conversión GameState ⇄ SaveData (Decimal ⇄ string). Ver docs/06-mina.md.
// No vive en src/core/: core no sabe nada de guardado, solo del estado en memoria.

import { Decimal } from '../core/num.ts';
import type { Buff, GameState, JournalEntry, Settings } from '../core/state.ts';

export const CURRENT_VERSION = 21;

export interface SerializedGameState {
  version: number;
  createdAt: number;
  lastTickAt: number;
  time: number;
  coins: string;
  tools: Record<string, number>;
  upgrades: Record<string, number>;
  globalUpgrades: Record<string, true>;
  synergies: Record<string, true>;
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
  companionLevels: Record<string, number>;
  garden: GameState['garden'];
  cave: { embers: string; runEmbers: string; armory: Record<string, number>; meters: number; bestMeters: number; bosses: number; nextBossAt: number; dragonStage: number; souls: number; soulsTotal: number; soulUpgrades: Record<string, number>; monsters: number };
  stats: { visitors: number; bestIncome: string };
  wardrobe: GameState['wardrobe'];
  nest: GameState['nest'];
  basketAcornsAt: number;
  basket: string;
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
      synergies: { ...state.synergies },
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
      companionLevels: { ...state.companionLevels },
      garden: { cells: state.garden.cells.map((p) => (p ? { ...p } : null)), found: Object.fromEntries(Object.entries(state.garden.found).map(([id, v]) => [id, { ...v }])), buffs: { ...state.garden.buffs }, harvests: state.garden.harvests, seeds: { ...state.garden.seeds } },
      cave: { ...state.cave, embers: state.cave.embers.toString(), runEmbers: state.cave.runEmbers.toString(), armory: { ...state.cave.armory }, soulUpgrades: { ...state.cave.soulUpgrades } },
      stats: { visitors: state.stats.visitors, bestIncome: state.stats.bestIncome.toString() },
      wardrobe: { owned: { ...state.wardrobe.owned }, worn: { ...state.wardrobe.worn } },
      nest: { slots: state.nest.slots.map((s) => (s ? { ...s } : null)), adults: { ...state.nest.adults }, boosts: { ...state.nest.boosts }, acornClock: state.nest.acornClock },
      basketAcornsAt: state.basketAcornsAt,
      basket: state.basket.toString(),
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
    synergies: { ...s.synergies },
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
    companionLevels: { ...s.companionLevels },
    garden: { cells: s.garden.cells.map((p) => (p ? { ...p } : null)), found: Object.fromEntries(Object.entries(s.garden.found).map(([id, v]) => [id, { ...v }])), buffs: { ...s.garden.buffs }, harvests: s.garden.harvests, seeds: { ...s.garden.seeds } },
    cave: { ...s.cave, embers: new Decimal(s.cave.embers), runEmbers: new Decimal(s.cave.runEmbers), armory: { ...s.cave.armory }, soulUpgrades: { ...s.cave.soulUpgrades } },
    stats: { visitors: s.stats.visitors, bestIncome: new Decimal(s.stats.bestIncome) },
    wardrobe: { owned: { ...s.wardrobe.owned }, worn: { ...s.wardrobe.worn } },
    nest: { slots: s.nest.slots.map((slot) => (slot ? { ...slot } : null)), adults: { ...s.nest.adults }, boosts: { ...s.nest.boosts }, acornClock: s.nest.acornClock },
    basketAcornsAt: s.basketAcornsAt,
    basket: new Decimal(s.basket),
    achievements: Object.fromEntries(Object.entries(s.achievements).map(([id, v]) => [id, { ...v }])),
    buff: s.buff ? { ...s.buff } : null,
    journal: s.journal.map((e) => ({ ...e })),
    settings: { ...s.settings },
  };
}
