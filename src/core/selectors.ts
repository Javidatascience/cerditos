// Datos derivados para la UI: toda la aritmética que la UI necesita sale de aquí, nunca de
// llamar a formulas.ts directamente desde ui/. Ver docs/06-mina.md.

import type { AchievementReq, Content, PerkDef, PerkEffect, PieceDef } from '../content/types.ts';
import { achievementProgress } from './achievements.ts';
import { BASKET_CAP_SECONDS, basketSeconds, basketValue } from './basket.ts';
import {
  blockCoins,
  blockHpAt,
  burstCooldown,
  digPower,
  hazardFactor,
  incomePerSecond,
  milestoneMult,
  perkAvailable,
  perkCost,
  perkLevelOf,
  pieceCost,
  pieceLevel,
  pieceUnlocked,
  pieceValue,
  plumaBonus,
  tapSeconds,
  plumasPending,
  zoneAt,
  zoneEndDepth,
  zoneIndexOf,
  zoneStartDepth,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import { VISITOR_INJECTION_SECONDS, type BuyAmount } from './actions.ts';
import type { GameState } from './state.ts';

// ---------------------------------------------------------------------------
// Cabecera y mina
// ---------------------------------------------------------------------------

export interface HeaderView {
  coins: Decimal;
  income: Decimal;
  depth: number;
  zoneName: string;
  zoneEmoji: string;
}

export function headerView(state: GameState, content: Content): HeaderView {
  const zone = zoneAt(content, state.depth);
  return { coins: state.coins, income: incomePerSecond(state, content), depth: state.depth, zoneName: zone.name, zoneEmoji: zone.emoji };
}

export interface HazardView {
  name: string;
  emoji: string;
  /** Fracción del cavado que se conserva (0..1). */
  factor: number;
  pieceName: string;
  pieceLevel: number;
  needLevel: number;
}

export interface ZoneOptionView {
  index: number;
  name: string;
  emoji: string;
  /** Se puede elegir (la has alcanzado en esta ronda). */
  reachable: boolean;
  /** Es en la que se está cavando ahora. */
  current: boolean;
}

export interface MaterialView {
  id: string;
  name: string;
  emoji: string;
  amount: Decimal;
}

export interface MineView {
  depth: number;
  recordDepth: number;
  zoneIndex: number;
  zoneName: string;
  zoneEmoji: string;
  zoneFlavor: string;
  /** Primer y último nivel de la zona actual (el último es `null` en la zona final). */
  zoneStart: number;
  zoneEnd: number | null;
  materialName: string;
  materialEmoji: string;
  /** Fracción de vida que le queda al bloque (1 = entero). */
  blockFraction: number;
  /** Cavado por segundo ahora mismo, con el impulso del visitante incluido. */
  dps: number;
  /** Monedas que suelta este bloque al romperse. */
  blockCoinsValue: Decimal;
  hazard: HazardView | null;
  farmZone: number | null;
  zones: ZoneOptionView[];
  materials: MaterialView[];
  /** Cavado que aporta un pico (daño al bloque), con el impulso del visitante incluido. */
  tapDamage: number;
  boostMult: number;
}

export function mineView(state: GameState, content: Content): MineView {
  const zoneIndex = zoneIndexOf(content, state.depth);
  const zone = content.zones[zoneIndex]!;
  const boostMult = state.buff?.mult ?? 1;
  const material = content.materials.find((m) => m.id === zone.material);
  const hazardDef = zone.hazard === null ? null : content.hazards.find((h) => h.id === zone.hazard);
  const resistPiece = hazardDef ? content.pieces.find((p) => p.effect.kind === 'resist' && p.effect.hazard === hazardDef.id) : undefined;

  let hazard: HazardView | null = null;
  if (hazardDef && resistPiece && resistPiece.effect.kind === 'resist') {
    hazard = {
      name: hazardDef.name,
      emoji: hazardDef.emoji,
      factor: hazardFactor(state, content, zoneIndex),
      pieceName: resistPiece.name,
      pieceLevel: pieceLevel(state, resistPiece.id),
      needLevel: resistPiece.effect.needBase + resistPiece.effect.needStep * zoneIndex,
    };
  }

  const reachableZone = zoneIndexOf(content, state.runMaxDepth);
  const end = zoneEndDepth(content, zoneIndex);
  const hp = blockHpAt(content, state.depth);
  return {
    depth: state.depth,
    recordDepth: state.records.maxDepth,
    zoneIndex,
    zoneName: zone.name,
    zoneEmoji: zone.emoji,
    zoneFlavor: zone.flavor,
    zoneStart: zoneStartDepth(content, zoneIndex),
    zoneEnd: zoneIndex >= content.zones.length - 1 ? null : end,
    materialName: material?.name ?? zone.material,
    materialEmoji: material?.emoji ?? '',
    blockFraction: Math.max(0, Math.min(1, state.blockHp / hp)),
    dps: digPower(state, content, zoneIndex) * boostMult,
    blockCoinsValue: blockCoins(state, content, state.depth),
    hazard,
    farmZone: state.farmZone,
    zones: content.zones.map((z, index) => ({ index, name: z.name, emoji: z.emoji, reachable: index <= reachableZone, current: index === zoneIndex })),
    materials: content.materials
      .filter((m) => state.materials[m.id] !== undefined || content.zones.some((z) => z.material === m.id && zoneIndexOf(content, state.records.maxDepth) >= content.zones.indexOf(z)))
      .map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, amount: (state.materials[m.id] ?? D(0)).floor() })),
    tapDamage: digPower(state, content, zoneIndex) * tapSeconds(state, content) * boostMult,
    boostMult,
  };
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

export interface PieceEffectView {
  kind: PieceDef['effect']['kind'];
  /** Valor al nivel actual y al siguiente (según el efecto: dps, multiplicador, %, segundos…). */
  value: number;
  nextValue: number;
  /** Solo "resist": peligro, nivel necesario para anularlo y fracción conservada ahora. */
  hazardName?: string;
  needLevel?: number;
  factor?: number;
  /** Solo "burst": enfriamiento en segundos. */
  cooldown?: number;
}

export interface PieceView {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  level: number;
  maxLevel: number;
  maxed: boolean;
  unlocked: boolean;
  /** Mientras está bloqueada: qué falta. */
  lockedReason: string | null;
  effect: PieceEffectView;
  /** A partir de qué nivel el siguiente hito duplica su efecto, o null si ya pasó todos. */
  nextMilestone: number | null;
  costCoins: Decimal;
  material: { name: string; emoji: string; cost: Decimal; have: Decimal } | null;
  canAfford: boolean;
  /** Niveles que compraría el botón ahora mismo (según ajustes: 1, 10 o máx; 0 si ninguno). */
  amountToBuy: number;
}

function effectView(state: GameState, content: Content, piece: PieceDef): PieceEffectView {
  const level = pieceLevel(state, piece.id);
  const e = piece.effect;
  if (e.kind === 'burst') {
    return { kind: 'burst', value: level > 0 ? e.baseSeconds + e.perLevel * level : 0, nextValue: e.baseSeconds + e.perLevel * (level + 1), cooldown: e.cooldown };
  }
  if (e.kind === 'resist') {
    const hazard = content.hazards.find((h) => h.id === e.hazard);
    const zoneIndex = content.zones.findIndex((z) => z.hazard === e.hazard);
    const need = e.needBase + e.needStep * Math.max(0, zoneIndex);
    return {
      kind: 'resist',
      value: level,
      nextValue: level + 1,
      hazardName: hazard?.name ?? e.hazard,
      needLevel: need,
      factor: hazardFactor(state, content, Math.max(0, zoneIndex)),
    };
  }
  return { kind: e.kind, value: pieceValue(content, piece, level), nextValue: pieceValue(content, piece, level + 1) };
}

function lockedReason(state: GameState, piece: PieceDef): string | null {
  if (pieceUnlocked(state, piece)) return null;
  const parts: string[] = [];
  if (state.records.maxDepth < piece.unlock.depth) parts.push(`llega al nivel ${piece.unlock.depth}`);
  if (state.ascensions < piece.unlock.ascensions) parts.push(`sube a la superficie ${piece.unlock.ascensions} ${piece.unlock.ascensions === 1 ? 'vez' : 'veces'}`);
  return `Se desbloquea cuando ${parts.join(' y ')}.`;
}

export function pieceViews(state: GameState, content: Content): PieceView[] {
  const amount: BuyAmount = state.settings.buyAmount;
  return content.pieces.map((piece) => {
    const level = pieceLevel(state, piece.id);
    const unlocked = pieceUnlocked(state, piece);
    const cost = pieceCost(state, content, piece, level);
    const mat = piece.material === null ? undefined : content.materials.find((m) => m.id === piece.material);
    const have = piece.material === null ? D(0) : (state.materials[piece.material] ?? D(0)).floor();
    const canAfford = unlocked && level < piece.maxLevel && state.coins.gte(cost.coins) && (cost.material === null || have.gte(cost.material));

    // Cuántos niveles compraría el botón ahora (simulando el gasto sin tocar el estado).
    let amountToBuy = 0;
    if (unlocked) {
      const wanted = amount === 'max' ? 1000 : amount;
      let coins = state.coins;
      let material = state.materials[piece.material ?? ''] ?? D(0);
      for (let l = level; amountToBuy < wanted && l < piece.maxLevel; l++) {
        const c = pieceCost(state, content, piece, l);
        if (coins.lt(c.coins) || (c.material !== null && material.lt(c.material))) break;
        coins = coins.sub(c.coins);
        if (c.material !== null) material = material.sub(c.material);
        amountToBuy++;
      }
    }

    // Los hitos (×2) solo valen para efectos con valor por nivel, no para resistencias ni dinamita.
    const milestones = piece.effect.kind === 'resist' || piece.effect.kind === 'burst' ? [] : content.mine.milestones.filter((m) => m > level);
    return {
      id: piece.id,
      name: piece.name,
      emoji: piece.emoji,
      flavor: piece.flavor,
      level,
      maxLevel: piece.maxLevel,
      maxed: level >= piece.maxLevel,
      unlocked,
      lockedReason: lockedReason(state, piece),
      effect: effectView(state, content, piece),
      nextMilestone: milestones[0] ?? null,
      costCoins: cost.coins,
      material: mat && cost.material ? { name: mat.name, emoji: mat.emoji, cost: cost.material, have } : null,
      canAfford,
      amountToBuy,
    };
  });
}

/** ×N que aporta el siguiente hito de la pieza (para el texto "a nivel 25: ×2"). */
export function milestoneFactor(content: Content): number {
  return content.mine.milestoneMult;
}

/** Dinamita: segundos que faltan para que vuelva a estar lista (0 si lista). */
export function burstStatus(state: GameState, content: Content): { owned: boolean; ready: boolean; secondsLeft: number; cooldown: number } {
  const owned = pieceLevel(state, content.pieces.find((p) => p.effect.kind === 'burst')?.id ?? '') > 0;
  const secondsLeft = Math.max(0, state.burstReadyAt - state.time);
  return { owned, ready: owned && secondsLeft <= 0, secondsLeft, cooldown: burstCooldown(content) };
}

// ---------------------------------------------------------------------------
// Subir a la superficie y ventajas
// ---------------------------------------------------------------------------

export interface AscendView {
  plumas: Decimal;
  plumasTotal: Decimal;
  pendingGain: number;
  runMaxDepth: number;
  currentBonusMultiplier: number;
  nextBonusMultiplier: number;
  canAscend: boolean;
  startDepthNext: number;
}

export function ascendView(state: GameState, content: Content): AscendView {
  const pendingGain = plumasPending(state, content);
  const current = plumaBonus(state, content);
  const rate = current > 0 ? (current - 1) / Math.max(1, state.plumasTotal.toNumber()) : 0;
  return {
    plumas: state.plumas,
    plumasTotal: state.plumasTotal,
    pendingGain,
    runMaxDepth: state.runMaxDepth,
    currentBonusMultiplier: current,
    nextBonusMultiplier: state.plumasTotal.gt(0) ? 1 + rate * (state.plumasTotal.toNumber() + pendingGain) : 1 + content.mine.perPluma * pendingGain,
    canAscend: pendingGain > 0,
    startDepthNext: 1,
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
      return `×${(effect.perLevel ** level).toFixed(2)} cavado`;
    case 'costMult':
      return `×${(effect.perLevel ** level).toFixed(2)} coste de las piezas`;
    case 'startCurrency':
      return `×${Math.round(effect.perLevel ** level)} monedas iniciales`;
    case 'startDepth':
      return `empiezas en el nivel ${1 + effect.perLevel * level}`;
    case 'plumaMult':
      return `+${Math.round(effect.perLevel * level * 100)} % plumas al subir`;
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
  /** Si es de "sube una pieza a nivel N": la pieza (la UI las agrupa por pieza). */
  piece: { id: string; name: string; emoji: string; count: number } | null;
}

function describeRequirement(content: Content, req: AchievementReq): (format: (n: Decimal) => string) => string {
  switch (req.kind) {
    case 'depth':
      return (f) => `Llega al nivel ${f(D(req.count))} de la mina`;
    case 'blocks':
      return (f) => `Rompe ${f(D(req.count))} bloques`;
    case 'taps':
      return (f) => `Pica ${f(D(req.count))} veces`;
    case 'ascensions':
      return (f) => `Sube a la superficie ${f(D(req.count))} ${req.count === 1 ? 'vez' : 'veces'}`;
    case 'plumasTotal':
      return (f) => `Consigue ${f(D(req.count))} plumas en total`;
    case 'pieceLevel':
      return (f) => `Sube ${content.pieces.find((p) => p.id === req.piece)?.name ?? req.piece} al nivel ${f(D(req.count))}`;
  }
}

export function achievementViews(state: GameState, content: Content): AchievementView[] {
  return content.achievements.map((a) => {
    const piece = a.requires.kind === 'pieceLevel' ? content.pieces.find((p) => p.id === (a.requires as { piece: string }).piece) : undefined;
    return {
      id: a.id,
      name: a.name,
      flavor: a.flavor,
      owned: state.achievements[a.id] !== undefined,
      requirement: { ...achievementProgress(state, a.requires), describe: describeRequirement(content, a.requires) },
      piece: piece && a.requires.kind === 'pieceLevel' ? { id: piece.id, name: piece.name, emoji: piece.emoji, count: a.requires.count } : null,
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

export { milestoneMult, Decimal };
