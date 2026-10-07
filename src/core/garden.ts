// Fórmulas del Jardín (solo lectura; plantar y recoger mutan en actions.ts).
// Los bonos de las flores son temporales: `garden.buffs[flor]` guarda el instante (en `state.time`)
// en que terminan. En `advance` se aplican con el valor del inicio de cada paso (pasos de 250 ms
// o 15 s offline), así que el borde del bono puede desviarse unos segundos como mucho.

import type { Content, GardenEffect } from '../content/types.ts';
import { perkProductOf, perkSumMax, perkSumOf } from './perkEffects.ts';
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

/** Se abre al conseguir cierto número de plumas en total (no se gastan: cuenta el histórico). */
export function gardenUnlocked(state: GameState, content: Content): boolean {
  return state.plumasTotal.gte(content.garden.unlockPlumas);
}

/** Una flor se puede plantar si no nace de un cruce o ya se recogió alguna vez. */
export function flowerAvailable(state: GameState, content: Content, index: number): boolean {
  const flower = content.garden.flowers[index];
  return flower !== undefined && (flower.recipe === null || state.garden.found[flower.id] !== undefined);
}

/** Tiempo de crecimiento de una flor en ms, con las ventajas del árbol (Tierra buena). */
export function growMs(state: GameState, content: Content, flower: { growSeconds: number }): number {
  return flower.growSeconds * 1000 * perkProductOf(state, content, 'gardenGrowth');
}

/** Filas de casillas del jardín: las de base más las que dé Más tierra. */
export function gardenRows(state: GameState, content: Content): number {
  return content.garden.rows + Math.round(perkSumOf(state, content, 'gardenRows'));
}

/** Filas máximas que podría llegar a tener (todas las ventajas de Más tierra compradas), para dimensionar la UI y el guardado. */
export function gardenMaxRows(content: Content): number {
  return content.garden.rows + Math.round(perkSumMax(content, 'gardenRows'));
}

/** Probabilidad de cruce por casilla vacía y de flor brillante, y factor de duración de los bonos (con las ventajas). */
export function mutationChance(state: GameState, content: Content): number {
  return content.garden.mutationChance + perkSumOf(state, content, 'gardenMutation');
}

export function shinyChance(state: GameState, content: Content): number {
  return content.garden.shinyChance + perkSumOf(state, content, 'gardenShiny');
}

export function durationFactor(state: GameState, content: Content): number {
  return 1 + perkSumOf(state, content, 'gardenDuration');
}

/** Casillas vecinas (arriba, abajo, izquierda, derecha) de una casilla de la cuadrícula. */
export function neighbors(index: number, cols: number, rows: number): number[] {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const out: number[] = [];
  if (y > 0) out.push(index - cols);
  if (y < rows - 1) out.push(index + cols);
  if (x > 0) out.push(index - 1);
  if (x < cols - 1) out.push(index + 1);
  return out;
}

/** Número pseudoaleatorio determinista en [0,1) a partir de tres enteros (el cruce no usa Math.random: así es igual offline). */
export function rand01(a: number, b: number, c: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b) ^ Math.imul(c | 0, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967296;
}
