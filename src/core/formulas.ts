// Fórmulas del juego. Ver docs/06-mina.md. Todo número sale de `content.game` y de los datos de
// herramientas y ventajas: aquí no hay ningún nombre ni constante propia del juego.

import type { AccessoryDef, CompanionAbility, CompanionDef, Content, GlobalUpgradeDef, PerkDef, PerkEffect, RelicDef, SkinDef, ToolDef } from '../content/types.ts';
import { caveProduct, caveSum, dragonBonus } from './cave.ts';
import { gardenProduct, gardenSum } from './garden.ts';
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

/** coste(nivel L → L+1) = ceil(base · crecimiento^L), en esmeraldas. */
export function perkCost(perk: PerkDef, level: number): Decimal {
  return D(perk.baseCost).mul(Decimal.pow(perk.costGrowth, level)).ceil();
}

export function perkAvailable(state: GameState, perk: PerkDef): boolean {
  const level = perkLevelOf(state, perk.id);
  if (perk.maxLevel !== null && level >= perk.maxLevel) return false;
  return perkRequirementsMet(state, perk);
}

/** ¿Se cumplen los requisitos de otras ventajas (cada una al nivel pedido)? Ignora el tope propio. */
export function perkRequirementsMet(state: GameState, perk: PerkDef): boolean {
  const needed = perk.requiresLevel ?? 1;
  if (perk.requiresPlumasTotal !== undefined && state.plumasTotal.lt(perk.requiresPlumasTotal)) return false;
  return perk.requires.every((id) => perkLevelOf(state, id) >= needed);
}

function perksOfKind(state: GameState, content: Content, kind: PerkEffect['kind']): { perk: PerkDef; level: number }[] {
  const out: { perk: PerkDef; level: number }[] = [];
  for (const perk of content.perks) {
    if (perk.effect.kind !== kind) continue;
    const level = perkLevelOf(state, perk.id);
    if (level > 0) out.push({ perk, level });
  }
  // Las reliquias conseguidas cuentan como ventajas de nivel 1.
  for (const relic of content.relics) {
    if (relic.effect.kind !== kind || !relicOwned(state, relic)) continue;
    out.push({ perk: { id: relic.id, name: relic.name, flavor: relic.flavor, maxLevel: 1, baseCost: 0, costGrowth: 1, requires: [], effect: relic.effect }, level: 1 });
  }
  return out;
}

export function relicOwned(state: GameState, relic: RelicDef): boolean {
  return state.achievements[relic.achievement] !== undefined;
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
  return perkProduct(state, content, 'costMult') * gardenProduct(state, content, 'costMult');
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

/** Producto de las mejoras globales compradas (×1,5 cada una). */
export function globalMultiplier(state: GameState, content: Content): number {
  let m = 1;
  for (const u of content.globalUpgrades) if (state.globalUpgrades[u.id]) m *= u.mult;
  return m;
}

/** Multiplicador de la producción: ventajas (Abono y reliquias) × bono de plumas × mejoras globales. */
export function prodMultiplier(state: GameState, content: Content): number {
  return perkProduct(state, content, 'prodMult') * plumaBonus(state, content) * globalMultiplier(state, content) * caveProduct(state, content, 'prodMult') * dragonBonus(state, content).prod * gardenProduct(state, content, 'prodMult');
}

/** Multiplicador máximo de la inercia (×5 de base, más lo que den las reliquias). */
export function momentumMaxMult(state: GameState, content: Content): number {
  const bought = content.globalUpgrades.reduce((sum, u) => sum + (state.globalUpgrades[u.id] ? (u.momentumAdd ?? 0) : 0), 0);
  return content.game.momentumMax + bought + perkSum(state, content, 'momentumMax') + gardenSum(state, content, 'momentumMax') + caveSum(state, content, 'momentumMax');
}

/** Multiplicador de la inercia con la barra en `momentum` (0..1): 1 + (máx − 1) · barra. */
export function momentumMult(state: GameState, content: Content, momentum: number = state.momentum): number {
  return 1 + (momentumMaxMult(state, content) - 1) * momentum;
}

/** Producción por segundo de UNA unidad de la herramienta (con sus mejoras compradas y los bonos). */
export function unitProduction(state: GameState, content: Content, tool: ToolDef): Decimal {
  return D(tool.baseProd).mul(upgradeMult(content, upgradesBought(state, tool.id))).mul(prodMultiplier(state, content)).mul(bestToolMult(state, content, tool));
}

/** Índice de la mejor herramienta que se tiene (la de mayor índice con alguna unidad), o -1. */
export function bestToolIndex(state: GameState, content: Content): number {
  let best = -1;
  content.tools.forEach((t, i) => {
    if (toolOwned(state, t.id) > 0) best = i;
  });
  return best;
}

/** Bono del compañero que mejora la mejor herramienta (el perro). */
function bestToolMult(state: GameState, content: Content, tool: ToolDef): number {
  if (content.tools[bestToolIndex(state, content)]?.id !== tool.id) return 1;
  let mult = 1;
  for (const c of content.companions) {
    const ability = companionAbility(state, c);
    if (ability.kind === 'bestToolMult' && state.activeCompanions.includes(c.id)) mult *= ability.mult;
  }
  return mult;
}

/** Ajustes del cerdito viajero por compañeros y cueva: velocidad de llegada y segundos extra de estancia. */
export function visitorModifiers(state: GameState, content: Content): { speed: number; stayBonus: number } {
  let speed = 1;
  for (const c of content.companions) {
    const ability = companionAbility(state, c);
    if (ability.kind === 'visitorSpeed' && state.activeCompanions.includes(c.id)) speed *= ability.speed;
  }
  return { speed, stayBonus: caveSum(state, content, 'visitorStay') };
}

/** Nivel de mejora de un compañero (0 = sin mejorar). */
export function companionLevel(state: GameState, id: string): number {
  return state.companionLevels[id] ?? 0;
}

/** Habilidad vigente de un compañero según su nivel. */
export function companionAbility(state: GameState, companion: CompanionDef): CompanionAbility {
  const level = companionLevel(state, companion.id);
  return level > 0 ? (companion.upgrades[level - 1]?.ability ?? companion.ability) : companion.ability;
}

/** Producción por segundo de todas las unidades de la herramienta. */
export function toolProduction(state: GameState, content: Content, tool: ToolDef): Decimal {
  return unitProduction(state, content, tool).mul(toolOwned(state, tool.id));
}

/** Monedas por segundo de base: herramientas × bonos, SIN la inercia ni el impulso del visitante. */
export function baseIncomePerSecond(state: GameState, content: Content): Decimal {
  let total = D(0);
  for (const tool of content.tools) total = total.add(toolProduction(state, content, tool));
  return total;
}

/** Monedas por segundo ahora mismo (con la inercia actual; sin el impulso del visitante). */
export function incomePerSecond(state: GameState, content: Content): Decimal {
  return baseIncomePerSecond(state, content).mul(momentumMult(state, content));
}

/** Ingresos por segundo "de ahora" para las recompensas del cerdito viajero: con la inercia y con el impulso activo. */
export function currentIncomePerSecond(state: GameState, content: Content): Decimal {
  return incomePerSecond(state, content).mul(state.buff?.mult ?? 1);
}

/** Lo que da un toque: `tapSeconds` de producción (mínimo 1 moneda) × Manos de acero × impulso del visitante. */
export function tapGain(state: GameState, content: Content): Decimal {
  const base = Decimal.max(1, incomePerSecond(state, content).mul(content.game.tapSeconds));
  return base.mul(1 + perkSum(state, content, 'tapMult') + gardenSum(state, content, 'tapMult')).mul(state.buff?.mult ?? 1);
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

/** Monedas ganadas en total (en la vida) con las que te corresponderá una esmeralda más de las que te corresponden ahora. */
export function lifetimeForNextPluma(state: GameState, content: Content): Decimal {
  const g = content.game;
  const mult = 1 + perkSum(state, content, 'plumaMult');
  const target = plumasEntitled(state, content) + 1;
  return D(g.plumaE0).mul(Decimal.pow(target / mult, 1 / g.plumaExponent));
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
  return (content.game.offlineHours + perkSum(state, content, 'offlineHours') + caveSum(state, content, 'offlineHours')) * 3600;
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

// ---------------------------------------------------------------------------
// Mejoras globales y cosméticos
// ---------------------------------------------------------------------------

/** ¿Se ha ganado ya lo bastante en total para ver la mejora global? */
export function globalUpgradeUnlocked(state: GameState, def: GlobalUpgradeDef): boolean {
  return state.lifetime.gte(def.unlockAt);
}

/** Coste de la mejora global (con Regateo en la feria). */
export function globalUpgradeCost(state: GameState, content: Content, def: GlobalUpgradeDef): Decimal {
  return D(def.cost).mul(costMultiplier(state, content)).ceil();
}

/** ¿Tienes la piel? (gratis, comprada, o regalada por su logro). */
export function skinOwned(state: GameState, skin: SkinDef): boolean {
  return skin.cost === 0 || state.skins[skin.id] === true || (skin.achievement !== null && state.achievements[skin.achievement] !== undefined);
}

export function accessoryOwned(state: GameState, accessory: AccessoryDef): boolean {
  return state.wardrobe.owned[accessory.id] === true || (accessory.achievement !== null && state.achievements[accessory.achievement] !== undefined);
}

export function companionOwned(state: GameState, companion: CompanionDef): boolean {
  return companion.cost === 0 || state.companions[companion.id] === true || (companion.achievement !== null && state.achievements[companion.achievement] !== undefined);
}
