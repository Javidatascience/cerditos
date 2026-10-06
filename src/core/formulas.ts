// Fórmulas del juego. Ver docs/06-mina.md. Todo número sale de `content.game` y de los datos de
// herramientas y ventajas: aquí no hay ningún nombre ni constante propia del juego.

import type { Content, PerkDef, PerkEffect, ToolDef } from '../content/types.ts';
import { bulkCost as bulkCostOf, D, Decimal, maxAffordable as maxAffordableOf } from './num.ts';
import type { GameState, PerkId, ToolId } from './state.ts';

// ---------------------------------------------------------------------------
// Ventajas permanentes
// ---------------------------------------------------------------------------

export function getPerk(content: Content, id: PerkId): PerkDef {
  const perk = content.perks.find((p) => p.id === id);
  if (!perk) throw new Error(`Ventaja desconocida: ${id}`);
  return perk;
}

export function perkLevelOf(state: GameState, id: PerkId): number {
  return state.perks[id] ?? 0;
}

/** coste(nivel L → L+1) = ceil(base · crecimiento^L), en plumas. */
export function perkCost(perk: PerkDef, level: number): Decimal {
  return D(perk.baseCost).mul(Decimal.pow(perk.costGrowth, level)).ceil();
}

export function perkAvailable(state: GameState, perk: PerkDef): boolean {
  const level = perkLevelOf(state, perk.id);
  if (perk.maxLevel !== null && level >= perk.maxLevel) return false;
  return perk.requires.every((id) => perkLevelOf(state, id) > 0);
}

function perksOfKind(state: GameState, content: Content, kind: PerkEffect['kind']): { perk: PerkDef; level: number }[] {
  const out: { perk: PerkDef; level: number }[] = [];
  for (const perk of content.perks) {
    if (perk.effect.kind !== kind) continue;
    const level = perkLevelOf(state, perk.id);
    if (level > 0) out.push({ perk, level });
  }
  return out;
}

/** Suma de `perLevel · nivel` de las ventajas de `kind`. */
export function perkSum(state: GameState, content: Content, kind: PerkEffect['kind']): number {
  let total = 0;
  for (const { perk, level } of perksOfKind(state, content, kind)) total += perk.effect.perLevel * level;
  return total;
}

/** Producto de `perLevel^nivel` de las ventajas de `kind`. */
export function perkProduct(state: GameState, content: Content, kind: PerkEffect['kind']): number {
  let total = 1;
  for (const { perk, level } of perksOfKind(state, content, kind)) total *= perk.effect.perLevel ** level;
  return total;
}

// ---------------------------------------------------------------------------
// Herramientas
// ---------------------------------------------------------------------------

export function getTool(content: Content, id: ToolId): ToolDef {
  const tool = content.tools.find((t) => t.id === id);
  if (!tool) throw new Error(`Herramienta desconocida: ${id}`);
  return tool;
}

export function toolOwned(state: GameState, id: ToolId): number {
  return state.tools[id] ?? 0;
}

export function upgradesBought(state: GameState, id: ToolId): number {
  return state.upgrades[id] ?? 0;
}

/** ×mult por cada mejora comprada (`level` = cuántas). */
export function upgradeMult(content: Content, level: number): number {
  return content.game.milestoneMult ** level;
}

/** Cantidad de unidades que desbloquea la siguiente mejora de la herramienta, o null si ya están todas compradas. */
export function nextUpgradeThreshold(state: GameState, content: Content, id: ToolId): number | null {
  return content.game.milestones[upgradesBought(state, id)] ?? null;
}

/** ¿Está desbloqueada (se tienen las unidades pedidas) la siguiente mejora de la herramienta? */
export function nextUpgradeUnlocked(state: GameState, content: Content, id: ToolId): boolean {
  const threshold = nextUpgradeThreshold(state, content, id);
  return threshold !== null && toolOwned(state, id) >= threshold;
}

/** m_coste: Regateo en la feria. */
export function costMultiplier(state: GameState, content: Content): number {
  return perkProduct(state, content, 'costMult');
}

/** Coste de comprar `k` unidades a partir de las `n` ya tenidas. */
export function toolBulkCost(state: GameState, content: Content, tool: ToolDef, n: number, k: number): Decimal {
  return bulkCostOf(D(tool.baseCost).mul(costMultiplier(state, content)), content.game.costGrowth, n, k);
}

/** Máximo de unidades que se pueden comprar con `money`, a partir de las `n` ya tenidas. */
export function toolMaxAffordable(state: GameState, content: Content, tool: ToolDef, n: number, money: Decimal): number {
  return maxAffordableOf(money, D(tool.baseCost).mul(costMultiplier(state, content)), content.game.costGrowth, n);
}

/** Bono pasivo de las plumas: 1 + (perPluma + Raíces) · plumas ganadas en total. */
export function plumaBonus(state: GameState, content: Content): number {
  const rate = content.game.perPluma + perkSum(state, content, 'perPlumaBonus');
  return 1 + rate * state.plumasTotal.toNumber();
}

/** Multiplicador permanente de la producción: ventajas (Abono) × bono de plumas. */
export function prodMultiplier(state: GameState, content: Content): number {
  return perkProduct(state, content, 'prodMult') * plumaBonus(state, content);
}

/** Producción por segundo de UNA unidad de la herramienta (con sus mejoras compradas y los bonos). */
export function unitProduction(state: GameState, content: Content, tool: ToolDef): Decimal {
  return D(tool.baseProd).mul(upgradeMult(content, upgradesBought(state, tool.id))).mul(prodMultiplier(state, content));
}

/** Producción por segundo de todas las unidades de la herramienta. */
export function toolProduction(state: GameState, content: Content, tool: ToolDef): Decimal {
  return unitProduction(state, content, tool).mul(toolOwned(state, tool.id));
}

/** Monedas por segundo totales (sin el impulso del visitante). */
export function incomePerSecond(state: GameState, content: Content): Decimal {
  let total = D(0);
  for (const tool of content.tools) total = total.add(toolProduction(state, content, tool));
  return total;
}

/** Lo que da un toque: `tapSeconds` de producción (mínimo 1 moneda) × Manos de acero × impulso del visitante. */
export function tapGain(state: GameState, content: Content): Decimal {
  const base = Decimal.max(1, incomePerSecond(state, content).mul(content.game.tapSeconds));
  return base.mul(1 + perkSum(state, content, 'tapMult')).mul(state.buff?.mult ?? 1);
}

// ---------------------------------------------------------------------------
// Ascensión
// ---------------------------------------------------------------------------

/** Plumas que "te corresponden" por lo ganado en la vida: floor((vida / e0)^k · (1 + Plumas al viento)). */
export function plumasEntitled(state: GameState, content: Content): number {
  const g = content.game;
  const ratio = state.lifetime.div(g.plumaE0);
  if (ratio.lt(1)) return 0;
  const mult = 1 + perkSum(state, content, 'plumaMult');
  return Math.floor(ratio.pow(g.plumaExponent).toNumber() * mult);
}

/** Plumas que se ganarían ascendiendo ahora (lo que te corresponde menos lo ya cobrado). */
export function plumasPending(state: GameState, content: Content): number {
  return Math.max(0, plumasEntitled(state, content) - state.plumasTotal.toNumber());
}

/** ¿Ya se llegó a la herramienta que permite ascender (alguna vez)? */
export function ascendUnlocked(state: GameState, content: Content): boolean {
  const tool = content.tools[content.game.ascendTool];
  return tool !== undefined && (state.maxOwned[tool.id] ?? 0) >= 1;
}

/** Moneda con la que empieza la ronda: la base más lo que da Buen comienzo (100 · (10^nivel − 1)). */
export function startCoins(state: GameState, content: Content): Decimal {
  let coins = D(content.game.startCoins);
  for (const { perk, level } of perksOfKind(state, content, 'startCurrency')) {
    coins = coins.add(D(100).mul(Decimal.pow(perk.effect.perLevel, level).sub(1)));
  }
  return coins;
}

/** Segundos máximos de producción mientras no estás (2 h + Siesta larga). */
export function offlineCapSeconds(state: GameState, content: Content): number {
  return (content.game.offlineHours + perkSum(state, content, 'offlineHours')) * 3600;
}

/** Coste de la siguiente mejora de la herramienta (5× el precio de la unidad que la desbloquea); null si no quedan. */
export function nextUpgradeCost(state: GameState, content: Content, tool: ToolDef): Decimal | null {
  const threshold = nextUpgradeThreshold(state, content, tool.id);
  if (threshold === null) return null;
  return D(tool.baseCost)
    .mul(Decimal.pow(content.game.costGrowth, threshold))
    .mul(content.game.upgradeCostFactor)
    .mul(costMultiplier(state, content))
    .ceil();
}
