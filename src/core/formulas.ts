// Fórmulas económicas. Ver docs/03-economia.md.
// Hito 1: solo coste de generadores y producción clásica (M = 1, sin mejoras ni ventajas
// todavía). El multiplicador global completo llega en el hito 3 (03 §3).

import type { Content, GeneratorDef, WorldDef } from '../content/types.ts';
import { classicProductionPerSecond } from './mechanics/classic.ts';
import type { GameState, GeneratorId, WorldId } from './state.ts';
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

/** Crecimiento de coste efectivo del generador (03 §2: propio si lo tiene, si no el del mundo). */
export function costGrowth(world: WorldDef, gen: GeneratorDef): number {
  return gen.costGrowth ?? world.costGrowth;
}

/**
 * Coste de comprar la unidad número `n` (0-indexada) del generador, es decir la que sería
 * la (n+1)-ésima compra. `coste(n) = c0 · r^n` (03 §2; de momento sin m_coste: llega en hito 3/5).
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

/**
 * Producción por segundo del mundo. Hito 1: solo mecánica "classic", M = 1 fijo.
 * A partir del hito 3 esto se convierte en globalMultiplier(...) · Σ y en el hito 7 se
 * despacha por world.mechanic (classic/chain/harmony/calm), ver 02 §4 y 03 §3.
 */
export function productionPerSecond(state: GameState, content: Content, worldId: WorldId): Decimal {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) throw new Error(`Mundo sin estado: ${worldId}`);
  return classicProductionPerSecond(world, worldState); // M = 1 (hito 1)
}
