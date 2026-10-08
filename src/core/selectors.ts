// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/06-mina.md.

import type { AchievementReq, CompanionAbility, Content, GardenEffect, PerkDef, PerkEffect } from '../content/types.ts';
import { achievementProgress } from './achievements.ts';
import { maxActiveCompanions, rabbitWaitSeconds, VISITOR_INJECTION_SECONDS, type BuyAmount } from './actions.ts';
import { basketCap, basketSeconds, basketValue } from './basket.ts';
import { durationFactor, flowerActive, flowerAvailable, gardenMaxRows, gardenUnlocked, growMs, shinyChance } from './garden.ts';
import { gameClockMs } from './journal.ts';
import { basketAcornsReady, creatureOf, hatchLeftMs, nestSlotCount, nestUnlocked } from './nest.ts';
import { blowGain, blowReady, caveCostFactor, caveProduct, dragonBonus, embersFactor, embersPerSecond, furnaceCost } from './cave.ts';
import {
  accessoryOwned,
  ascendUnlocked,
  baseIncomePerSecond,
  companionAbility,
  companionLevel,
  companionOwned,
  currentIncomePerSecond,
  globalUpgradeCost,
  globalUpgradeUnlocked,
  incomePerSecond,
  lifetimeForNextPluma,
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
  /** Monedas ganadas en total que harán falta para la siguiente esmeralda, y las que faltan aún (0 si ya se llegó). */
  nextPlumaAt: Decimal;
  nextPlumaMissing: Decimal;
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
    nextPlumaAt: lifetimeForNextPluma(state, content),
    nextPlumaMissing: Decimal.max(0, lifetimeForNextPluma(state, content).sub(state.lifetime)),
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
  /** Para el árbol: icono, posición, si se cumplen los requisitos de otras ventajas, y coste y efecto de cada nivel (índice = nivel − 1). */
  icon: string;
  layout: { col: number; row: number; dir: 'right' | 'down' } | null;
  requirementsMet: boolean;
  requires: { id: string; level: number }[];
  costs: Decimal[];
  effectTexts: string[];
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
      return `+${Math.round(effect.perLevel * level * 100)} % esmeraldas al ascender`;
    case 'perPlumaBonus':
      return `+${Math.round(effect.perLevel * level * 100)} % extra en el bono de esmeraldas`;
    case 'offlineHours':
      return `+${effect.perLevel * level} h de producción mientras no estás`;
    case 'momentumMax':
      return `+${effect.perLevel * level} al tope de la inercia`;
    case 'companionSlots':
      return `+${effect.perLevel * level} compañero a la vez`;
    case 'gardenRows':
      return `+${effect.perLevel * level} fila${effect.perLevel * level === 1 ? '' : 's'} de casillas en el jardín`;
    case 'gardenGrowth':
      return `las flores tardan ×${(effect.perLevel ** level).toFixed(2)} en crecer`;
    case 'gardenMutation':
      return `+${Math.round(effect.perLevel * level * 100)} % de probabilidad de cruce`;
    case 'gardenDuration':
      return `+${Math.round(effect.perLevel * level * 100)} % de duración de los bonos de las flores`;
    case 'gardenShiny':
      return `+${Math.round(effect.perLevel * level * 100)} % de probabilidad de flor brillante`;
    case 'caveEmbers':
      return `+${Math.round(effect.perLevel * level * 100)} % de brasas por segundo`;
    case 'caveBlow':
      return `+${Math.round(effect.perLevel * level * 100)} % de brasas por soplido`;
    case 'caveCost':
      return `hornos ×${(effect.perLevel ** level).toFixed(2)} de coste`;
    case 'nestSlots':
      return `+${effect.perLevel * level} nido${effect.perLevel * level === 1 ? '' : 's'}`;
    case 'basketAcorns':
      return `el topo deja 1 bellota en la cesta cada ${effect.perLevel} h`;
  }
}

export function perkViews(state: GameState, content: Content): PerkView[] {
  return content.perks.map((perk: PerkDef) => {
    const level = perkLevelOf(state, perk.id);
    const maxed = perk.maxLevel !== null && level >= perk.maxLevel;
    const cost = perkCost(perk, level);
    const needed = perk.requiresLevel ?? 1;
    const missingRequirements = perk.requires
      .filter((id) => perkLevelOf(state, id) < needed)
      .map((id) => `${content.perks.find((p) => p.id === id)?.name ?? id} (nivel ${needed})`);
    if (perk.requiresPlumasTotal !== undefined && state.plumasTotal.lt(perk.requiresPlumasTotal)) missingRequirements.push(`${perk.requiresPlumasTotal} esmeraldas en total`);
    const levels = perk.maxLevel ?? 1;
    return {
      icon: perk.icon ?? 'esmeralda',
      layout: perk.layout ?? null,
      requirementsMet: missingRequirements.length === 0,
      requires: perk.requires.map((id) => ({ id, level: needed })),
      costs: Array.from({ length: levels }, (_, i) => perkCost(perk, i)),
      effectTexts: Array.from({ length: levels }, (_, i) => perkEffectValueText(perk.effect, i + 1)),
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
  /** Tipo de requisito (la UI elige el icono). */
  kind: AchievementReq['kind'];
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
      return (f) => `Consigue ${f(D(req.count))} ${req.count === 1 ? 'esmeralda' : 'esmeraldas'} en total`;
    case 'lifetime':
      return (f) => `Gana ${f(D(req.amount))} monedas en total`;
    case 'companionsOwned':
      return (f) => `Ten ${f(D(req.count))} ${req.count === 1 ? 'compañero' : 'compañeros'}`;
    case 'companionLevels':
      return (f) => `Mejora a tus compañeros ${f(D(req.count))} ${req.count === 1 ? 'nivel' : 'niveles'} en total`;
    case 'flowersFound':
      return (f) => `Descubre ${f(D(req.count))} ${req.count === 1 ? 'flor' : 'flores'} distintas`;
    case 'shinyFound':
      return (f) => `Consigue ${f(D(req.count))} ${req.count === 1 ? 'flor brillante' : 'flores brillantes'} distintas`;
    case 'harvests':
      return (f) => `Recoge ${f(D(req.count))} flores`;
    case 'creatureAdult':
      return () => `Cría un ${content.nest.creatures.find((c) => c.id === req.creature)?.name ?? req.creature} hasta que sea adulto`;
    case 'adultCount':
      return (f) => `Ten ${f(D(req.count))} ${req.count === 1 ? 'criatura adulta' : 'criaturas adultas'} (se anotan para siempre)`;
    case 'dragonStage':
      return (f) => `Haz crecer al dragón hasta la etapa ${f(D(req.count))} (${content.cave.dragon[req.count]?.name ?? '?'})`;
    case 'furnaces':
      return (f) => `Ten ${f(D(req.count))} ${req.count === 1 ? 'horno' : 'hornos'} en la cueva`;
    case 'caveNodes':
      return (f) => `Compra ${f(D(req.count))} ${req.count === 1 ? 'ventaja' : 'ventajas'} del dragón`;
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
      kind: req.kind,
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
  /** Bellotas que el topo ha dejado en la cesta (solo con Topo excavador). */
  acorns: number;
}

export function basketView(state: GameState, content: Content, now: number = gameClockMs(state)): BasketView {
  const cap = basketCap(state, content);
  const seconds = basketSeconds(state, cap);
  return { value: basketValue(state, content), seconds, capSeconds: cap, fill: seconds / cap, acorns: basketAcornsReady(state, content, now) };
}

export interface NestSlotView {
  index: number;
  /** ¿Está disponible esta casilla (nidos conseguidos)? */
  usable: boolean;
  creatureId: string | null;
  name: string;
  stage: number;
  stageName: string;
  flavor: string;
  spriteId: string | null;
  /** Segundos que le quedan al huevo para poder eclosionar. */
  hatchLeftSeconds: number;
  canHatch: boolean;
  /** Coste de alimentarla para evolucionar (null si es huevo o ya es adulta). */
  feedCost: number | null;
  canFeed: boolean;
  canRemove: boolean;
}

export interface NestView {
  unlocked: boolean;
  unlockPlumas: number;
  plumas: Decimal;
  slots: NestSlotView[];
  /** Huevos que se pueden comprar y si hay sitio y bellotas. */
  eggs: { id: string; name: string; stageName: string; cost: number; canBuy: boolean }[];
  /** Criaturas que ya han llegado a adultas alguna vez. */
  adults: string[];
  freeSlot: number | null;
}

export function nestView(state: GameState, content: Content, now: number): NestView {
  const count = nestSlotCount(state, content);
  const slots: NestSlotView[] = state.nest.slots.map((s, index) => {
    const creature = s ? creatureOf(content, s.creature) : undefined;
    const base = { index, usable: index < count };
    if (!s || !creature) return { ...base, creatureId: null, name: '', stage: 0, stageName: '', flavor: '', spriteId: null, hatchLeftSeconds: 0, canHatch: false, feedCost: null, canFeed: false, canRemove: false };
    const left = hatchLeftMs(content, s, now);
    const feedCost = s.stage >= 1 && s.stage <= 2 ? creature.feedCosts[s.stage - 1]! : null;
    return {
      ...base,
      creatureId: creature.id,
      name: creature.name,
      stage: s.stage,
      stageName: creature.stages[s.stage]!.name,
      flavor: creature.stages[s.stage]!.flavor,
      spriteId: `${creature.id}-${s.stage}`,
      hatchLeftSeconds: left / 1000,
      canHatch: s.stage === 0 && left <= 0,
      feedCost,
      canFeed: feedCost !== null && state.acorns >= feedCost,
      canRemove: s.stage === 3,
    };
  });
  const freeSlot = slots.findIndex((s) => s.usable && s.creatureId === null);
  return {
    unlocked: nestUnlocked(state, content),
    unlockPlumas: content.nest.unlockPlumas,
    plumas: state.plumasTotal,
    slots,
    eggs: content.nest.creatures.map((c) => ({ id: c.id, name: c.name, stageName: c.stages[0]!.name, cost: c.eggCost, canBuy: freeSlot >= 0 && state.acorns >= c.eggCost })),
    adults: Object.keys(state.nest.adults),
    freeSlot: freeSlot >= 0 ? freeSlot : null,
  };
}

/** Lo que daría una inyección de visitante ahora mismo (monedas). */
export function visitorInjectionValue(state: GameState, content: Content): Decimal {
  return currentIncomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS);
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

export interface AccessoryView {
  id: string;
  slot: 'head' | 'body' | 'tail';
  name: string;
  flavor: string;
  owned: boolean;
  worn: boolean;
  cost: number | null;
  canBuy: boolean;
  achievementName: string | null;
}

export function cosmeticViews(
  state: GameState,
  content: Content,
): { acorns: number; maxActive: number; skins: CosmeticView[]; companions: CosmeticView[]; relics: RelicView[]; accessories: AccessoryView[]; look: { skin: string; head: string | null; body: string | null; tail: string | null } } {
  return {
    look: { skin: state.activeSkin, head: state.wardrobe.worn.head, body: state.wardrobe.worn.body, tail: state.wardrobe.worn.tail },
    accessories: content.accessories.map((a) => {
      const owned = accessoryOwned(state, a);
      return {
        id: a.id,
        slot: a.slot,
        name: a.name,
        flavor: a.flavor,
        owned,
        worn: state.wardrobe.worn[a.slot] === a.id,
        cost: a.cost,
        canBuy: !owned && a.cost !== null && state.acorns >= a.cost,
        achievementName: achievementName(content, a.achievement),
      };
    }),
    acorns: state.acorns,
    maxActive: maxActiveCompanions(state, content),
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
    case 'bestToolMult':
      return `tu mejor herramienta ×${a.mult}`;
    case 'visitorSpeed':
      return `el cerdito viajero llega ×${a.speed} más rápido`;
    case 'freeTool':
      return `herramienta gratis cada ${a.cooldownHours} h`;
    case 'gardenSpeed':
      return `las flores crecen en ×${a.factor} del tiempo`;
    case 'gardenLuck':
      return `+${Math.round(a.mutation * 100)} % de cruce y +${Math.round(a.shiny * 100)} % de flor brillante`;
    case 'embersMult':
      return `brasas ×${a.mult}`;
  }
}

export type CompanionAbilityKind = 'tapAcorn' | 'coinGift' | 'bestToolMult' | 'visitorSpeed' | 'freeTool' | 'gardenSpeed' | 'gardenLuck' | 'embersMult';

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
  unlocked: boolean;
  unlockPlumas: number;
  plumas: Decimal;
  embers: Decimal;
  perSecond: Decimal;
  blowGain: Decimal;
  blowReady: boolean;
  /** Bono total de producción que la cueva da al juego principal. */
  prodBonus: number;
  /** El dragón: etapa actual, la siguiente (null si ya es anciano) y lo que cuesta alimentarlo. */
  dragon: { stage: number; spriteId: string; name: string; flavor: string; bonusText: string; next: { name: string; cost: Decimal; bonusText: string } | null; canFeed: boolean };
  furnaces: { id: string; name: string; emoji: string; flavor: string; owned: number; cost: Decimal; each: Decimal; canBuy: boolean }[];
  branches: { id: string; name: string; emoji: string; nodes: { id: string; name: string; flavor: string; cost: number; bought: boolean; lockedBy: string | null; canBuy: boolean }[] }[];
}

export function caveView(state: GameState, content: Content): CaveView {
  const mult = embersFactor(state, content);
  const stage = content.cave.dragon[state.cave.dragonStage]!;
  const next = content.cave.dragon[state.cave.dragonStage + 1];
  const bonusText = (s: { prodMult: number; embersMult: number }) => `×${s.prodMult} a la producción y ×${s.embersMult} a las brasas`;
  return {
    dragon: {
      stage: state.cave.dragonStage,
      spriteId: `dragon-${state.cave.dragonStage}`,
      name: stage.name,
      flavor: stage.flavor,
      bonusText: state.cave.dragonStage === 0 ? 'Aún no da ningún bono.' : `Con él: ×${dragonBonus(state, content).prod.toFixed(2)} a la producción y ×${dragonBonus(state, content).embers.toFixed(2)} a las brasas.`,
      next: next ? { name: next.name, cost: D(next.cost), bonusText: bonusText(next) } : null,
      canFeed: next !== undefined && state.cave.embers.gte(next.cost),
    },
    unlocked: caveUnlocked(state, content),
    unlockPlumas: content.cave.unlockPlumas,
    plumas: state.plumasTotal,
    embers: state.cave.embers,
    perSecond: embersPerSecond(state, content),
    blowGain: blowGain(state, content),
    blowReady: blowReady(state, content),
    prodBonus: caveProduct(state, content, 'prodMult') * dragonBonus(state, content).prod,
    furnaces: content.cave.furnaces.map((f) => {
      const owned = state.cave.furnaces[f.id] ?? 0;
      const cost = furnaceCost(content.cave, f, owned, caveCostFactor(state, content));
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

/** ¿Está abierta la Cueva (plumas en total suficientes)? */
export function caveUnlocked(state: GameState, content: Content): boolean {
  return state.plumasTotal.gte(content.cave.unlockPlumas);
}

export interface GardenView {
  unlocked: boolean;
  unlockPlumas: number;
  plumas: Decimal;
  cols: number;
  /** Casillas que podría llegar a tener (con todas las ventajas de Más tierra); la UI crea tantas y oculta las que aún no hay. */
  maxCells: number;
  shinyPercent: number;
  /** Bonos temporales activos ahora. */
  active: { id: string; emoji: string; name: string; secondsLeft: number }[];
  cells: { index: number; flowerId: string | null; flowerName: string; emoji: string; readyInSeconds: number; progress: number; ready: boolean }[];
  readyCount: number;
  flowers: { id: string; name: string; emoji: string; flavor: string; growSeconds: number; available: boolean; found: boolean; shiny: boolean; count: number; effectText: string; recipeText: string | null }[];
}

function gardenEffectText(effect: GardenEffect, shiny: boolean, factor = 1): string {
  const seconds = Math.round(effect.seconds * (shiny ? 2 : 1) * factor);
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
  const cells = state.garden.cells.map((p, index) => {
    const flower = p ? flowers.find((f) => f.id === p.flower) : undefined;
    if (!p || !flower) return { index, flowerId: null, flowerName: '', emoji: '', readyInSeconds: 0, progress: 0, ready: false };
    const total = growMs(state, content, flower);
    const elapsed = Math.max(0, now - p.plantedAt);
    return { index, flowerId: flower.id, flowerName: flower.name, emoji: flower.emoji, readyInSeconds: Math.max(0, (total - elapsed) / 1000), progress: Math.min(1, elapsed / total), ready: elapsed >= total };
  });
  return {
    unlocked: gardenUnlocked(state, content),
    unlockPlumas: content.garden.unlockPlumas,
    plumas: state.plumasTotal,
    cols: content.garden.cols,
    maxCells: content.garden.cols * gardenMaxRows(content),
    shinyPercent: Math.round(shinyChance(state, content) * 100),
    active: flowers.filter((f) => flowerActive(state, f.id)).map((f) => ({ id: f.id, emoji: f.emoji, name: f.name, secondsLeft: (state.garden.buffs[f.id] ?? 0) - state.time })),
    cells,
    readyCount: cells.filter((c) => c.ready).length,
    flowers: flowers.map((f, i) => {
      const got = state.garden.found[f.id];
      const [p, q] = f.recipe ?? [null, null];
      const name = (id: string | null) => flowers.find((x) => x.id === id);
      return {
        id: f.id,
        name: f.name,
        emoji: f.emoji,
        flavor: f.flavor,
        growSeconds: growMs(state, content, f) / 1000,
        available: flowerAvailable(state, content, i),
        found: got !== undefined,
        shiny: got?.shiny === true,
        count: got?.count ?? 0,
        effectText: `${gardenEffectText(f.effect, false, durationFactor(state, content))} (brillante: ${gardenEffectText(f.effect, true, durationFactor(state, content))})`,
        recipeText: f.recipe ? `Cruza ${name(p)?.name} con ${name(q)?.name} en casillas vecinas` : null,
      };
    }),
  };
}
