// Fórmulas del Jardín (solo lectura; plantar y recoger mutan en actions.ts).

import type { Content, GardenEffect, GardenFlowerDef } from '../content/types.ts';
import { D, Decimal } from './num.ts';
import type { GameState } from './state.ts';

const MULTIPLICATIVE: GardenEffect['kind'][] = ['prodMult', 'costMult'];

/** Valor de una flor ya recogida: la brillante duplica la parte que aporta (×1,02 → ×1,04; +0,25 → +0,5). */
export function flowerValue(flower: GardenFlowerDef, shiny: boolean): number {
  const v = flower.effect.value;
  if (!shiny) return v;
  return MULTIPLICATIVE.includes(flower.effect.kind) ? 1 + (v - 1) * 2 : v * 2;
}

function found(state: GameState, content: Content, kind: GardenEffect['kind']): number[] {
  return content.garden.flowers.filter((f) => f.effect.kind === kind && state.garden.found[f.id]).map((f) => flowerValue(f, state.garden.found[f.id]?.shiny === true));
}

export function gardenProduct(state: GameState, content: Content, kind: GardenEffect['kind']): number {
  return found(state, content, kind).reduce((a, b) => a * b, 1);
}

export function gardenSum(state: GameState, content: Content, kind: GardenEffect['kind']): number {
  return found(state, content, kind).reduce((a, b) => a + b, 0);
}

export function gardenUnlocked(state: GameState, content: Content): boolean {
  return state.lifetime.gte(content.garden.unlockLifetime);
}

/** Una flor se puede plantar si es la primera o ya se recogió la anterior. */
export function flowerAvailable(state: GameState, content: Content, index: number): boolean {
  return index === 0 || state.garden.found[content.garden.flowers[index - 1]!.id] !== undefined;
}

export function growMs(flower: GardenFlowerDef): number {
  return flower.growHours * 3600_000;
}

/** Coste de una semilla: unos minutos de ingresos base, con un mínimo. */
export function seedCost(base: Decimal, content: Content): Decimal {
  return Decimal.max(D(content.garden.minSeedCost), base.mul(content.garden.seedSeconds)).ceil();
}
