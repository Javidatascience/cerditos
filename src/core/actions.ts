// Únicas funciones (junto con tick.ts, offline.ts y autobuy.ts) que mutan el GameState.
// Ver CLAUDE.md "Reglas de código" y docs/02-arquitectura.md §4.

import type { Content } from '../content/types.ts';
import {
  availableUpgrades,
  bulkCost,
  generatorCost,
  getGeneratorDef,
  getPerkDef,
  getWorldDef,
  maxAffordable,
  perkAvailable,
  perkCost,
  displayProductionPerSecond,
  perkCostGrowthDelta,
  totalCostMultiplier,
  plumasPending,
  startCurrency,
} from './formulas.ts';
import { addEntry } from './journal.ts';
import { touchCalm } from './mechanics/calm.ts';
import { harmonyLevel, lowestGenerators } from './mechanics/harmony.ts';
import { basketValue } from './basket.ts';
import { D, Decimal } from './num.ts';
import type { GameState, GeneratorId, PerkId, Settings, UpgradeId, WorldId } from './state.ts';

export type BuyAmount = 1 | 10 | 'max';

/** Segundos de producción que da cada toque (con un mínimo de 1 de moneda). */
export const TAP_SECONDS = 1;

/** Lo que daría rascar la barriga ahora: TAP_SECONDS de producción, mínimo 1. */
export function tapValue(state: GameState, content: Content, worldId: WorldId): Decimal {
  return Decimal.max(1, displayProductionPerSecond(state, content, worldId).mul(TAP_SECONDS));
}

/** Rasca la barriga: da `tapValue` de moneda (no cuenta como producción para plumas). Devuelve lo dado. */
export function tap(state: GameState, content: Content, worldId: WorldId): Decimal {
  const worldState = state.worlds[worldId];
  if (!worldState) return D(0);
  const gain = tapValue(state, content, worldId);
  worldState.currency = worldState.currency.add(gain);
  state.taps += 1;
  return gain;
}

/** Recoge la cesta de la granja: suma su valor a la moneda y la vacía. Devuelve lo recogido. */
export function collectBasket(state: GameState, content: Content, worldId: WorldId): Decimal {
  const worldState = state.worlds[worldId];
  if (!worldState || !worldState.unlocked) return D(0);
  const gain = basketValue(state, content, worldId);
  worldState.currency = worldState.currency.add(gain);
  worldState.runEarned = worldState.runEarned.add(gain);
  worldState.lifetimeEarned = worldState.lifetimeEarned.add(gain);
  worldState.basketSince = state.time;
  return gain;
}

export type VisitorKind = 'injection' | 'boost';

/** Minutos de producción que da la inyección de un visitante. */
export const VISITOR_INJECTION_SECONDS = 600;
/** Multiplicador y duración del impulso de un visitante. */
export const VISITOR_BOOST = { mult: 5, seconds: 60 };

/**
 * Recompensa de un cerdito viajero: `injection` = 10 min de producción del mundo activo de golpe;
 * `boost` = ×5 de producción en todos los mundos durante 60 s de juego.
 */
export function claimVisitor(state: GameState, content: Content, kind: VisitorKind, worldId: WorldId): void {
  if (kind === 'boost') {
    state.buff = { mult: VISITOR_BOOST.mult, until: state.time + VISITOR_BOOST.seconds };
    return;
  }
  const worldState = state.worlds[worldId];
  if (!worldState || !worldState.unlocked) return;
  const gain = displayProductionPerSecond(state, content, worldId).mul(VISITOR_INJECTION_SECONDS);
  worldState.currency = worldState.currency.add(gain);
  worldState.runEarned = worldState.runEarned.add(gain);
  worldState.lifetimeEarned = worldState.lifetimeEarned.add(gain);
}

/**
 * Compra `amount` unidades del generador (1, 10 "todo o nada", o "max" = las que se puedan
 * pagar). Devuelve el número de unidades realmente compradas (0 si no se compró ninguna).
 * Nunca deja la moneda negativa.
 */
export function buyGenerator(state: GameState, content: Content, worldId: WorldId, genId: GeneratorId, amount: BuyAmount = 1): number {
  const world = getWorldDef(content, worldId);
  const gen = getGeneratorDef(world, genId);
  const worldState = state.worlds[worldId];
  if (!worldState) return 0;
  const genState = worldState.generators[genId];
  if (!genState) return 0;

  const delta = perkCostGrowthDelta(state, content, worldId);
  const mult = totalCostMultiplier(state, content, worldId);

  const count = amount === 'max' ? maxAffordable(world, gen, genState.bought, worldState.currency, delta, mult) : amount;
  if (count <= 0) return 0;

  const cost = bulkCost(world, gen, genState.bought, count, delta, mult);
  if (worldState.currency.lt(cost)) return 0;

  worldState.currency = worldState.currency.sub(cost);
  genState.bought += count;
  genState.owned = genState.owned.add(count);
  worldState.records.maxBought[genId] = Math.max(worldState.records.maxBought[genId] ?? 0, genState.bought);
  touchCalm(world, worldState, state.time); // Balneario: comprar molesta (una vez por ventana)
  if (world.mechanic === 'harmony') worldState.records.maxHarmony = Math.max(worldState.records.maxHarmony, harmonyLevel(world, worldState));
  return count;
}

/** Coste de "Completar fila" (armonía): una unidad de cada cerdito que está en el mínimo. */
export function rowBundleCost(state: GameState, content: Content, worldId: WorldId): { genIds: GeneratorId[]; cost: Decimal } {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState || world.mechanic !== 'harmony') return { genIds: [], cost: D(0) };
  const delta = perkCostGrowthDelta(state, content, worldId);
  const mult = totalCostMultiplier(state, content, worldId);
  const genIds = lowestGenerators(world, worldState);
  let cost = D(0);
  for (const id of genIds) cost = cost.add(generatorCost(world, getGeneratorDef(world, id), worldState.generators[id]?.bought ?? 0, delta, mult));
  return { genIds, cost };
}

/**
 * Completar fila (armonía): compra una unidad de cada cerdito que está en el mínimo, todo o
 * nada. Devuelve `true` si se compró.
 */
export function buyRow(state: GameState, content: Content, worldId: WorldId): boolean {
  const worldState = state.worlds[worldId];
  if (!worldState) return false;
  const { genIds, cost } = rowBundleCost(state, content, worldId);
  if (genIds.length === 0 || worldState.currency.lt(cost)) return false;
  for (const id of genIds) buyGenerator(state, content, worldId, id, 1);
  return true;
}

/**
 * Compra una mejora (por cerdito o global) si está disponible y hay dinero. Reutiliza
 * `availableUpgrades` como única fuente de verdad de qué hay a la venta y a qué precio, para
 * no duplicar esa lógica. Devuelve `true` si se compró.
 */
export function buyUpgrade(state: GameState, content: Content, worldId: WorldId, upgradeId: UpgradeId): boolean {
  const worldState = state.worlds[worldId];
  if (!worldState || worldState.upgrades[upgradeId]) return false;

  const offer = availableUpgrades(state, content, worldId).find((o) => o.id === upgradeId);
  if (!offer || worldState.currency.lt(offer.cost)) return false;

  worldState.currency = worldState.currency.sub(offer.cost);
  worldState.upgrades[upgradeId] = true;
  touchCalm(getWorldDef(content, worldId), worldState, state.time);
  return true;
}

/** Cambia el mundo que se está viendo (solo si está desbloqueado). */
export function setActiveWorld(state: GameState, worldId: WorldId): void {
  if (state.worlds[worldId]?.unlocked) state.activeWorld = worldId;
}

/** Cambia la cantidad por defecto de los botones de compra (×1 / ×10 / máx). */
export function setBuyAmount(state: GameState, amount: BuyAmount): void {
  state.settings.buyAmount = amount;
}

/** Cambia la notación de los números (vista Ajustes, hito 4). */
export function setNotation(state: GameState, notation: Settings['notation']): void {
  state.settings.notation = notation;
}

/** Activa o apaga los efectos y animaciones (granja animada, números que suben). */
export function setEffects(state: GameState, enabled: boolean): void {
  state.settings.effects = enabled;
}

/**
 * Compra un nivel de una ventaja permanente con las plumas del mundo al que pertenece.
 * Devuelve `true` si se compró. No hace nada si no cumple los requisitos, está al máximo o
 * no hay plumas suficientes.
 */
export function buyPerk(state: GameState, content: Content, perkId: PerkId): boolean {
  const perk = getPerkDef(content, perkId);
  if (!perkAvailable(state, content, perk)) return false;
  const worldState = state.worlds[perk.world];
  if (!worldState) return false;

  const level = worldState.perks[perkId] ?? 0;
  const cost = perkCost(perk, level);
  if (worldState.plumas.lt(cost)) return false;

  worldState.plumas = worldState.plumas.sub(cost);
  worldState.perks[perkId] = level + 1;
  return true;
}

/**
 * Echa a volar el mundo: cobra las plumas pendientes (01 §5) y reinicia la ronda (moneda,
 * cerditos, mejoras y estadísticas de la ronda), conservando plumas, ventajas y todo lo
 * demás. `now`: epoch ms, para la entrada del diario (core no lee el reloj del sistema).
 * Devuelve las plumas ganadas (0 si no había ninguna pendiente: no se puede ascender "en
 * vano", ver 01 §5 y el test de ascend que exige que P nunca disminuya).
 */
export function ascend(state: GameState, content: Content, worldId: WorldId, now: number): number {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId];
  if (!worldState) return 0;

  const gain = plumasPending(state, content, worldId);
  if (gain <= 0) return 0;

  worldState.plumas = worldState.plumas.add(gain);
  worldState.plumasTotal = worldState.plumasTotal.add(gain);
  worldState.ascensions += 1;

  worldState.currency = startCurrency(state, content, worldId);
  worldState.runEarned = D(0);
  for (const gen of world.generators) {
    const genState = worldState.generators[gen.id];
    if (!genState) continue;
    genState.bought = 0;
    genState.owned = D(0);
  }
  worldState.upgrades = {};
  worldState.runSeconds = 0;
  worldState.calm = 1; // cada ronda empieza con la calma llena (03 §3.4)
  worldState.calmPenaltyUntil = -1;

  addEntry(state, `${world.name}: tus cerdos han decidido que hoy sí, hoy vuelan. Dejan tras de sí ${gain} pluma${gain === 1 ? '' : 's'}.`, now);

  return gain;
}
