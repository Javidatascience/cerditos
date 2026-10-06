// Únicas funciones (junto con tick.ts y offline.ts) que mutan el GameState.
// Ver CLAUDE.md "Reglas de código" y docs/06-mina.md.

import type { Content } from '../content/types.ts';
import { basketValue } from './basket.ts';
import {
  ascendUnlocked,
  getPerk,
  nextUpgradeCost,
  nextUpgradeUnlocked,
  getTool,
  incomePerSecond,
  perkAvailable,
  perkCost,
  plumasPending,
  startCoins,
  tapGain,
  toolBulkCost,
  toolMaxAffordable,
  toolOwned,
} from './formulas.ts';
import { addEntry } from './journal.ts';
import { D, Decimal } from './num.ts';
import { updateReveals } from './reveal.ts';
import type { GameState, PerkId, Settings, ToolId } from './state.ts';

export type BuyAmount = 1 | 10 | 'max';

function gain(state: GameState, content: Content, amount: Decimal): void {
  state.coins = state.coins.add(amount);
  state.lifetime = state.lifetime.add(amount);
  updateReveals(state, content);
}

/** Pica: da `tapGain` monedas (1 s de producción, mínimo 1, con Manos de acero y el impulso del visitante). Devuelve lo ganado. */
export function tap(state: GameState, content: Content): Decimal {
  const amount = tapGain(state, content);
  gain(state, content, amount);
  state.taps += 1;
  return amount;
}

/**
 * Compra `amount` unidades de la herramienta (1, 10 "todo o nada", o "máx" = las que se puedan
 * pagar). Devuelve las unidades compradas (0 si ninguna). Nunca deja la moneda negativa.
 */
export function buyTool(state: GameState, content: Content, toolId: ToolId, amount: BuyAmount = 1): number {
  const tool = getTool(content, toolId);
  const owned = toolOwned(state, toolId);
  const count = amount === 'max' ? toolMaxAffordable(state, content, tool, owned, state.coins) : amount;
  if (count <= 0) return 0;
  const cost = toolBulkCost(state, content, tool, owned, count);
  if (state.coins.lt(cost)) return 0;
  state.coins = state.coins.sub(cost);
  state.tools[toolId] = owned + count;
  state.maxOwned[toolId] = Math.max(state.maxOwned[toolId] ?? 0, owned + count);
  updateReveals(state, content);
  return count;
}

/**
 * Compra la siguiente mejora de la herramienta (×2 de su producción) si ya se tienen las unidades
 * que la desbloquean y hay monedas. Se compran en orden. Devuelve `true` si se compró.
 */
export function buyUpgrade(state: GameState, content: Content, toolId: ToolId): boolean {
  const tool = getTool(content, toolId);
  if (!nextUpgradeUnlocked(state, content, toolId)) return false;
  const cost = nextUpgradeCost(state, content, tool);
  if (cost === null || state.coins.lt(cost)) return false;
  state.coins = state.coins.sub(cost);
  state.upgrades[toolId] = (state.upgrades[toolId] ?? 0) + 1;
  updateReveals(state, content);
  return true;
}

/** Cambia la cantidad por defecto de los botones de compra (×1 / ×10 / máx). */
export function setBuyAmount(state: GameState, amount: BuyAmount): void {
  state.settings.buyAmount = amount;
}

export function setNotation(state: GameState, notation: Settings['notation']): void {
  state.settings.notation = notation;
}

export function setEffects(state: GameState, enabled: boolean): void {
  state.settings.effects = enabled;
}

/** Compra un nivel de una ventaja permanente con plumas. Devuelve `true` si se compró. */
export function buyPerk(state: GameState, content: Content, perkId: PerkId): boolean {
  const perk = getPerk(content, perkId);
  if (!perkAvailable(state, perk)) return false;
  const level = state.perks[perkId] ?? 0;
  const cost = perkCost(perk, level);
  if (state.plumas.lt(cost)) return false;
  state.plumas = state.plumas.sub(cost);
  state.perks[perkId] = level + 1;
  return true;
}

/**
 * Asciende: cobra las plumas pendientes (por lo ganado en la vida) y reinicia la ronda (monedas y
 * herramientas), conservando plumas, ventajas, logros y récords. Solo si ya se llegó a la herramienta
 * que lo permite. Devuelve las plumas ganadas (0 si no se pudo o no había ninguna). `now`: epoch ms.
 */
export function ascend(state: GameState, content: Content, now: number): number {
  if (!ascendUnlocked(state, content)) return 0;
  const pending = plumasPending(state, content);
  if (pending <= 0) return 0;

  state.plumas = state.plumas.add(pending);
  state.plumasTotal = state.plumasTotal.add(pending);
  state.ascensions += 1;
  state.tools = {};
  state.upgrades = {};
  state.coins = startCoins(state, content);
  state.basketSince = state.time;
  updateReveals(state, content);

  addEntry(state, `Echas a volar y dejas ${pending} pluma${pending === 1 ? '' : 's'}. El cerdito vuelve a empezar, con más ganas.`, now);
  return pending;
}

// ---------------------------------------------------------------------------
// Cesta y visitante
// ---------------------------------------------------------------------------

/** Recoge la cesta: suma su valor a las monedas y la vacía. Devuelve lo recogido. */
export function collectBasket(state: GameState, content: Content): Decimal {
  const amount = basketValue(state, content);
  gain(state, content, amount);
  state.basketSince = state.time;
  return amount;
}

export type VisitorKind = 'injection' | 'boost';

/** Segundos de ingresos que da la inyección de un visitante. */
export const VISITOR_INJECTION_SECONDS = 600;
/** Multiplicador y duración del impulso de un visitante. */
export const VISITOR_BOOST = { mult: 5, seconds: 60 };

/** Recompensa de un cerdito viajero: `injection` = 10 min de ingresos de golpe; `boost` = ×5 de producción y picos durante 60 s. */
export function claimVisitor(state: GameState, content: Content, kind: VisitorKind): void {
  if (kind === 'boost') {
    state.buff = { mult: VISITOR_BOOST.mult, until: state.time + VISITOR_BOOST.seconds };
    return;
  }
  gain(state, content, incomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS));
}

export { D };
