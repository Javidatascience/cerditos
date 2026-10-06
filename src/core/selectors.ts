// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/06-mina.md.

import type { AchievementReq, Content, PerkDef, PerkEffect } from '../content/types.ts';
import { achievementProgress } from './achievements.ts';
import { VISITOR_INJECTION_SECONDS, type BuyAmount } from './actions.ts';
import { BASKET_CAP_SECONDS, basketSeconds, basketValue } from './basket.ts';
import {
  ascendUnlocked,
  incomePerSecond,
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
  income: Decimal;
  /** Lo que da un pico ahora mismo. */
  tapGain: Decimal;
}

export function headerView(state: GameState, content: Content): HeaderView {
  return { coins: state.coins, income: incomePerSecond(state, content), tapGain: tapGain(state, content) };
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
  /** 'visible' = descubierta; 'teaser' = la siguiente, difuminada; 'hidden' = aún no se muestra. */
  reveal: 'visible' | 'teaser' | 'hidden';
  /** 0..1: lo cerca que está de poder pagar la primera unidad (para difuminar menos). */
  closeness: number;
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
  const seconds = basketSeconds(state);
  return { value: basketValue(state, content), seconds, capSeconds: BASKET_CAP_SECONDS, fill: seconds / BASKET_CAP_SECONDS };
}

/** Lo que daría una inyección de visitante ahora mismo (monedas). */
export function visitorInjectionValue(state: GameState, content: Content): Decimal {
  return incomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS);
}

/** Entradas del diario, de la más reciente a la más antigua. */
export function journalEntries(state: GameState): { at: number; text: string }[] {
  return [...state.journal].reverse();
}
