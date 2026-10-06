// Fórmulas del Jardín (solo lectura; plantar y recoger mutan en actions.ts).
// Los bonos de las flores son temporales: `garden.buffs[flor]` guarda el instante (en `state.time`)
// en que terminan. En `advance` se aplican con el valor del inicio de cada paso (pasos de 250 ms
// o 15 s offline), así que el borde del bono puede desviarse unos segundos como mucho.

import type { Content, GardenEffect } from '../content/types.ts';
import type { GameState } from './state.ts';

export function flowerActive(state: GameState, id: string): boolean {
  return (state.garden.buffs[id] ?? 0) > state.time;
}

function active(state: GameState, content: Content, kind: GardenEffect['kind']): number[] {
  return content.garden.flowers.filter((f) => f.effect.kind === kind && flowerActive(state, f.id)).map((f) => f.effect.value);
}

/** Producto de los bonos multiplicativos activos de ese tipo (1 si no hay). */
export function gardenProduct(state: GameState, content: Content, kind: GardenEffect['kind']): number {
  return active(state, content, kind).reduce((a, b) => a * b, 1);
}

/** Suma de los bonos aditivos activos de ese tipo. */
export function gardenSum(state: GameState, content: Content, kind: GardenEffect['kind']): number {
  return active(state, content, kind).reduce((a, b) => a + b, 0);
}

export function gardenUnlocked(state: GameState, content: Content): boolean {
  return state.lifetime.gte(content.garden.unlockLifetime);
}

/** Una flor se puede plantar si es la primera o ya se recogió la anterior. */
export function flowerAvailable(state: GameState, content: Content, index: number): boolean {
  return index === 0 || state.garden.found[content.garden.flowers[index - 1]!.id] !== undefined;
}

export function growMs(flower: { growHours: number }): number {
  return flower.growHours * 3600_000;
}
