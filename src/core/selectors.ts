// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/06-mina.md.

import type { AchievementReq, CompanionAbility, Content, GardenEffect, PerkDef, PerkEffect } from '../content/types.ts';
import { achievementProgress } from './achievements.ts';
import { rabbitWaitSeconds, VISITOR_INJECTION_SECONDS, type BuyAmount } from './actions.ts';
import { basketCap, basketSeconds, basketValue } from './basket.ts';
import { flowerActive, flowerAvailable, gardenUnlocked, growMs } from './garden.ts';
import { blowGain, blowReady, caveProduct, embersPerSecond, furnaceCost } from './cave.ts';
import {
  ascendUnlocked,
  baseIncomePerSecond,
  companionAbility,
  companionLevel,
  companionOwned,
  globalUpgradeCost,
  globalUpgradeUnlocked,
  incomePerSecond,
  momentumMaxMult,
  momentumMult,
  relicOwned,
  skinOwned,
  nextUpgradeCost,
  nextUpgradeThreshold,
  nextUpgradeUnlocked,
  upgradeMult,
  upgradesBought,
  perkAvailable,
  perkCost,
  perkLevelOf,
  perkSum,
  plumaBonus,
  plumasPending,
  tapGain,
  toolBulkCost,
  toolMaxAffordable,
  toolOwned,
  unitProduction,
  toolProduction,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import type { GameState } from './state.ts';

// ---------------------------------------------------------------------------
// Cabecera y herramientas
// ---------------------------------------------------------------------------

export interface HeaderView {
  coins: Decimal;
  /** Monedas por segundo ahora mismo (con la inercia). */
  income: Decimal;
  /** Lo que da un pico ahora mismo. */
  tapGain: Decimal;
  /** Inercia: barra 0..1, multiplicador actual y máximo. */
  momentum: { fraction: number; mult: number; max: number };
  bellotas: number;
}

export function headerView(state: GameState, content: Content): HeaderView {
  return {
    coins: state.coins,
    income: incomePerSecond(state, content),
    tapGain: tapGain(state, content),
    momentum: { fraction: state.momentum, mult: momentumMult(state, content), max: momentumMaxMult(state, content) },
    bellotas: state.acorns,
  };
}

export interface ToolView {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  index: number;
  owned: number;
  /** Producción de una unidad / de todas (por segundo). */
  unitProd: Decimal;
  totalProd: Decimal;
  /** Mejoras compradas y el multiplicador que dan (×2 cada una). */
  upgradesBought: number;
  upgradeMult: number;
  /** Siguiente mejora: unidades que la desbloquean, si ya está desbloqueada, su coste y si se puede pagar (null si ya no quedan). */
  nextUpgrade: { threshold: number; unlocked: boolean; cost: Decimal; canAfford: boolean } | null;
  /** Coste de comprar `amountToBuy` unidades ahora (según los ajustes). */
  nextCost: Decimal;
  amountToBuy: number;
  canAfford: boolean;
  /** Monedas que faltan para pagar `amountToBuy` (0 si ya se puede) y segundos hasta tenerlas al ritmo actual (null si no se produce nada). */
  missing: Decimal;
  etaSeconds: number | null;
  /** 'visible' = descubierta; 'teaser' = la siguiente, difuminada; 'hidden' = aún no se muestra. */
  reveal: 'visible' | 'teaser' | 'hidden';
  /** 0..1: lo cerca que está de poder pagar la primera unidad (para difuminar menos). */
  closeness: number;
}

/** Lo que falta para pagar `cost` y el tiempo que tardará al ritmo de producción actual. */
function missingOf(state: GameState, content: Content, cost: Decimal): { missing: Decimal; etaSeconds: number | null } {
  const missing = cost.sub(state.coins);
  if (missing.lte(0)) return { missing: D(0), etaSeconds: 0 };
  const income = incomePerSecond(state, content);
  return { missing, etaSeconds: income.gt(0) ? missing.div(income).toNumber() : null };
}

function upgradeView(state: GameState, content: Content, id: string, tool: Content['tools'][number]): ToolView['nextUpgrade'] {
  const threshold = nextUpgradeThreshold(state, content, id);
  const cost = nextUpgradeCost(state, content, tool);
  if (threshold === null || cost === null) return null;
  const unlocked = nextUpgradeUnlocked(state, content, id);
  return { threshold, unlocked, cost, canAfford: unlocked && state.coins.gte(cost) };
}

export function toolViews(state: GameState, content: Content): ToolView[] {
  const amount: BuyAmount = state.settings.buyAmount;
  return content.tools.map((tool, index) => {
    const owned = toolOwned(state, tool.id);
    const amountToBuy = amount === 'max' ? toolMaxAffordable(state, content, tool, owned, state.coins) : amount;
    const nextCost = toolBulkCost(state, content, tool, owned, Math.max(1, amountToBuy));
    const first = toolBulkCost(state, content, tool, owned, 1);
    return {
      id: tool.id,
      name: tool.name,
      emoji: tool.emoji,
      flavor: tool.flavor,
      index,
      owned,
      unitProd: unitProduction(state, content, tool),
      totalProd: toolProduction(state, content, tool),
      upgradesBought: upgradesBought(state, tool.id),
      upgradeMult: upgradeMult(content, upgradesBought(state, tool.id)),
      nextUpgrade: upgradeView(state, content, tool.id, tool),
      nextCost,
      amountToBuy,
      canAfford: amountToBuy > 0 && state.coins.gte(nextCost),
      missing: missingOf(state, content, nextCost).missing,
      etaSeconds: missingOf(state, content, nextCost).etaSeconds,
      reveal: index < state.revealed ? 'visible' : index === state.revealed ? 'teaser' : 'hidden',
      closeness: Math.min(1, Math.max(0, state.coins.div(first).toNumber())),
    };
  });
}

// ---------------------------------------------------------------------------
// Ascensión y ventajas
// ---------------------------------------------------------------------------

export interface AscendView {
  plumas: Decimal;
  plumasTotal: Decimal;
  pendingGain: number;
  currentBonusMultiplier: number;
  nextBonusMultiplier: number;
  /** ¿Ya se llegó a la herramienta que permite ascender? */
  unlocked: boolean;
  /** Herramienta que hay que tener (nombre y emoji) y cuántas se llevan de ella como máximo. */
  requiredTool: { name: string; emoji: string; index: number };
  canAscend: boolean;
}

export function ascendView(state: GameState, content: Content): AscendView {
  const tool = content.tools[content.game.ascendTool]!;
  const pendingGain = plumasPending(state, content);
  const current = plumaBonus(state, content);
  const rate = content.game.perPluma + perkSum(state, content, 'perPlumaBonus');
  const unlocked = ascendUnlocked(state, content);
  return {
    plumas: state.plumas,
    plumasTotal: state.plumasTotal,
    pendingGain,
    currentBonusMultiplier: current,
    nextBonusMultiplier: 1 + rate * (state.plumasTotal.toNumber() + pendingGain),
    unlocked,
    requiredTool: { name: tool.name, emoji: tool.emoji, index: content.game.ascendTool },
    canAscend: unlocked && pendingGain > 0,
  };
}

export interface PerkView {
  id: string;
  name: string;
  flavor: string;
  level: number;
  maxLevel: number | null;
  maxed: boolean;
  cost: Decimal;
  missingRequirements: string[];
  purchasable: boolean;
  currentEffectText: string;
  nextEffectText: string | null;
}

function perkEffectValueText(effect: PerkEffect, level: number): string {
  switch (effect.kind) {
    case 'prodMult':
      return `×${(effect.perLevel ** level).toFixed(2)} producción`;
    case 'costMult':
      return `×${(effect.perLevel ** level).toFixed(2)} coste de las herramientas`;
    case 'startCurrency':
      return level === 0 ? 'sin monedas iniciales' : `${100 * (effect.perLevel ** level - 1)} monedas iniciales`;
    case 'tapMult':
      return `cada pico ×${(1 + effect.perLevel * level).toFixed(1)}`;
    case 'plumaMult':
      return `+${Math.round(effect.perLevel * level * 100)} % plumas al ascender`;
    case 'perPlumaBonus':
      return `+${Math.round(effect.perLevel * level * 100)} % extra en el bono de plumas`;
    case 'offlineHours':
      return `+${effect.perLevel * level} h de producción mientras no estás`;
    case 'momentumMax':
      return `+${effect.perLevel * level} al tope de la inercia`;
  }
}

export function perkViews(state: GameState, content: Content): PerkView[] {
  return content.perks.map((perk: PerkDef) => {
    const level = perkLevelOf(state, perk.id);
    const maxed = perk.maxLevel !== null && level >= perk.maxLevel;
    const cost = perkCost(perk, level);
    const missingRequirements = perk.requires.filter((id) => perkLevelOf(state, id) <= 0).map((id) => content.perks.find((p) => p.id === id)?.name ?? id);
    return {
      id: perk.id,
      name: perk.name,
      flavor: perk.flavor,
      level,
      maxLevel: perk.maxLevel,
      maxed,
      cost,
      missingRequirements,
      purchasable: !maxed && perkAvailable(state, perk) && state.plumas.gte(cost),
      currentEffectText: perkEffectValueText(perk.effect, level),
      nextEffectText: maxed ? null : perkEffectValueText(perk.effect, level + 1),
    };
  });
}

// ---------------------------------------------------------------------------
// Logros, cesta, visitante y diario
// ---------------------------------------------------------------------------

export interface RequirementView {
  current: Decimal;
  target: Decimal;
  done: boolean;
  /** Frase del requisito; `format` da formato a los números (los formatea la UI, no core). */
  describe(format: (n: Decimal) => string): string;
}

export interface AchievementView {
  id: string;
  name: string;
  flavor: string;
  owned: boolean;
  requirement: RequirementView;
  /** Si es de "tener N de una herramienta": la herramienta (la UI las agrupa por herramienta). */
  tool: { id: string; name: string; emoji: string; count: number } | null;
}

function describeRequirement(content: Content, req: AchievementReq): (format: (n: Decimal) => string) => string {
  switch (req.kind) {
    case 'toolCount':
      return (f) => `Ten ${f(D(req.count))} ${content.tools.find((t) => t.id === req.tool)?.name ?? req.tool}`;
    case 'taps':
      return (f) => `Pica ${f(D(req.count))} veces`;
    case 'ascensions':
      return (f) => `Asciende ${f(D(req.count))} ${req.count === 1 ? 'vez' : 'veces'}`;
    case 'plumasTotal':
      return (f) => `Consigue ${f(D(req.count))} plumas en total`;
    case 'lifetime':
      return (f) => `Gana ${f(D(req.amount))} monedas en total`;
  }
}

export function achievementViews(state: GameState, content: Content): AchievementView[] {
  return content.achievements.map((a) => {
    const req = a.requires;
    const tool = req.kind === 'toolCount' ? content.tools.find((t) => t.id === req.tool) : undefined;
    return {
      id: a.id,
      name: a.name,
      flavor: a.flavor,
      owned: state.achievements[a.id] !== undefined,
      requirement: { ...achievementProgress(state, req), describe: describeRequirement(content, req) },
      tool: tool && req.kind === 'toolCount' ? { id: tool.id, name: tool.name, emoji: tool.emoji, count: req.count } : null,
    };
  });
}

export interface BasketView {
  value: Decimal;
  seconds: number;
  capSeconds: number;
  /** 0..1 */
  fill: number;
}

export function basketView(state: GameState, content: Content): BasketView {
  const cap = basketCap(state, content);
  const seconds = basketSeconds(state, cap);
  return { value: basketValue(state, content), seconds, capSeconds: cap, fill: seconds / cap };
}

/** Lo que daría una inyección de visitante ahora mismo (monedas). */
export function visitorInjectionValue(state: GameState, content: Content): Decimal {
  return baseIncomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS);
}

/** Entradas del diario, de la más reciente a la más antigua. */
export function journalEntries(state: GameState): { at: number; text: string }[] {
  return [...state.journal].reverse();
}

// ---------------------------------------------------------------------------
// Mejoras globales
// ---------------------------------------------------------------------------

export interface GlobalUpgradeView {
  id: string;
  name: string;
  flavor: string;
  mult: number;
  momentumAdd: number;
  cost: Decimal;
  canAfford: boolean;
}

/** Mejoras globales disponibles (desbloqueadas y sin comprar) y, si hay, cuánto hay que ganar para ver la siguiente. */
export function globalUpgradeViews(state: GameState, content: Content): { available: GlobalUpgradeView[]; nextUnlockAt: number | null } {
  const available: GlobalUpgradeView[] = [];
  let nextUnlockAt: number | null = null;
  for (const def of content.globalUpgrades) {
    if (state.globalUpgrades[def.id]) continue;
    if (!globalUpgradeUnlocked(state, def)) {
      nextUnlockAt = nextUnlockAt === null ? def.unlockAt : Math.min(nextUnlockAt, def.unlockAt);
      continue;
    }
    const cost = globalUpgradeCost(state, content, def);
    available.push({ id: def.id, name: def.name, flavor: def.flavor, mult: def.mult, momentumAdd: def.momentumAdd ?? 0, cost, canAfford: state.coins.gte(cost) });
  }
  return { available, nextUnlockAt };
}

// ---------------------------------------------------------------------------
// Cosméticos: pieles, compañeros y reliquias
// ---------------------------------------------------------------------------

export interface CosmeticView {
  id: string;
  name: string;
  flavor: string;
  /** Color de piel (solo pieles) o emoji (solo compañeros). */
  color: string | null;
  emoji: string | null;
  owned: boolean;
  equipped: boolean;
  /** Bellotas que cuesta si se compra; null si solo se consigue con un logro. */
  cost: number | null;
  canBuy: boolean;
  /** Nombre del logro que lo regala, si lo hay. */
  achievementName: string | null;
  /** Solo compañeros: nivel, máximo, coste de la siguiente mejora y qué hace ahora. */
  level: number;
  maxLevel: number;
  upgradeCost: number | null;
  canUpgrade: boolean;
  abilityText: string;
}

export interface RelicView {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  owned: boolean;
  effectText: string;
  achievementName: string;
}

function achievementName(content: Content, id: string | null): string | null {
  return id === null ? null : (content.achievements.find((a) => a.id === id)?.name ?? id);
}

export function cosmeticViews(state: GameState, content: Content): { acorns: number; skins: CosmeticView[]; companions: CosmeticView[]; relics: RelicView[] } {
  return {
    acorns: state.acorns,
    skins: content.skins.map((s) => {
      const owned = skinOwned(state, s);
      return {
        id: s.id,
        name: s.name,
        flavor: s.flavor,
        color: s.color,
        emoji: null,
        owned,
        equipped: state.activeSkin === s.id,
        cost: s.cost,
        canBuy: !owned && s.cost !== null && state.acorns >= s.cost,
        achievementName: achievementName(content, s.achievement),
        level: 0,
        maxLevel: 0,
        upgradeCost: null,
        canUpgrade: false,
        abilityText: '',
      };
    }),
    companions: content.companions.map((c) => {
      const owned = companionOwned(state, c);
      return {
        id: c.id,
        name: c.name,
        flavor: c.flavor,
        color: null,
        emoji: c.emoji,
        owned,
        equipped: state.activeCompanions.includes(c.id),
        cost: c.cost,
        canBuy: !owned && c.cost !== null && state.acorns >= c.cost,
        achievementName: achievementName(content, c.achievement),
        level: companionLevel(state, c.id),
        maxLevel: c.upgrades.length,
        upgradeCost: c.upgrades[companionLevel(state, c.id)]?.cost ?? null,
        canUpgrade: owned && (c.upgrades[companionLevel(state, c.id)]?.cost ?? Infinity) <= state.acorns,
        abilityText: abilityText(companionAbility(state, c)),
      };
    }),
    relics: content.relics.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      flavor: r.flavor,
      owned: relicOwned(state, r),
      effectText: perkEffectValueText(r.effect, 1),
      achievementName: achievementName(content, r.achievement) ?? r.achievement,
    })),
  };
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

export interface StatsView {
  lifetime: Decimal;
  taps: number;
  ascensions: number;
  plumasTotal: Decimal;
  playSeconds: number;
  visitors: number;
  toolsOwned: number;
  upgradesBought: number;
  bestIncome: Decimal;
  achievements: { done: number; total: number };
  relics: { done: number; total: number };
}

export function statsView(state: GameState, content: Content): StatsView {
  return {
    lifetime: state.lifetime,
    taps: state.taps,
    ascensions: state.ascensions,
    plumasTotal: state.plumasTotal,
    playSeconds: state.time,
    visitors: state.stats.visitors,
    toolsOwned: Object.values(state.tools).reduce((a, b) => a + b, 0),
    upgradesBought: Object.values(state.upgrades).reduce((a, b) => a + b, 0) + Object.keys(state.globalUpgrades).length,
    bestIncome: state.stats.bestIncome,
    achievements: { done: Object.keys(state.achievements).length, total: content.achievements.length },
    relics: { done: content.relics.filter((r) => relicOwned(state, r)).length, total: content.relics.length },
  };
}

/** Descripción corta de lo que hace una habilidad. */
export function abilityText(a: CompanionAbility): string {
  switch (a.kind) {
    case 'tapAcorn':
      return `1 bellota cada ${a.every} picos`;
    case 'coinGift':
      return `${a.incomeSeconds} s de ingresos cada ${a.everySeconds} s`;
    case 'fireBreath':
      return `inercia al máximo cada ${a.everySeconds} s`;
    case 'bestToolMult':
      return `tu mejor herramienta ×${a.mult}`;
    case 'visitorSpeed':
      return `el cerdito viajero llega ×${a.speed} más rápido`;
    case 'freeTool':
      return `herramienta gratis cada ${a.cooldownHours} h`;
  }
}

export type CompanionAbilityKind = 'tapAcorn' | 'coinGift' | 'fireBreath' | 'bestToolMult' | 'visitorSpeed' | 'freeTool';

export interface CompanionStatusView {
  id: string;
  name: string;
  emoji: string;
  kind: CompanionAbilityKind;
  describe: string;
  progress: number;
  target: number;
  /** Segundos que faltan (solo en las habilidades por tiempo). */
  secondsLeft: number | null;
}

/** Estado de la habilidad de cada compañero que se lleva puesto. */
export function companionStatusViews(state: GameState, content: Content, now: number): CompanionStatusView[] {
  return state.activeCompanions.flatMap((id): CompanionStatusView[] => {
    const c = content.companions.find((x) => x.id === id);
    if (!c) return [];
    const ability = companionAbility(state, c);
    const base = { id, name: c.name, emoji: c.emoji, kind: ability.kind, describe: abilityText(ability) };
    const progress = state.companionProgress[id] ?? 0;
    switch (ability.kind) {
      case 'tapAcorn':
        return [{ ...base, progress: Math.min(progress, ability.every), target: ability.every, secondsLeft: null }];
      case 'coinGift':
        return [{ ...base, progress: Math.min(progress, ability.everySeconds), target: ability.everySeconds, secondsLeft: Math.max(0, ability.everySeconds - progress) }];
      case 'fireBreath': {
        const every = Math.min(ability.everySeconds, ...content.cave.nodes.filter((n) => state.cave.nodes[n.id] && n.effect.kind === 'breathSeconds').map((n) => n.effect.value));
        return [{ ...base, progress: Math.min(progress, every), target: every, secondsLeft: Math.max(0, every - progress) }];
      }
      case 'freeTool': {
        const total = ability.cooldownHours * 3600;
        const wait = rabbitWaitSeconds(state, content, now);
        return [{ ...base, progress: total - wait, target: total, secondsLeft: wait }];
      }
      default:
        return [{ ...base, progress: 1, target: 1, secondsLeft: null }];
    }
  });
}

export interface CaveView {
  embers: Decimal;
  perSecond: Decimal;
  blowGain: Decimal;
  blowReady: boolean;
  /** Bono total de producción que la cueva da al juego principal. */
  prodBonus: number;
  furnaces: { id: string; name: string; emoji: string; flavor: string; owned: number; cost: Decimal; each: Decimal; canBuy: boolean }[];
  branches: { id: string; name: string; emoji: string; nodes: { id: string; name: string; flavor: string; cost: number; bought: boolean; lockedBy: string | null; canBuy: boolean }[] }[];
}

export function caveView(state: GameState, content: Content): CaveView {
  const mult = caveProduct(state, content, 'embers');
  return {
    embers: state.cave.embers,
    perSecond: embersPerSecond(state, content),
    blowGain: blowGain(state, content),
    blowReady: blowReady(state, content),
    prodBonus: caveProduct(state, content, 'prodMult'),
    furnaces: content.cave.furnaces.map((f) => {
      const owned = state.cave.furnaces[f.id] ?? 0;
      const cost = furnaceCost(content.cave, f, owned);
      return { id: f.id, name: f.name, emoji: f.emoji, flavor: f.flavor, owned, cost, each: D(f.baseProd).mul(mult), canBuy: state.cave.embers.gte(cost) };
    }),
    branches: content.cave.branches.map((b) => ({
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      nodes: content.cave.nodes
        .filter((n) => n.branch === b.id)
        .map((n) => {
          const bought = state.cave.nodes[n.id] === true;
          const lockedBy = n.requires !== null && !state.cave.nodes[n.requires] ? (content.cave.nodes.find((x) => x.id === n.requires)?.name ?? n.requires) : null;
          return { id: n.id, name: n.name, flavor: n.flavor, cost: n.cost, bought, lockedBy, canBuy: !bought && lockedBy === null && state.cave.embers.gte(n.cost) };
        }),
    })),
  };
}

/** ¿Está abierta la Cueva (se tiene al dragón)? */
export function caveUnlocked(state: GameState, content: Content): boolean {
  return content.companions.some((c) => c.ability.kind === 'fireBreath' && companionOwned(state, c));
}


export interface GardenView {
  unlocked: boolean;
  unlockAt: Decimal;
  shinyPercent: number;
  /** Bonos temporales activos ahora. */
  active: { id: string; emoji: string; name: string; secondsLeft: number }[];
  plots: { index: number; flowerId: string | null; flowerName: string; emoji: string; readyInSeconds: number; progress: number; ready: boolean }[];
  flowers: { id: string; name: string; emoji: string; flavor: string; growHours: number; available: boolean; found: boolean; shiny: boolean; count: number; effectText: string; requires: string | null }[];
}

function gardenEffectText(effect: GardenEffect, shiny: boolean): string {
  const seconds = effect.seconds * (shiny ? 2 : 1);
  switch (effect.kind) {
    case 'prodMult':
      return `producción ×${effect.value} durante ${formatDurationShort(seconds)}`;
    case 'costMult':
      return `herramientas a ×${effect.value} de precio durante ${formatDurationShort(seconds)}`;
    case 'tapMult':
      return `+${Math.round(effect.value * 100)} % a los picos durante ${formatDurationShort(seconds)}`;
    case 'momentumMax':
      return `+${effect.value} al tope de la inercia durante ${formatDurationShort(seconds)}`;
    case 'coins':
      return `${Math.round(seconds / 60)} min de ingresos de golpe`;
  }
}

function formatDurationShort(seconds: number): string {
  return seconds >= 120 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
}

export function gardenView(state: GameState, content: Content, now: number): GardenView {
  const flowers = content.garden.flowers;
  return {
    unlocked: gardenUnlocked(state, content),
    unlockAt: D(content.garden.unlockLifetime),
    shinyPercent: Math.round(content.garden.shinyChance * 100),
    active: flowers.filter((f) => flowerActive(state, f.id)).map((f) => ({ id: f.id, emoji: f.emoji, name: f.name, secondsLeft: (state.garden.buffs[f.id] ?? 0) - state.time })),
    plots: state.garden.plots.map((p, index) => {
      const flower = p ? flowers.find((f) => f.id === p.flower) : undefined;
      if (!p || !flower) return { index, flowerId: null, flowerName: '', emoji: '', readyInSeconds: 0, progress: 0, ready: false };
      const total = growMs(flower);
      const elapsed = Math.max(0, now - p.plantedAt);
      return { index, flowerId: flower.id, flowerName: flower.name, emoji: flower.emoji, readyInSeconds: Math.max(0, (total - elapsed) / 1000), progress: Math.min(1, elapsed / total), ready: elapsed >= total };
    }),
    flowers: flowers.map((f, i) => {
      const got = state.garden.found[f.id];
      return {
        id: f.id,
        name: f.name,
        emoji: f.emoji,
        flavor: f.flavor,
        growHours: f.growHours,
        available: flowerAvailable(state, content, i),
        found: got !== undefined,
        shiny: got?.shiny === true,
        count: got?.count ?? 0,
        effectText: `${gardenEffectText(f.effect, false)} (brillante: ${gardenEffectText(f.effect, true)})`,
        requires: i === 0 ? null : (flowers[i - 1]?.name ?? null),
      };
    }),
  };
}
