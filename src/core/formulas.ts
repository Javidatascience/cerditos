// Fórmulas económicas. Ver docs/03-economia.md.
// Hito 3: coste de generadores, multiplicador global (03 §3) y mejoras disponibles. Los
// términos del multiplicador que dependen de ventajas o colección (bono de plumas, Abono,
// Hermandad, bonos de colección) valen 1 hasta los hitos 5 (ventajas) y 6 (colección): el
// estado todavía no tiene plumas gastables ni variedades adoptadas. M_mecánica (armonía,
// calma) se añade en los hitos 7-9, cuando esos mundos sean jugables.

import type { Content, GeneratorDef, WorldDef } from '../content/types.ts';
import { classicProductionPerSecond } from './mechanics/classic.ts';
import type { GameState, GeneratorId, UpgradeId, WorldId, WorldState } from './state.ts';
import { bulkCost as bulkCostOf, D, Decimal, maxAffordable as maxAffordableOf } from './num.ts';

export function getWorldDef(content: Content, worldId: WorldId): WorldDef {
  const world = content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);
  return world;
}

export function getGeneratorDef(world: WorldDef, genId: GeneratorId): GeneratorDef {
  const gen = world.generators.find((g) => g.id === genId);
  if (!gen) throw new Error(`Cerdito desconocido: ${genId} (mundo ${world.id})`);
  return gen;
}

// ---------------------------------------------------------------------------
// Coste de generadores (03 §2)
// ---------------------------------------------------------------------------

/** Crecimiento de coste efectivo del generador (03 §2: propio si lo tiene, si no el del mundo). */
export function costGrowth(world: WorldDef, gen: GeneratorDef): number {
  return gen.costGrowth ?? world.costGrowth;
}

/**
 * Coste de comprar la unidad número `n` (0-indexada) del generador, es decir la que sería
 * la (n+1)-ésima compra. `coste(n) = c0 · r^n` (03 §2; de momento sin `m_coste`, que depende
 * de Regateo —hito 5— y de la colección —hito 6—, ambos en 1 todavía).
 */
export function generatorCost(world: WorldDef, gen: GeneratorDef, n: number): Decimal {
  return D(gen.baseCost).mul(Decimal.pow(costGrowth(world, gen), n));
}

/** Coste de comprar `k` unidades a partir de las `n` ya compradas (03 §2 "Compra en bloque"). */
export function bulkCost(world: WorldDef, gen: GeneratorDef, n: number, k: number): Decimal {
  return bulkCostOf(gen.baseCost, costGrowth(world, gen), n, k);
}

/** Máximo de unidades que se pueden comprar con `money`, a partir de las `n` ya compradas. */
export function maxAffordable(world: WorldDef, gen: GeneratorDef, n: number, money: Decimal): number {
  return maxAffordableOf(money, gen.baseCost, costGrowth(world, gen), n);
}

// ---------------------------------------------------------------------------
// Mejoras por cerdito (03 §2: ×2 al tener N; id `${gen}-u${nivel}`, 02 §7)
// ---------------------------------------------------------------------------

export function generatorUpgradeId(genId: GeneratorId, level: number): UpgradeId {
  return `${genId}-u${level}`;
}

/** Multiplicador de producción del generador por sus mejoras compradas: 2^(mejoras). */
export function generatorMultiplier(world: WorldDef, worldState: WorldState, gen: GeneratorDef): number {
  if (!world.genUpgrades) return 1;
  let mult = 1;
  for (let level = 0; level < world.genUpgrades.counts.length; level++) {
    if (worldState.upgrades[generatorUpgradeId(gen.id, level)]) mult *= world.genUpgrades.mult;
  }
  return mult;
}

// ---------------------------------------------------------------------------
// Multiplicador global y producción (03 §3)
// ---------------------------------------------------------------------------

/**
 * M = Π mejoras globales compradas × (términos de ventajas/colección, = 1 hasta los hitos
 * 5-6) × M_mecánica (= 1 fuera de armonía/calma, hitos 7-9).
 */
export function globalMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return 1;
  let m = 1;
  for (const upgrade of world.globalUpgrades) {
    if (worldState.upgrades[upgrade.id]) m *= upgrade.mult;
  }
  return m;
}

/** Producción por segundo del mundo. Hito 3: solo mecánica "classic" (único mundo jugable). */
export function productionPerSecond(state: GameState, content: Content, worldId: WorldId): Decimal {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) throw new Error(`Mundo sin estado: ${worldId}`);
  const m = globalMultiplier(state, content, worldId);
  return classicProductionPerSecond(world, worldState, m, (gen) => generatorMultiplier(world, worldState, gen));
}

// ---------------------------------------------------------------------------
// Mejoras disponibles (03 §2: por cerdito al alcanzar N; globales al ganar el 25 % en la ronda)
// ---------------------------------------------------------------------------

export type UpgradeOffer =
  | { kind: 'generator'; id: UpgradeId; genId: GeneratorId; level: number; cost: Decimal }
  | { kind: 'global'; id: UpgradeId; cost: Decimal };

/** Fracción del coste de una mejora global que, ganada en la ronda, la hace visible (03 §2). */
const GLOBAL_UPGRADE_VISIBILITY = 0.25;

export function availableUpgrades(state: GameState, content: Content, worldId: WorldId): UpgradeOffer[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return [];
  const offers: UpgradeOffer[] = [];

  if (world.genUpgrades) {
    const { counts, costFactor } = world.genUpgrades;
    for (const gen of world.generators) {
      const genState = worldState.generators[gen.id];
      if (!genState) continue;
      for (let level = 0; level < counts.length; level++) {
        const id = generatorUpgradeId(gen.id, level);
        if (worldState.upgrades[id]) continue;
        const threshold = counts[level];
        if (threshold === undefined || genState.bought < threshold) continue;
        offers.push({ kind: 'generator', id, genId: gen.id, level, cost: generatorCost(world, gen, threshold).mul(costFactor) });
      }
    }
  }

  for (const upgrade of world.globalUpgrades) {
    if (worldState.upgrades[upgrade.id]) continue;
    if (worldState.runEarned.lt(D(upgrade.cost).mul(GLOBAL_UPGRADE_VISIBILITY))) continue;
    offers.push({ kind: 'global', id: upgrade.id, cost: D(upgrade.cost) });
  }

  return offers;
}
