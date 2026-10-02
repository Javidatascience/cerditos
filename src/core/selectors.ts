// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/02-arquitectura.md §4 y §8.

import { generatorUpgradeName } from '../content/upgrades.ts';
import type { Bonus, Content, GeneratorDef, PerkDef, Requirement, WorldDef } from '../content/types.ts';
import { requirementProgress } from './collection.ts';
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
  totalCostMultiplier,
  perkLevel,
  perPlumaBonusRate,
  plumasPending,
  displayProductionPerSecond,
  type UpgradeOffer,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import { calmMultiplier, purchaseWouldDisturb } from './mechanics/calm.ts';
import { harmonyLevel, harmonyMultiplier, lowestGenerators, nextHarmonyThreshold } from './mechanics/harmony.ts';
import { unlockProgress } from './unlocks.ts';
import { rowBundleCost, type BuyAmount } from './actions.ts';
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
    perSecond: displayProductionPerSecond(state, content, worldId),
  };
}

export interface WorldTabView {
  id: WorldId;
  name: string;
  unlocked: boolean;
  active: boolean;
  /** Mientras está bloqueado: de qué mundo y cuántas plumas hacen falta, con tu progreso. */
  requirement: { fromWorldName: string; current: number; target: number } | null;
}

/** Pestañas de mundo: los desbloqueados y, en gris, el siguiente con su requisito visible. */
export function worldTabs(state: GameState, content: Content): WorldTabView[] {
  const tabs: WorldTabView[] = [];
  let nextShown = false;
  for (const world of content.worlds) {
    const unlocked = state.worlds[world.id]?.unlocked ?? false;
    if (!unlocked) {
      if (nextShown) continue;
      nextShown = true;
    }
    const progress = unlocked ? null : unlockProgress(state, world);
    tabs.push({
      id: world.id,
      name: world.name,
      unlocked,
      active: world.id === state.activeWorld,
      requirement: progress ? { fromWorldName: content.worlds.find((w) => w.id === progress.fromWorld)?.name ?? progress.fromWorld, current: progress.current, target: progress.target } : null,
    });
  }
  return tabs;
}

export interface GeneratorView {
  id: string;
  name: string;
  flavor: string;
  owned: Decimal;
  prodPerSec: Decimal;
  /** Qué produce `prodPerSec`: `null` = la moneda del mundo; en la cadena, el cerdito del nivel inferior. */
  prodUnit: string | null;
  /** Coste de comprar `amountToBuy` unidades ahora mismo (según settings.buyAmount). */
  nextCost: Decimal;
  /** Unidades que compraría el botón ahora mismo (0 si con "máx" no llega ni a 1). */
  amountToBuy: number;
  canAfford: boolean;
  /** Armonía: este cerdito está en el mínimo (el que frena la fila). */
  atMinimum: boolean;
}

export function generatorViews(state: GameState, content: Content, worldId: WorldId): GeneratorView[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return [];
  const m = globalMultiplier(state, content, worldId);
  const amount = state.settings.buyAmount;
  const costDelta = perkCostGrowthDelta(state, content, worldId);
  const costMult = totalCostMultiplier(state, content, worldId);
  const calmFactor = calmMultiplier(world, worldState);
  const lowest = world.mechanic === 'harmony' ? new Set(lowestGenerators(world, worldState)) : new Set<string>();

  return world.generators.map((gen, k) => {
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
      prodPerSec: owned.mul(gen.baseProd).mul(genMult).mul(world.mechanic === 'chain' && k > 0 ? 1 : m * calmFactor),
      prodUnit: world.mechanic === 'chain' && k > 0 ? (world.generators[k - 1]?.name ?? null) : null,
      nextCost,
      amountToBuy,
      canAfford: amountToBuy > 0 && worldState.currency.gte(nextCost),
      atMinimum: lowest.has(gen.id),
    };
  });
}

export interface CalmView {
  /** 0..1 */
  calm: number;
  /** Factor de producción por calma (1..1+maxBonus). */
  multiplier: number;
  /** Comprar ahora bajaría la calma (fuera de la ventana ya penalizada). */
  buyWillDisturb: boolean;
  /** Factor al que bajaría la calma al comprar (0,5 = a la mitad). */
  penalty: number;
  /** Segundos que quedan de ventana en la que comprar no molesta más (0 si no hay). */
  windowSecondsLeft: number;
}

/** Datos de la calma del Balneario; `null` en los mundos que no la usan. */
export function calmView(state: GameState, content: Content, worldId: WorldId): CalmView | null {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (world.mechanic !== 'calm' || !world.calm || !worldState) return null;
  return {
    calm: worldState.calm,
    multiplier: calmMultiplier(world, worldState),
    buyWillDisturb: purchaseWouldDisturb(world, worldState, state.time),
    penalty: world.calm.penalty,
    windowSecondsLeft: Math.max(0, worldState.calmPenaltyUntil - state.time),
  };
}

export interface HarmonyView {
  rows: number;
  multiplier: number;
  /** Siguiente umbral de ×mult (`null` si ya se alcanzaron todos) y el multiplicador que daría. */
  nextThreshold: number | null;
  /** Factor que añade cada umbral (×2). */
  thresholdMult: number;
  rowCost: Decimal;
  canBuyRow: boolean;
}

/** Datos de la armonía de la Huerta; `null` en los mundos que no la usan. */
export function harmonyView(state: GameState, content: Content, worldId: WorldId): HarmonyView | null {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (world.mechanic !== 'harmony' || !worldState) return null;
  const rows = harmonyLevel(world, worldState);
  const nextThreshold = nextHarmonyThreshold(world, rows);
  const { genIds, cost } = rowBundleCost(state, content, worldId);
  return {
    rows,
    multiplier: harmonyMultiplier(world, rows),
    nextThreshold,
    thresholdMult: world.harmony?.mult ?? 1,
    rowCost: cost,
    canBuyRow: genIds.length > 0 && worldState.currency.gte(cost),
  };
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
  const rate = displayProductionPerSecond(state, content, worldId);
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

// ---------------------------------------------------------------------------
// Álbum de variedades (hito 6, 01 §8)
// ---------------------------------------------------------------------------

export interface RequirementView {
  current: Decimal;
  target: Decimal;
  done: boolean;
  /** Frase del requisito; `format` da formato a los números (los formatea la UI, no core). */
  describe(format: (n: Decimal) => string): string;
}

export interface VarietyView {
  id: string;
  name: string;
  flavor: string;
  owned: boolean;
  bonusText: string;
  requirements: RequirementView[];
}

export interface SetView {
  id: string;
  name: string;
  bonusText: string;
  ownedCount: number;
  total: number;
  complete: boolean;
  varieties: VarietyView[];
}

function bonusText(content: Content, bonus: Bonus): string {
  const percent = Math.round(Math.abs(bonus.mult - 1) * 100);
  const sign = bonus.mult >= 1 ? '+' : '−';
  const where = bonus.world === 'all' ? 'en todos los mundos' : `en ${content.worlds.find((w) => w.id === bonus.world)?.name ?? bonus.world}`;
  return bonus.kind === 'prod' ? `${sign}${percent} % de producción ${where}` : `${sign}${percent} % en el coste de los cerditos ${where}`;
}

function describeRequirement(content: Content, req: Requirement): (format: (n: Decimal) => string) => string {
  const world = (id: string) => content.worlds.find((w) => w.id === id);
  const worldName = (id: string) => world(id)?.name ?? id;
  switch (req.kind) {
    case 'genCount': {
      const gen = world(req.world)?.generators.find((g) => g.id === req.gen);
      return (f) => `Ten ${f(D(req.count))} ${gen?.name ?? req.gen} a la vez en ${worldName(req.world)}`;
    }
    case 'ascensions':
      return (f) => `Echa a volar ${f(D(req.count))} ${req.count === 1 ? 'vez' : 'veces'} en ${worldName(req.world)}`;
    case 'plumasTotal':
      return (f) => `Consigue ${f(D(req.count))} ${world(req.world)?.prestigeCurrency ?? 'plumas'} en total`;
    case 'lifetime':
      return (f) => `Gana ${f(D(req.amount))} ${world(req.world)?.currency ?? ''} en total en ${worldName(req.world)}`;
    case 'harmony':
      return (f) => `Llega a ${f(D(req.count))} filas completas en ${worldName(req.world)}`;
    case 'varieties': {
      const names = req.ids.map((id) => content.varieties.find((v) => v.id === id)?.name ?? id);
      return () => `Consigue antes: ${names.join(', ')}`;
    }
  }
}

export function albumViews(state: GameState, content: Content): SetView[] {
  return content.sets.map((set) => {
    const varieties: VarietyView[] = content.varieties
      .filter((v) => v.set === set.id)
      .map((v) => ({
        id: v.id,
        name: v.name,
        flavor: v.flavor,
        owned: state.collection[v.id] !== undefined,
        bonusText: bonusText(content, v.bonus),
        requirements: v.requires.map((req): RequirementView => ({ ...requirementProgress(state, req), describe: describeRequirement(content, req) })),
      }));
    const ownedCount = varieties.filter((v) => v.owned).length;
    return {
      id: set.id,
      name: set.name,
      bonusText: bonusText(content, set.bonus),
      ownedCount,
      total: varieties.length,
      complete: varieties.length > 0 && ownedCount === varieties.length,
      varieties,
    };
  });
}

export function albumSummary(state: GameState, content: Content): { owned: number; total: number } {
  return { owned: content.varieties.filter((v) => state.collection[v.id] !== undefined).length, total: content.varieties.length };
}

/** Entradas del diario, de la más reciente a la más antigua. */
export function journalEntries(state: GameState): { at: number; text: string }[] {
  return [...state.journal].reverse();
}
