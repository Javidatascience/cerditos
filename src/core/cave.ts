// Fórmulas de la Cueva del Dragón (solo lectura; las compras y el tiempo mutan en actions.ts y tick.ts).

import type { CaveDef, CaveEffect, CaveFurnaceDef, Content } from '../content/types.ts';
import { D, Decimal } from './num.ts';
import type { GameState } from './state.ts';

export function furnaceCost(cave: CaveDef, furnace: CaveFurnaceDef, owned: number): Decimal {
  return D(furnace.baseCost).mul(Decimal.pow(cave.furnaceGrowth, owned)).ceil();
}

function boughtEffects(state: GameState, content: Content, kind: CaveEffect['kind']): number[] {
  return content.cave.nodes.filter((n) => state.cave.nodes[n.id] === true && n.effect.kind === kind).map((n) => n.effect.value);
}

/** Producto de los efectos comprados de ese tipo (1 si no hay ninguno). */
export function caveProduct(state: GameState, content: Content, kind: CaveEffect['kind']): number {
  return boughtEffects(state, content, kind).reduce((a, b) => a * b, 1);
}

/** Suma de los efectos comprados de ese tipo. */
export function caveSum(state: GameState, content: Content, kind: CaveEffect['kind']): number {
  return boughtEffects(state, content, kind).reduce((a, b) => a + b, 0);
}

/** Intervalo del aliento del dragón: el menor de los comprados (o el base). */
export function breathSeconds(state: GameState, content: Content, base: number): number {
  return Math.min(base, ...boughtEffects(state, content, 'breathSeconds'));
}

/** Brasas por segundo. */
export function embersPerSecond(state: GameState, content: Content): Decimal {
  let total = D(0);
  for (const f of content.cave.furnaces) total = total.add(D(f.baseProd).mul(state.cave.furnaces[f.id] ?? 0));
  return total.mul(caveProduct(state, content, 'embers'));
}

export function blowGain(state: GameState, content: Content): Decimal {
  return Decimal.max(1, embersPerSecond(state, content).mul(content.cave.blowSeconds));
}

export function blowReady(state: GameState, content: Content): boolean {
  return state.time - state.cave.blowAt >= content.cave.blowCooldown;
}
