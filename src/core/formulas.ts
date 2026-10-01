// Fórmulas económicas. Ver docs/03-economia.md.
// Hito 5: plumas, coste y efectos de las ventajas permanentes (03 §4-§6) aplicados al
// multiplicador global y al coste de los cerditos. Los términos que dependen de la colección
// (hito 6) y M_mecánica de armonía/calma (hitos 8-9) siguen valiendo 1: no hay nada de eso
// todavía.

import type { Content, GeneratorDef, PerkDef, PerkEffect, WorldDef } from '../content/types.ts';
import { classicProductionPerSecond } from './mechanics/classic.ts';
import type { GameState, GeneratorId, PerkId, UpgradeId, WorldId, WorldState } from './state.ts';
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

export function getPerkDef(content: Content, perkId: PerkId): PerkDef {
  const perk = content.perks.find((p) => p.id === perkId);
  if (!perk) throw new Error(`Ventaja desconocida: ${perkId}`);
  return perk;
}

// ---------------------------------------------------------------------------
// Ventajas permanentes (03 §6): nivel, coste, disponibilidad y agregados por efecto
// ---------------------------------------------------------------------------

export function perkLevel(state: GameState, content: Content, perkId: PerkId): number {
  const perk = getPerkDef(content, perkId);
  return state.worlds[perk.world]?.perks[perkId] ?? 0;
}

/** coste(nivel L → L+1) = ceil(base · crecimiento^L), en plumas del mundo (03 §6). */
export function perkCost(perk: PerkDef, level: number): Decimal {
  return D(perk.baseCost).mul(Decimal.pow(perk.costGrowth, level)).ceil();
}

export function perkAvailable(state: GameState, content: Content, perk: PerkDef): boolean {
  const level = perkLevel(state, content, perk.id);
  if (perk.maxLevel !== null && level >= perk.maxLevel) return false;
  return perk.requires.every((reqId) => perkLevel(state, content, reqId) > 0);
}

/** Ventajas de `worldId` cuyo efecto es `kind` y tienen al menos 1 nivel comprado. */
function perksOfKind(state: GameState, content: Content, worldId: WorldId, kind: PerkEffect['kind']): { perk: PerkDef; level: number }[] {
  const out: { perk: PerkDef; level: number }[] = [];
  for (const perk of content.perks) {
    if (perk.world !== worldId || perk.effect.kind !== kind) continue;
    const level = state.worlds[worldId]?.perks[perk.id] ?? 0;
    if (level > 0) out.push({ perk, level });
  }
  return out;
}

function perLevelOf(effect: PerkEffect): number {
  return 'perLevel' in effect ? effect.perLevel : 0;
}

/** Suma de `perLevel · nivel` de las ventajas de `kind` en `worldId` (p. ej. costGrowthDelta, perPlumaBonus). */
function perkEffectSum(state: GameState, content: Content, worldId: WorldId, kind: PerkEffect['kind']): number {
  let total = 0;
  for (const { perk, level } of perksOfKind(state, content, worldId, kind)) total += perLevelOf(perk.effect) * level;
  return total;
}

/** Producto de `perLevel^nivel` de las ventajas de `kind` en `worldId` (p. ej. costMult, Abono). */
function perkEffectProduct(state: GameState, content: Content, worldId: WorldId, kind: PerkEffect['kind']): number {
  let total = 1;
  for (const { perk, level } of perksOfKind(state, content, worldId, kind)) total *= perLevelOf(perk.effect) ** level;
  return total;
}

export function hasPerkEffect(state: GameState, content: Content, worldId: WorldId, kind: PerkEffect['kind']): boolean {
  return perksOfKind(state, content, worldId, kind).length > 0;
}

/** Herramientas heredadas: multiplica el coste de las mejoras (por cerdito y globales). */
export function perkUpgradeCostMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  return perkEffectProduct(state, content, worldId, 'upgradeCostMult');
}

/** Regateo en la feria: multiplica el coste de los cerditos (m_coste de 03 §2). */
export function perkCostMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  return perkEffectProduct(state, content, worldId, 'costMult');
}

/** Establo ampliado: resta al crecimiento de coste de los cerditos (03 §2). */
export function perkCostGrowthDelta(state: GameState, content: Content, worldId: WorldId): number {
  return perkEffectSum(state, content, worldId, 'costGrowthDelta');
}

/** Buen comienzo: multiplica la moneda con la que se empieza cada ronda. */
export function perkStartCurrencyMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  return perkEffectProduct(state, content, worldId, 'startCurrency');
}

/** Plumas al viento: +15 % de plumas al ascender, por nivel. */
export function plumaMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  return 1 + perkEffectSum(state, content, worldId, 'plumaMult');
}

/** Tasa del bono pasivo por pluma (0,05 + Raíces profundas). Usado en globalMultiplier y en
 * ascendView (selectors.ts) para mostrar "tu producción pasaría de ×A a ×B" al ascender. */
export function perPlumaBonusRate(state: GameState, content: Content, worldId: WorldId): number {
  const world = getWorldDef(content, worldId);
  return world.prestige.perPluma + perkEffectSum(state, content, worldId, 'perPlumaBonus');
}

/** Moneda con la que empieza la ronda tras ascender (03 §6, Buen comienzo). */
export function startCurrency(state: GameState, content: Content, worldId: WorldId): Decimal {
  const world = getWorldDef(content, worldId);
  return D(world.startCurrency).mul(perkStartCurrencyMultiplier(state, content, worldId));
}

// ---------------------------------------------------------------------------
// Coste de generadores (03 §2): coste(n) = c0 · r_ef^n · m_coste
// ---------------------------------------------------------------------------

/** Crecimiento de coste efectivo del generador (03 §2: propio si lo tiene, si no el del mundo). */
export function costGrowth(world: WorldDef, gen: GeneratorDef): number {
  return gen.costGrowth ?? world.costGrowth;
}

/**
 * Coste de comprar la unidad número `n` (0-indexada) del generador. `costGrowthDelta` y
 * `costMultiplier` son los agregados de ventajas ya calculados (perkCostGrowthDelta /
 * perkCostMultiplier) — se reciben ya resueltos para no atar esta función pura a GameState
 * (mismo patrón que mechanics/classic.ts con el multiplicador global, hito 3).
 */
export function generatorCost(world: WorldDef, gen: GeneratorDef, n: number, costGrowthDelta = 0, costMultiplier = 1): Decimal {
  const r = costGrowth(world, gen) - costGrowthDelta;
  return D(gen.baseCost).mul(costMultiplier).mul(Decimal.pow(r, n));
}

/** Coste de comprar `k` unidades a partir de las `n` ya compradas (03 §2 "Compra en bloque"). */
export function bulkCost(world: WorldDef, gen: GeneratorDef, n: number, k: number, costGrowthDelta = 0, costMultiplier = 1): Decimal {
  const r = costGrowth(world, gen) - costGrowthDelta;
  return bulkCostOf(D(gen.baseCost).mul(costMultiplier), r, n, k);
}

/** Máximo de unidades que se pueden comprar con `money`, a partir de las `n` ya compradas. */
export function maxAffordable(world: WorldDef, gen: GeneratorDef, n: number, money: Decimal, costGrowthDelta = 0, costMultiplier = 1): number {
  const r = costGrowth(world, gen) - costGrowthDelta;
  return maxAffordableOf(money, D(gen.baseCost).mul(costMultiplier), r, n);
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
 * M = Π mejoras globales compradas
 *   × (1 + (0,05 + 0,01·nivel(Raíces)) · P)            ← bono pasivo de plumas
 *   × 1,10^nivel(Abono)
 *   × Π_{otros mundos} (1 + 0,10 · nivel(Hermandad en ese mundo))
 *   × bonos de colección (= 1, hito 6) × M_mecánica (= 1 fuera de armonía/calma, hitos 8-9)
 */
export function globalMultiplier(state: GameState, content: Content, worldId: WorldId): number {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return 1;

  let m = 1;
  for (const upgrade of world.globalUpgrades) {
    if (worldState.upgrades[upgrade.id]) m *= upgrade.mult;
  }

  m *= 1 + perPlumaBonusRate(state, content, worldId) * worldState.plumasTotal.toNumber();

  m *= perkEffectProduct(state, content, worldId, 'prodMult'); // Abono de calidad

  for (const other of content.worlds) {
    if (other.id === worldId) continue;
    m *= 1 + perkEffectSum(state, content, other.id, 'crossProd'); // Hermandad de granjas (del otro mundo)
  }

  return m;
}

/** Producción por segundo del mundo. Hito 5: solo mecánica "classic" (único mundo jugable). */
export function productionPerSecond(state: GameState, content: Content, worldId: WorldId): Decimal {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) throw new Error(`Mundo sin estado: ${worldId}`);
  const m = globalMultiplier(state, content, worldId);
  return classicProductionPerSecond(world, worldState, m, (gen) => generatorMultiplier(world, worldState, gen));
}

const CHAIN_VALUE_HORIZON_SECONDS = 1800; // 03 §4: mismo horizonte que tools/sim (CHAIN_HORIZON)

/**
 * Valor de la granja para decidir compras (03 §4): moneda/s equivalente en un horizonte.
 * Fuera de la cadena (único caso hasta el hito 7) coincide con productionPerSecond; en la
 * cadena, una unidad del nivel k aporta prod_k·…·prod_0 · H^k / k! de moneda en H segundos
 * (ver docs/03-economia.md §3.2). Se define ya aquí, antes de que el Bosque sea jugable,
 * porque autobuy.ts (hito 5) debe usar el mismo horizonte que tools/sim para decidir compras.
 */
export function valueRate(state: GameState, content: Content, worldId: WorldId, horizonSeconds: number = CHAIN_VALUE_HORIZON_SECONDS): Decimal {
  const world = getWorldDef(content, worldId);
  if (world.mechanic !== 'chain') return productionPerSecond(state, content, worldId);

  const worldState = state.worlds[worldId];
  if (!worldState) return D(0);
  const m = globalMultiplier(state, content, worldId);

  let total = D(0);
  let chainRate = D(1);
  let fact = 1;
  for (let k = 0; k < world.generators.length; k++) {
    const gen = world.generators[k]!;
    chainRate = chainRate.mul(gen.baseProd).mul(generatorMultiplier(world, worldState, gen)).mul(k === 0 ? m : 1);
    if (k > 0) fact *= k + 1;
    const owned = worldState.generators[gen.id]?.owned ?? D(0);
    total = total.add(owned.mul(chainRate).mul(Decimal.pow(horizonSeconds, k + 1)).div(fact));
  }
  return total.div(horizonSeconds);
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

  // Herramientas heredadas abarata mejoras por cerdito y globales (igual que tools/sim: ver
  // "Desviaciones" del hito 5). El precio de la unidad N del cerdito, en cambio, NO lleva el
  // descuento de Regateo (03 §2: "sin descuentos de Regateo"); solo Establo ampliado la afecta.
  const upgradeCostMult = perkUpgradeCostMultiplier(state, content, worldId);
  const costGrowthDelta = perkCostGrowthDelta(state, content, worldId);

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
        const unitPrice = generatorCost(world, gen, threshold, costGrowthDelta, 1);
        offers.push({ kind: 'generator', id, genId: gen.id, level, cost: unitPrice.mul(costFactor).mul(upgradeCostMult) });
      }
    }
  }

  for (const upgrade of world.globalUpgrades) {
    if (worldState.upgrades[upgrade.id]) continue;
    if (worldState.runEarned.lt(D(upgrade.cost).mul(GLOBAL_UPGRADE_VISIBILITY))) continue;
    offers.push({ kind: 'global', id: upgrade.id, cost: D(upgrade.cost).mul(upgradeCostMult) });
  }

  return offers;
}

// ---------------------------------------------------------------------------
// Plumas (03 §5): P_derecho = floor((E_vida / e0)^k · plumaMultiplier); ganancia = P_derecho − P
// ---------------------------------------------------------------------------

/** Plumas que se ganarían ascendiendo ahora mismo (0 si no hay ninguna pendiente). */
export function plumasPending(state: GameState, content: Content, worldId: WorldId): number {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return 0;
  const entitled = Math.floor((worldState.lifetimeEarned.toNumber() / world.prestige.e0) ** world.prestige.exponent * plumaMultiplier(state, content, worldId));
  return Math.max(0, entitled - worldState.plumasTotal.toNumber());
}
