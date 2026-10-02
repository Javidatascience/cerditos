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
  perkCostGrowthDelta,
  totalCostMultiplier,
  plumasPending,
  startCurrency,
} from './formulas.ts';
import { addEntry } from './journal.ts';
import { D } from './num.ts';
import type { GameState, GeneratorId, PerkId, Settings, UpgradeId, WorldId } from './state.ts';

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

/** Pausa o reactiva Capataz/Encargada sin perder las ventajas ya compradas (hito 5). */
export function setAutobuyEnabled(state: GameState, enabled: boolean): void {
  state.settings.autobuyEnabled = enabled;
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
