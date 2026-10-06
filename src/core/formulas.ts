// Fórmulas de la mina. Ver docs/06-mina.md. Todo número sale de `content.mine` y de los datos de
// piezas, zonas y ventajas: aquí no hay ningún nombre ni constante propia del juego.

import type { Content, PerkDef, PerkEffect, PieceDef, ZoneDef } from '../content/types.ts';
import { D, Decimal } from './num.ts';
import type { GameState, PerkId, PieceId } from './state.ts';

/** Profundidad máxima (con hpGrowth ~1,12 el vida del bloque sigue cabiendo en un `number`). */
export const MAX_DEPTH = 3000;

// ---------------------------------------------------------------------------
// Zonas y bloques
// ---------------------------------------------------------------------------

export function zoneIndexOf(content: Content, depth: number): number {
  return Math.min(content.zones.length - 1, Math.floor((depth - 1) / content.mine.zoneLength));
}

export function zoneAt(content: Content, depth: number): ZoneDef {
  return content.zones[zoneIndexOf(content, depth)]!;
}

/** Primer nivel de la zona `index`. */
export function zoneStartDepth(content: Content, index: number): number {
  return index * content.mine.zoneLength + 1;
}

/** Último nivel de la zona `index` (la última zona no tiene fin: MAX_DEPTH). */
export function zoneEndDepth(content: Content, index: number): number {
  return index >= content.zones.length - 1 ? MAX_DEPTH : (index + 1) * content.mine.zoneLength;
}

/** Vida del bloque del nivel `depth`. */
export function blockHpAt(content: Content, depth: number): number {
  return content.mine.hpBase * content.mine.hpGrowth ** (depth - 1);
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

export function getPiece(content: Content, id: PieceId): PieceDef {
  const piece = content.pieces.find((p) => p.id === id);
  if (!piece) throw new Error(`Pieza desconocida: ${id}`);
  return piece;
}

export function pieceLevel(state: GameState, id: PieceId): number {
  return state.gear[id] ?? 0;
}

/** ×mult por cada hito de nivel alcanzado (10, 25, 50, 100). */
export function milestoneMult(content: Content, level: number): number {
  const reached = content.mine.milestones.filter((m) => level >= m).length;
  return content.mine.milestoneMult ** reached;
}

/** Efecto numérico de una pieza a nivel `level` (perLevel · nivel · hitos). 0 si no tiene valor por nivel. */
export function pieceValue(content: Content, piece: PieceDef, level: number): number {
  const e = piece.effect;
  if (e.kind === 'resist' || e.kind === 'burst') return 0;
  return e.perLevel * level * milestoneMult(content, level);
}

function sumOf(state: GameState, content: Content, kinds: PieceDef['effect']['kind'][]): number {
  let total = 0;
  for (const piece of content.pieces) {
    if (!kinds.includes(piece.effect.kind)) continue;
    const level = pieceLevel(state, piece.id);
    if (level > 0) total += pieceValue(content, piece, level);
  }
  return total;
}

export function pieceUnlocked(state: GameState, piece: PieceDef): boolean {
  return state.records.maxDepth >= piece.unlock.depth && state.ascensions >= piece.unlock.ascensions;
}

/** Coste de subir la pieza del nivel `level` al siguiente: monedas y (si lo pide) material. */
export function pieceCost(state: GameState, content: Content, piece: PieceDef, level: number): { coins: Decimal; material: Decimal | null } {
  const coins = D(piece.baseCost).mul(Decimal.pow(piece.costGrowth, level)).mul(perkProduct(state, content, 'costMult')).ceil();
  const material = piece.material === null ? null : D(piece.materialBase).mul(Decimal.pow(1.12, level)).ceil();
  return { coins, material };
}

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

function perLevelOf(effect: PerkEffect): number {
  return effect.perLevel;
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
  for (const { perk, level } of perksOfKind(state, content, kind)) total += perLevelOf(perk.effect) * level;
  return total;
}

/** Producto de `perLevel^nivel` de las ventajas de `kind`. */
export function perkProduct(state: GameState, content: Content, kind: PerkEffect['kind']): number {
  let total = 1;
  for (const { perk, level } of perksOfKind(state, content, kind)) total *= perLevelOf(perk.effect) ** level;
  return total;
}

// ---------------------------------------------------------------------------
// Cavado
// ---------------------------------------------------------------------------

/** Bono pasivo de las plumas: 1 + (perPluma + Raíces) · plumas ganadas en total. */
export function plumaBonus(state: GameState, content: Content): number {
  const rate = content.mine.perPluma + perkSum(state, content, 'perPlumaBonus');
  return 1 + rate * state.plumasTotal.toNumber();
}

/** Multiplicador permanente del cavado: ventajas (Abono) × bono de plumas. */
export function prodMultiplier(state: GameState, content: Content): number {
  return perkProduct(state, content, 'prodMult') * plumaBonus(state, content);
}

/** Fracción del cavado que se conserva en la zona `zoneIndex` según la resistencia al peligro (0..1). */
export function hazardFactor(state: GameState, content: Content, zoneIndex: number): number {
  const zone = content.zones[zoneIndex];
  if (!zone || zone.hazard === null) return 1;
  const piece = content.pieces.find((p) => p.effect.kind === 'resist' && p.effect.hazard === zone.hazard);
  if (!piece || piece.effect.kind !== 'resist') return 1;
  const need = piece.effect.needBase + piece.effect.needStep * zoneIndex;
  const progress = Math.min(1, pieceLevel(state, piece.id) / need);
  const floor = content.mine.hazardFloor;
  return floor + (1 - floor) * progress;
}

/** Cavado por segundo en la zona `zoneIndex` (sin impulso del visitante). */
export function digPower(state: GameState, content: Content, zoneIndex: number): number {
  const base = content.mine.baseDps + sumOf(state, content, ['dig', 'helper']);
  const mult = 1 + sumOf(state, content, ['digMult']);
  return base * mult * prodMultiplier(state, content) * hazardFactor(state, content, zoneIndex);
}

/** Segundos de cavado que equivale un toque. */
export function tapSeconds(state: GameState, content: Content): number {
  return content.mine.tapSeconds * (1 + sumOf(state, content, ['tap']));
}

/** Monedas que suelta un bloque del nivel `depth`. */
export function blockCoins(state: GameState, content: Content, depth: number): Decimal {
  const base = D(content.mine.coinBase).mul(Decimal.pow(content.mine.coinGrowth, depth - 1));
  return base.mul(1 + sumOf(state, content, ['coinMult']));
}

/** Unidades del material de la zona que suelta un bloque. */
export function materialDrop(state: GameState, content: Content): number {
  return 1 + sumOf(state, content, ['materialMult']);
}

/** Monedas por segundo ahora mismo (en el nivel actual, sin impulso). */
export function incomePerSecond(state: GameState, content: Content): Decimal {
  const dps = digPower(state, content, zoneIndexOf(content, state.depth));
  if (!(dps > 0) || !(state.blockHp > 0)) return D(0);
  const hp = blockHpAt(content, state.depth);
  return blockCoins(state, content, state.depth).mul(dps / hp);
}

// ---------------------------------------------------------------------------
// Dinamita (habilidad activa)
// ---------------------------------------------------------------------------

export function burstPiece(content: Content): PieceDef | undefined {
  return content.pieces.find((p) => p.effect.kind === 'burst');
}

/** Segundos de cavado que da la dinamita al nivel actual (0 si no la tienes). */
export function burstSeconds(state: GameState, content: Content): number {
  const piece = burstPiece(content);
  if (!piece || piece.effect.kind !== 'burst') return 0;
  const level = pieceLevel(state, piece.id);
  return level > 0 ? piece.effect.baseSeconds + piece.effect.perLevel * level : 0;
}

export function burstCooldown(content: Content): number {
  const piece = burstPiece(content);
  return piece && piece.effect.kind === 'burst' ? piece.effect.cooldown : 0;
}

// ---------------------------------------------------------------------------
// Subir a la superficie (ascensión)
// ---------------------------------------------------------------------------

/** Plumas que se ganarían subiendo ahora: floor(coef · profundidad^exp · (1 + Plumas al viento)). */
export function plumasPending(state: GameState, content: Content): number {
  const m = content.mine;
  const mult = 1 + perkSum(state, content, 'plumaMult');
  return Math.max(0, Math.floor(m.plumaCoef * state.runMaxDepth ** m.plumaExp * mult));
}

/** Moneda con la que empieza la ronda. */
export function startCoins(state: GameState, content: Content): Decimal {
  const base = D(content.mine.startCoins);
  const perks = perksOfKind(state, content, 'startCurrency');
  return perks.reduce((acc, { perk, level }) => acc.mul(Decimal.pow(perLevelOf(perk.effect), level)), base);
}

/** Nivel de la mina en el que empieza la ronda (1 + Atajo conocido). */
export function startDepth(state: GameState, content: Content): number {
  return Math.min(MAX_DEPTH, 1 + Math.round(perkSum(state, content, 'startDepth')));
}

/** Segundos máximos de producción mientras no estás (2 h + Siesta larga). */
export function offlineCapSeconds(state: GameState, content: Content): number {
  return (content.mine.offlineHours + perkSum(state, content, 'offlineHours')) * 3600;
}
