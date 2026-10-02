// Tipos del contenido del juego (datos declarativos). Ver docs/02-arquitectura.md §7.
// El motor (src/core/) no importa nada de aquí salvo estos tipos: no conoce nombres concretos
// de mundos, cerditos ni ventajas.

import type { GeneratorId, PerkId, UpgradeId, VarietyId, WorldId } from '../core/state.ts';

export type Mechanic = 'classic' | 'chain' | 'harmony' | 'calm';

export interface GeneratorDef {
  id: GeneratorId;
  name: string;
  flavor: string;
  baseCost: number;
  baseProd: number;
  /** Crecimiento de coste propio; si falta, se usa el `costGrowth` del mundo. */
  costGrowth?: number;
}

export interface GlobalUpgradeDef {
  id: UpgradeId;
  name: string;
  flavor: string;
  cost: number;
  mult: number;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  currency: string;
  prestigeCurrency: string; // p. ej. "Plumas del Valle"
  mechanic: Mechanic;
  /** Crecimiento de coste por defecto para sus cerditos. */
  costGrowth: number;
  startCurrency: number;
  /** En orden de nivel (nivel 0 primero). */
  generators: GeneratorDef[];
  genUpgrades: { counts: number[]; mult: number; costFactor: number } | null;
  globalUpgrades: GlobalUpgradeDef[];
  prestige: { e0: number; exponent: number; perPluma: number };
  unlock: { world: WorldId; plumasTotal: number } | null;
  harmony?: { perLevel: number; thresholds: number[]; mult: number };
  calm?: CalmDef;
  flavor: string;
}

export interface CalmDef {
  maxBonus: number;
  rampSeconds: number;
  penalty: number;
  windowSeconds: number;
}

export type PerkEffect =
  | { kind: 'prodMult'; perLevel: number }
  | { kind: 'costMult'; perLevel: number }
  | { kind: 'upgradeCostMult'; perLevel: number }
  | { kind: 'startCurrency'; perLevel: number }
  | { kind: 'plumaMult'; perLevel: number }
  | { kind: 'crossProd'; perLevel: number }
  | { kind: 'costGrowthDelta'; perLevel: number }
  | { kind: 'perPlumaBonus'; perLevel: number }
  | { kind: 'autobuyGenerators' }
  | { kind: 'autobuyUpgrades' };

export interface PerkDef {
  id: PerkId;
  world: WorldId;
  name: string;
  flavor: string;
  maxLevel: number | null;
  baseCost: number;
  costGrowth: number;
  requires: PerkId[];
  effect: PerkEffect;
}

export type Requirement =
  | { kind: 'genCount'; world: WorldId; gen: GeneratorId; count: number }
  | { kind: 'ascensions'; world: WorldId; count: number }
  | { kind: 'plumasTotal'; world: WorldId; count: number }
  | { kind: 'lifetime'; world: WorldId; amount: number }
  | { kind: 'harmony'; world: WorldId; count: number }
  | { kind: 'varieties'; ids: VarietyId[] };

export type Bonus = { kind: 'prod' | 'cost'; world: WorldId | 'all'; mult: number };

export interface VarietyDef {
  id: VarietyId;
  name: string;
  flavor: string;
  set: string;
  requires: Requirement[];
  bonus: Bonus;
}

export interface SetDef {
  id: string;
  name: string;
  bonus: Bonus;
}

export interface Content {
  worlds: WorldDef[];
  perks: PerkDef[];
  varieties: VarietyDef[];
  sets: SetDef[];
}
