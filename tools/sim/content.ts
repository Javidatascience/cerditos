// Adaptador: desde el hito 2, `src/content/` es la ÚNICA fuente de verdad de las constantes
// económicas. Este fichero solo traduce esa forma (cerditos identificados por id, mejoras por
// cerdito como `{counts,mult,costFactor}`) a la que espera el motor del simulador
// (tools/sim/engine.ts): cerditos indexados por posición y mejoras aplanadas en
// `genUpgradeCounts`/`genUpgradeMult`/`genUpgradeCostFactor`. engine.ts, strategy.ts, main.ts
// y tables.ts no cambian: siguen viendo exactamente la misma forma que en el hito 0.
//
// Los objetos que se exportan aquí son copias frescas (no las de src/content/): así el
// `--set mundo.ruta=valor` de main.ts puede mutarlas para el análisis de sensibilidad sin
// tocar el contenido real del juego.

import { CONTENT } from '../../src/content/index.ts';
import type {
  Bonus as ContentBonus,
  PerkDef as ContentPerkDef,
  PerkEffect,
  Requirement as ContentRequirement,
  VarietyDef as ContentVarietyDef,
  WorldDef as ContentWorldDef,
} from '../../src/content/types.ts';

export type WorldId = string;
export type Mechanic = 'classic' | 'chain' | 'harmony' | 'calm';

export interface GeneratorDef {
  id: string;
  name: string;
  baseCost: number;
  /** classic/harmony/calm: moneda por segundo por unidad. chain: unidades del nivel inferior por segundo (nivel 0: moneda). */
  baseProd: number;
  /** Crecimiento de coste propio; si falta, se usa el del mundo. */
  costGrowth?: number;
}

export interface GlobalUpgradeDef {
  id: string;
  name: string;
  cost: number;
  mult: number;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  currency: string;
  mechanic: Mechanic;
  costGrowth: number;
  startCurrency: number;
  generators: GeneratorDef[];
  /** Mejoras por generador: se desbloquean al tener N comprados. Vacío = no hay (Huerta). */
  genUpgradeCounts: number[];
  genUpgradeMult: number;
  /** coste mejora = factor × precio de la unidad nº N de ese generador (sin descuentos). */
  genUpgradeCostFactor: number;
  globalUpgrades: GlobalUpgradeDef[];
  prestige: {
    e0: number;
    exponent: number;
    perPluma: number;
  };
  unlock: { world: WorldId; plumasTotal: number } | null;
  harmony?: { perLevel: number; thresholds: number[]; mult: number };
  calm?: { maxBonus: number; rampSeconds: number; penalty: number; windowSeconds: number };
}

function adaptWorld(world: ContentWorldDef): WorldDef {
  return {
    id: world.id,
    name: world.name,
    currency: world.currency,
    mechanic: world.mechanic,
    costGrowth: world.costGrowth,
    startCurrency: world.startCurrency,
    generators: world.generators.map((g) => ({ id: g.id, name: g.name, baseCost: g.baseCost, baseProd: g.baseProd, costGrowth: g.costGrowth })),
    genUpgradeCounts: world.genUpgrades?.counts ?? [],
    genUpgradeMult: world.genUpgrades?.mult ?? 1,
    genUpgradeCostFactor: world.genUpgrades?.costFactor ?? 0,
    globalUpgrades: world.globalUpgrades.map((u) => ({ id: u.id, name: u.name, cost: u.cost, mult: u.mult })),
    prestige: { ...world.prestige },
    unlock: world.unlock ? { ...world.unlock } : null,
    harmony: world.harmony ? { perLevel: world.harmony.perLevel, mult: world.harmony.mult, thresholds: [...world.harmony.thresholds] } : undefined,
    calm: world.calm ? { ...world.calm } : undefined,
  };
}

export const WORLDS: WorldDef[] = CONTENT.worlds.map(adaptWorld);
export const WORLD_BY_ID: Record<WorldId, WorldDef> = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

export type { PerkEffect };

export interface PerkDef {
  id: string; // único global: `${world}.${local}`
  world: WorldId;
  name: string;
  maxLevel: number | null;
  baseCost: number;
  costGrowth: number;
  requires: string[];
  effect: PerkEffect;
}

export const PERKS: PerkDef[] = CONTENT.perks.map(
  (p: ContentPerkDef): PerkDef => ({
    id: p.id,
    world: p.world,
    name: p.name,
    maxLevel: p.maxLevel,
    baseCost: p.baseCost,
    costGrowth: p.costGrowth,
    requires: [...p.requires],
    effect: p.effect,
  }),
);

// El motor identifica los cerditos por posición (0-indexado), no por id; `genCount` traduce
// aquí el id de src/content al índice dentro de `world.generators`.
export type Requirement =
  | { kind: 'genCount'; world: WorldId; gen: number; count: number }
  | { kind: 'ascensions'; world: WorldId; count: number }
  | { kind: 'plumasTotal'; world: WorldId; count: number }
  | { kind: 'lifetime'; world: WorldId; amount: number }
  | { kind: 'harmony'; count: number } // solo hay armonía en la Huerta; el motor no necesita el mundo
  | { kind: 'varieties'; ids: string[] };

export type Bonus = ContentBonus;

export interface VarietyDef {
  id: string;
  name: string;
  set: string;
  requires: Requirement[];
  bonus: Bonus;
}

export interface SetDef {
  id: string;
  name: string;
  bonus: Bonus;
}

function generatorIndex(worldId: string, genId: string): number {
  const world = CONTENT.worlds.find((w) => w.id === worldId);
  const index = world?.generators.findIndex((g) => g.id === genId) ?? -1;
  if (index < 0) throw new Error(`tools/sim/content (adaptador): cerdito desconocido ${worldId}.${genId}`);
  return index;
}

function adaptRequirement(req: ContentRequirement): Requirement {
  switch (req.kind) {
    case 'genCount':
      return { kind: 'genCount', world: req.world, gen: generatorIndex(req.world, req.gen), count: req.count };
    case 'harmony':
      return { kind: 'harmony', count: req.count };
    case 'ascensions':
      return { kind: 'ascensions', world: req.world, count: req.count };
    case 'plumasTotal':
      return { kind: 'plumasTotal', world: req.world, count: req.count };
    case 'lifetime':
      return { kind: 'lifetime', world: req.world, amount: req.amount };
    case 'varieties':
      return { kind: 'varieties', ids: [...req.ids] };
  }
}

export const VARIETIES: VarietyDef[] = CONTENT.varieties.map(
  (v: ContentVarietyDef): VarietyDef => ({
    id: v.id,
    name: v.name,
    set: v.set,
    requires: v.requires.map(adaptRequirement),
    bonus: v.bonus,
  }),
);

export const SETS: SetDef[] = CONTENT.sets.map((s) => ({ id: s.id, name: s.name, bonus: s.bonus }));
