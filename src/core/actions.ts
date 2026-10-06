// Únicas funciones (junto con tick.ts y offline.ts) que mutan el GameState.
// Ver CLAUDE.md "Reglas de código" y docs/06-mina.md.

import type { Content } from '../content/types.ts';
import { basketValue } from './basket.ts';
import {
  burstCooldown,
  burstPiece,
  burstSeconds,
  getPerk,
  getPiece,
  incomePerSecond,
  MAX_DEPTH,
  perkAvailable,
  perkCost,
  pieceCost,
  pieceLevel,
  pieceUnlocked,
  plumasPending,
  startCoins,
  startDepth,
  tapSeconds,
  zoneEndDepth,
  zoneIndexOf,
  blockHpAt,
} from './formulas.ts';
import { addEntry } from './journal.ts';
import { advanceMine } from './mining.ts';
import { D, Decimal } from './num.ts';
import type { GameState, PerkId, PieceId, Settings } from './state.ts';

export type BuyAmount = 1 | 10 | 'max';

/** Pica la mina: equivale a `tapSeconds` segundos de cavado (con el impulso del visitante si está activo). Devuelve las monedas ganadas. */
export function tap(state: GameState, content: Content): Decimal {
  const before = state.coins;
  advanceMine(state, content, tapSeconds(state, content), state.buff?.mult ?? 1);
  state.taps += 1;
  return state.coins.sub(before);
}

/** Lo que daría picar ahora mismo (sin mutar el estado). */
export function tapValue(state: GameState, content: Content): Decimal {
  const copy: GameState = { ...state, coins: state.coins, materials: { ...state.materials }, records: { ...state.records }, journal: [] };
  const before = copy.coins;
  advanceMine(copy, content, tapSeconds(copy, content), copy.buff?.mult ?? 1);
  return copy.coins.sub(before);
}

/**
 * Sube de nivel una pieza `amount` veces (1, 10 o "máx" = las que se puedan pagar). Devuelve los
 * niveles comprados. Pide monedas y, si la pieza lo requiere, material. No hace nada si no está
 * desbloqueada o ya está al máximo.
 */
export function buyPiece(state: GameState, content: Content, pieceId: PieceId, amount: BuyAmount = 1): number {
  const piece = getPiece(content, pieceId);
  if (!pieceUnlocked(state, piece)) return 0;
  const wanted = amount === 'max' ? 1000 : amount;
  let bought = 0;
  while (bought < wanted) {
    const level = pieceLevel(state, pieceId);
    if (level >= piece.maxLevel) break;
    const cost = pieceCost(state, content, piece, level);
    if (state.coins.lt(cost.coins)) break;
    const stock = piece.material === null ? D(0) : (state.materials[piece.material] ?? D(0));
    if (cost.material !== null && stock.lt(cost.material)) break;
    state.coins = state.coins.sub(cost.coins);
    if (piece.material !== null && cost.material !== null) state.materials[piece.material] = stock.sub(cost.material);
    state.gear[pieceId] = level + 1;
    bought += 1;
  }
  return bought;
}

/** Usa la dinamita si la tienes y está lista: cava de golpe. Devuelve las monedas ganadas (0 si no se pudo). */
export function useBurst(state: GameState, content: Content): Decimal {
  const piece = burstPiece(content);
  if (!piece || state.time < state.burstReadyAt) return D(0);
  const seconds = burstSeconds(state, content);
  if (seconds <= 0) return D(0);
  const before = state.coins;
  advanceMine(state, content, seconds, state.buff?.mult ?? 1);
  state.burstReadyAt = state.time + burstCooldown(content);
  return state.coins.sub(before);
}

/**
 * Elige en qué zona cavar: `null` = ir avanzando; un número = quedarse en esa zona (solo las que ya
 * has alcanzado en esta ronda), para conseguir sus materiales. Si el nivel actual cae fuera, se
 * pasa al último nivel alcanzado de esa zona.
 */
export function setFarmZone(state: GameState, content: Content, zone: number | null): void {
  if (zone === null) {
    state.farmZone = null;
    return;
  }
  if (zone < 0 || zone >= content.zones.length || zone > zoneIndexOf(content, state.runMaxDepth)) return;
  state.farmZone = zone;
  if (zoneIndexOf(content, state.depth) !== zone) {
    state.depth = Math.min(zoneEndDepth(content, zone), state.runMaxDepth);
    state.blockHp = blockHpAt(content, state.depth);
  }
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
 * Sube a la superficie: cobra las plumas (según el nivel más hondo de la ronda) y reinicia la
 * ronda (monedas, materiales, piezas y profundidad), conservando plumas, ventajas, logros y
 * récords. Devuelve las plumas ganadas (0 si no había ninguna: no se puede subir en vano).
 * `now`: epoch ms, para el diario.
 */
export function ascend(state: GameState, content: Content, now: number): number {
  const gain = plumasPending(state, content);
  if (gain <= 0) return 0;

  state.plumas = state.plumas.add(gain);
  state.plumasTotal = state.plumasTotal.add(gain);
  state.ascensions += 1;

  state.coins = startCoins(state, content);
  state.materials = {};
  state.gear = {};
  state.farmZone = null;
  state.depth = startDepth(state, content);
  state.blockHp = blockHpAt(content, state.depth);
  state.runMaxDepth = state.depth;
  state.runSeconds = 0;
  state.burstReadyAt = 0;
  state.basketSince = state.time;

  addEntry(state, `Subes a la superficie tras llegar al nivel ${state.records.maxDepth}. Dejas ${gain} pluma${gain === 1 ? '' : 's'} y vuelves a bajar con ganas.`, now);
  return gain;
}

// ---------------------------------------------------------------------------
// Cesta y visitante
// ---------------------------------------------------------------------------

/** Recoge la cesta: suma su valor a las monedas y la vacía. Devuelve lo recogido. */
export function collectBasket(state: GameState, content: Content): Decimal {
  const gain = basketValue(state, content);
  state.coins = state.coins.add(gain);
  state.basketSince = state.time;
  return gain;
}

export type VisitorKind = 'injection' | 'boost';

/** Segundos de ingresos que da la inyección de un visitante. */
export const VISITOR_INJECTION_SECONDS = 600;
/** Multiplicador y duración del impulso de un visitante. */
export const VISITOR_BOOST = { mult: 5, seconds: 60 };

/** Recompensa de un cerdito viajero: `injection` = 10 min de ingresos de golpe; `boost` = ×5 de cavado durante 60 s. */
export function claimVisitor(state: GameState, content: Content, kind: VisitorKind): void {
  if (kind === 'boost') {
    state.buff = { mult: VISITOR_BOOST.mult, until: state.time + VISITOR_BOOST.seconds };
    return;
  }
  state.coins = state.coins.add(incomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS));
}

export { MAX_DEPTH };
