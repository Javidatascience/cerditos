// Únicas funciones (junto con tick.ts y, desde el hito 4, offline.ts/autobuy.ts) que mutan
// el GameState. Ver CLAUDE.md "Reglas de código" y docs/02-arquitectura.md §4.

import type { Content } from '../content/types.ts';
import { availableUpgrades, bulkCost, generatorCost, getGeneratorDef, getWorldDef, maxAffordable } from './formulas.ts';
import type { GameState, GeneratorId, Settings, UpgradeId, WorldId } from './state.ts';

export type BuyAmount = 1 | 10 | 'max';

/** Rasca la barriga de un cerdito: +1 a la moneda del mundo. No escala (regla anti-clic, CLAUDE.md). */
export function tap(state: GameState, worldId: WorldId): void {
  const worldState = state.worlds[worldId];
  if (!worldState) return;
  worldState.currency = worldState.currency.add(1);
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

  const count = amount === 'max' ? maxAffordable(world, gen, genState.bought, worldState.currency) : amount;
  if (count <= 0) return 0;

  const cost = bulkCost(world, gen, genState.bought, count);
  if (worldState.currency.lt(cost)) return 0;

  worldState.currency = worldState.currency.sub(cost);
  genState.bought += count;
  genState.owned = genState.owned.add(count);
  worldState.records.maxBought[genId] = Math.max(worldState.records.maxBought[genId] ?? 0, genState.bought);
  return count;
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
  return true;
}

/** Cambia la cantidad por defecto de los botones de compra (×1 / ×10 / máx). */
export function setBuyAmount(state: GameState, amount: BuyAmount): void {
  state.settings.buyAmount = amount;
}

/** Cambia la notación de los números (vista Ajustes, hito 4). */
export function setNotation(state: GameState, notation: Settings['notation']): void {
  state.settings.notation = notation;
}
