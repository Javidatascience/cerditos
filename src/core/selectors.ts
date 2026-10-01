// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/02-arquitectura.md §4 y §8.

import { generatorUpgradeName } from '../content/upgrades.ts';
import type { Content, GeneratorDef, WorldDef } from '../content/types.ts';
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
  productionPerSecond,
  type UpgradeOffer,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import type { BuyAmount } from './actions.ts';
import type { GameState, WorldId, WorldState } from './state.ts';

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

  return world.generators.map((gen) => {
    const genState = worldState.generators[gen.id];
    const owned = genState?.owned ?? D(0);
    const bought = genState?.bought ?? 0;
    const genMult = generatorMultiplier(world, worldState, gen);

    const amountToBuy = amount === 'max' ? maxAffordable(world, gen, bought, worldState.currency) : amount;
    const nextCost = amountToBuy > 0 ? bulkCost(world, gen, bought, amountToBuy) : generatorCost(world, gen, bought);

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

// Re-exportado para los tests que quieran forzar un BuyAmount sin importar actions.ts.
export type { BuyAmount, GeneratorDef };
