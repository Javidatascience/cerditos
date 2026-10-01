// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/02-arquitectura.md §4 y §8.

import { generatorUpgradeName } from '../content/upgrades.ts';
import type { Content, GeneratorDef, PerkDef, WorldDef } from '../content/types.ts';
import {
  availableUpgrades,
  bulkCost,
  generatorCost,
  generatorMultiplier,
  generatorUpgradeId,
  getGeneratorDef,
  getWorldDef,
  globalMultiplier,
  maxAffordable,
  perkAvailable,
  perkCost,
  perkCostGrowthDelta,
  perkCostMultiplier,
  perkLevel,
  perPlumaBonusRate,
  plumasPending,
  productionPerSecond,
  type UpgradeOffer,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import type { BuyAmount } from './actions.ts';
import type { GameState, PerkId, WorldId, WorldState } from './state.ts';

export interface HeaderView {
  worldName: string;
  currencyName: string;
  currency: Decimal;
  perSecond: Decimal;
}

export function headerView(state: GameState, content: Content, worldId: WorldId): HeaderView {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  return {
    worldName: world.name,
    currencyName: world.currency,
    currency: worldState?.currency ?? D(0),
    perSecond: productionPerSecond(state, content, worldId),
  };
}

export interface GeneratorView {
  id: string;
  name: string;
  flavor: string;
  owned: Decimal;
  prodPerSec: Decimal;
  /** Coste de comprar `amountToBuy` unidades ahora mismo (según settings.buyAmount). */
  nextCost: Decimal;
  /** Unidades que compraría el botón ahora mismo (0 si con "máx" no llega ni a 1). */
  amountToBuy: number;
  canAfford: boolean;
}

export function generatorViews(state: GameState, content: Content, worldId: WorldId): GeneratorView[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return [];
  const m = globalMultiplier(state, content, worldId);
  const amount = state.settings.buyAmount;
  const costDelta = perkCostGrowthDelta(state, content, worldId);
  const costMult = perkCostMultiplier(state, content, worldId);

  return world.generators.map((gen) => {
    const genState = worldState.generators[gen.id];
    const owned = genState?.owned ?? D(0);
    const bought = genState?.bought ?? 0;
    const genMult = generatorMultiplier(world, worldState, gen);

    const amountToBuy = amount === 'max' ? maxAffordable(world, gen, bought, worldState.currency, costDelta, costMult) : amount;
    const nextCost = amountToBuy > 0 ? bulkCost(world, gen, bought, amountToBuy, costDelta, costMult) : generatorCost(world, gen, bought, costDelta, costMult);

    return {
      id: gen.id,
      name: gen.name,
      flavor: gen.flavor,
      owned,
      prodPerSec: owned.mul(gen.baseProd).mul(genMult).mul(m),
      nextCost,
      amountToBuy,
      canAfford: amountToBuy > 0 && worldState.currency.gte(nextCost),
    };
  });
}

/**
 * El cerdito cuya próxima compra es más barata entre los que aún no se pueden pagar, con el
 * tiempo estimado hasta poder pagarla al ritmo de producción actual. `null` si todo es
 * asequible ya, o si no hay forma de estimarlo (producción 0: ver 01 §4, "te faltan 12 s").
 */
export interface PendingPurchase {
  name: string;
  etaSeconds: number | null;
  progress: number; // 0..1, para la barra fina de progreso
}

export function cheapestPendingPurchase(state: GameState, content: Content, worldId: WorldId): PendingPurchase | null {
  const worldState = state.worlds[worldId];
  if (!worldState) return null;
  const views = generatorViews(state, content, worldId);
  const pending = views.filter((v) => !v.canAfford);
  if (pending.length === 0) return null;

  let cheapest = pending[0];
  if (!cheapest) return null;
  for (const v of pending) if (v.nextCost.lt(cheapest.nextCost)) cheapest = v;

  const missing = cheapest.nextCost.sub(worldState.currency);
  const progress = worldState.currency.div(cheapest.nextCost).toNumber();
  const rate = productionPerSecond(state, content, worldId);
  const etaSeconds = rate.gt(0) ? Math.max(0, missing.div(rate).toNumber()) : null;

  return { name: cheapest.name, etaSeconds, progress: Math.min(1, Math.max(0, progress)) };
}

export interface UpgradeView {
  id: string;
  name: string;
  effectText: string;
  cost: Decimal;
  canAfford: boolean;
}

function describeUpgrade(world: WorldDef, worldState: WorldState, offer: UpgradeOffer): UpgradeView {
  const canAfford = worldState.currency.gte(offer.cost);
  if (offer.kind === 'generator') {
    const gen = getGeneratorDef(world, offer.genId);
    const mult = world.genUpgrades?.mult ?? 1;
    return { id: offer.id, name: generatorUpgradeName(world.id, gen, offer.level), effectText: `×${mult} producción de ${gen.name}`, cost: offer.cost, canAfford };
  }
  const upgrade = world.globalUpgrades.find((u) => u.id === offer.id);
  return {
    id: offer.id,
    name: upgrade?.name ?? offer.id,
    effectText: `×${upgrade?.mult ?? 1} a todo el mundo`,
    cost: offer.cost,
    canAfford,
  };
}

export function upgradeViews(state: GameState, content: Content, worldId: WorldId): UpgradeView[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return [];
  return availableUpgrades(state, content, worldId)
    .map((offer) => describeUpgrade(world, worldState, offer))
    .sort((a, b) => a.cost.cmp(b.cost));
}

/** Mejoras ya compradas (por cerdito y globales), para el desplegable de la vista de mejoras. */
export function purchasedUpgradeViews(state: GameState, content: Content, worldId: WorldId): { id: string; name: string }[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return [];
  const result: { id: string; name: string }[] = [];

  for (const upgrade of world.globalUpgrades) {
    if (worldState.upgrades[upgrade.id]) result.push({ id: upgrade.id, name: upgrade.name });
  }
  if (world.genUpgrades) {
    const levels = world.genUpgrades.counts.length;
    for (const gen of world.generators) {
      for (let level = 0; level < levels; level++) {
        const id = generatorUpgradeId(gen.id, level);
        if (worldState.upgrades[id]) result.push({ id, name: generatorUpgradeName(world.id, gen, level) });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Ascensión (hito 5, 01 §5)
// ---------------------------------------------------------------------------

export interface AscendView {
  plumas: Decimal;
  plumasTotal: Decimal;
  /** Plumas que se ganarían ascendiendo ahora mismo. */
  pendingGain: number;
  /** Bono pasivo actual: 1 + tasa·plumasTotal. */
  currentBonusMultiplier: number;
  /** El mismo bono si se ascendiera ahora ("tu producción pasaría de ×A a ×B"). */
  nextBonusMultiplier: number;
  canAscend: boolean;
}

export function ascendView(state: GameState, content: Content, worldId: WorldId): AscendView {
  const worldState = state.worlds[worldId];
  if (!worldState) {
    return { plumas: D(0), plumasTotal: D(0), pendingGain: 0, currentBonusMultiplier: 1, nextBonusMultiplier: 1, canAscend: false };
  }
  const pendingGain = plumasPending(state, content, worldId);
  const rate = perPlumaBonusRate(state, content, worldId);
  const plumasTotal = worldState.plumasTotal.toNumber();
  return {
    plumas: worldState.plumas,
    plumasTotal: worldState.plumasTotal,
    pendingGain,
    currentBonusMultiplier: 1 + rate * plumasTotal,
    nextBonusMultiplier: 1 + rate * (plumasTotal + pendingGain),
    canAscend: pendingGain > 0,
  };
}

// ---------------------------------------------------------------------------
// Árbol de ventajas permanentes (hito 5, 01 §6)
// ---------------------------------------------------------------------------

export interface PerkView {
  id: PerkId;
  name: string;
  flavor: string;
  level: number;
  maxLevel: number | null;
  maxed: boolean;
  cost: Decimal;
  /** Nombres de las ventajas que todavía faltan por tener (vacío si no está bloqueada). */
  missingRequirements: string[];
  /** Puede comprarse ya: no bloqueada, no al máximo y hay plumas suficientes. */
  purchasable: boolean;
  currentEffectText: string;
  /** Efecto si se compra un nivel más; `null` si ya está al máximo. */
  nextEffectText: string | null;
}

function perkEffectValueText(perk: PerkDef, level: number): string {
  const e = perk.effect;
  switch (e.kind) {
    case 'prodMult':
      return `×${(e.perLevel ** level).toFixed(2)} producción`;
    case 'costMult':
      return `×${(e.perLevel ** level).toFixed(2)} coste de los cerditos`;
    case 'upgradeCostMult':
      return `×${(e.perLevel ** level).toFixed(2)} coste de las mejoras`;
    case 'startCurrency':
      return `×${Math.round(e.perLevel ** level)} moneda inicial`;
    case 'plumaMult':
      return `+${Math.round(e.perLevel * level * 100)} % plumas al ascender`;
    case 'crossProd':
      return `+${Math.round(e.perLevel * level * 100)} % producción en los demás mundos`;
    case 'costGrowthDelta':
      return `el coste de los cerditos crece ${(e.perLevel * level).toFixed(4)} menos`;
    case 'perPlumaBonus':
      return `+${Math.round(e.perLevel * level * 100)} % extra en el bono de plumas`;
    case 'autobuyGenerators':
      return level > 0 ? 'compra cerditos sola' : 'inactiva';
    case 'autobuyUpgrades':
      return level > 0 ? 'compra mejoras sola' : 'inactiva';
  }
}

export function perkViews(state: GameState, content: Content, worldId: WorldId): PerkView[] {
  const worldState = state.worlds[worldId];
  return content.perks
    .filter((perk) => perk.world === worldId)
    .map((perk) => {
      const level = worldState?.perks[perk.id] ?? 0;
      const maxed = perk.maxLevel !== null && level >= perk.maxLevel;
      const cost = perkCost(perk, level);
      const missingRequirements = perk.requires
        .filter((reqId) => perkLevel(state, content, reqId) <= 0)
        .map((reqId) => content.perks.find((p) => p.id === reqId)?.name ?? reqId);
      const canAfford = (worldState?.plumas ?? D(0)).gte(cost);

      return {
        id: perk.id,
        name: perk.name,
        flavor: perk.flavor,
        level,
        maxLevel: perk.maxLevel,
        maxed,
        cost,
        missingRequirements,
        purchasable: !maxed && missingRequirements.length === 0 && canAfford,
        currentEffectText: perkEffectValueText(perk, level),
        nextEffectText: maxed ? null : perkEffectValueText(perk, level + 1),
      };
    });
}

// Re-exportado para los tests que quieran forzar un BuyAmount sin importar actions.ts.
export type { BuyAmount, GeneratorDef };
