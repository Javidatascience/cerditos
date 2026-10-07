// Fórmulas de la Cueva del Dragón (solo lectura; las compras y el tiempo mutan en actions.ts y tick.ts).

import type { CaveDef, CaveEffect, CaveFurnaceDef, Content } from '../content/types.ts';
import { D, Decimal } from './num.ts';
import { perkProductOf, perkSumOf } from './perkEffects.ts';
import type { GameState } from './state.ts';

/** Coste del siguiente horno; `discount` es el factor de las ventajas del árbol (Hornos de saldo). */
export function furnaceCost(cave: CaveDef, furnace: CaveFurnaceDef, owned: number, discount = 1): Decimal {
  return D(furnace.baseCost).mul(Decimal.pow(cave.furnaceGrowth, owned)).mul(discount).ceil();
}

/** Factor de coste de los hornos por las ventajas del árbol (1 sin ninguna). */
export function caveCostFactor(state: GameState, content: Content): number {
  return perkProductOf(state, content, 'caveCost');
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

/** Bonos acumulados de las etapas del dragón alcanzadas (la del huevo no da nada). */
export function dragonBonus(state: GameState, content: Content): { prod: number; embers: number } {
  let prod = 1;
  let embers = 1;
  for (let i = 1; i <= state.cave.dragonStage; i++) {
    const stage = content.cave.dragon[i];
    if (!stage) break;
    prod *= stage.prodMult;
    embers *= stage.embersMult;
  }
  return { prod, embers };
}

/** Brasas por segundo. */
export function embersPerSecond(state: GameState, content: Content): Decimal {
  let total = D(0);
  for (const f of content.cave.furnaces) total = total.add(D(f.baseProd).mul(state.cave.furnaces[f.id] ?? 0));
  return total.mul(embersFactor(state, content));
}

/** Multiplicador de las brasas: ventajas de la cueva, del árbol y etapa del dragón. */
export function embersFactor(state: GameState, content: Content): number {
  return caveProduct(state, content, 'embers') * (1 + perkSumOf(state, content, 'caveEmbers')) * dragonBonus(state, content).embers;
}

export function blowGain(state: GameState, content: Content): Decimal {
  return Decimal.max(1, embersPerSecond(state, content).mul(content.cave.blowSeconds)).mul(1 + perkSumOf(state, content, 'caveBlow'));
}

export function blowReady(state: GameState, content: Content): boolean {
  return state.time - state.cave.blowAt >= content.cave.blowCooldown;
}
