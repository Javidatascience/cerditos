import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content/index.ts';
import { buyRow, rowBundleCost } from '../actions.ts';
import { greedyBuy } from '../greedy.ts';
import { globalMultiplier } from '../formulas.ts';
import { D } from '../num.ts';
import { harmonyView } from '../selectors.ts';
import { createInitialState, type GameState } from '../state.ts';
import { harmonyLevel, harmonyMultiplier, lowestGenerators, nextHarmonyThreshold } from './harmony.ts';

const WORLD = CONTENT.worlds.find((w) => w.id === 'huerta')!;

function huertaState(owned: number[]): GameState {
  const state = createInitialState(CONTENT, 0);
  const ws = state.worlds['huerta']!;
  ws.unlocked = true;
  ws.currency = D(1e12);
  WORLD.generators.forEach((gen, k) => {
    ws.generators[gen.id]!.owned = D(owned[k] ?? 0);
    ws.generators[gen.id]!.bought = owned[k] ?? 0;
  });
  return state;
}

describe('armonía (Huerta)', () => {
  it('con un cerdito a 0 hay 0 filas', () => {
    const state = huertaState([50, 50, 50, 50, 50, 50, 50, 0]);
    expect(harmonyLevel(WORLD, state.worlds['huerta']!)).toBe(0);
  });

  it('las filas son el mínimo entre los 8 cerditos', () => {
    const state = huertaState([30, 12, 40, 25, 99, 13, 50, 14]);
    expect(harmonyLevel(WORLD, state.worlds['huerta']!)).toBe(12);
  });

  it('+2 % por fila y ×2 en cada umbral', () => {
    expect(harmonyMultiplier(WORLD, 0)).toBe(1);
    expect(harmonyMultiplier(WORLD, 9)).toBeCloseTo(1.18, 9);
    expect(harmonyMultiplier(WORLD, 10)).toBeCloseTo(1.2 * 2, 9);
    expect(harmonyMultiplier(WORLD, 25)).toBeCloseTo(1.5 * 4, 9);
    expect(harmonyMultiplier(WORLD, 400)).toBeCloseTo(9 * 2 ** 10, 9);
  });

  it('siguiente umbral', () => {
    expect(nextHarmonyThreshold(WORLD, 0)).toBe(10);
    expect(nextHarmonyThreshold(WORLD, 10)).toBe(25);
    expect(nextHarmonyThreshold(WORLD, 400)).toBeNull();
  });

  it('entra en el multiplicador global de la Huerta', () => {
    const low = huertaState([9, 9, 9, 9, 9, 9, 9, 9]);
    const high = huertaState([10, 10, 10, 10, 10, 10, 10, 10]);
    const ratio = globalMultiplier(high, CONTENT, 'huerta') / globalMultiplier(low, CONTENT, 'huerta');
    expect(ratio).toBeCloseTo(harmonyMultiplier(WORLD, 10) / harmonyMultiplier(WORLD, 9), 9);
  });

  it('lowestGenerators y paquete de fila: una unidad de cada cerdito en el mínimo', () => {
    const state = huertaState([5, 6, 5, 7, 5, 8, 9, 5]);
    expect(lowestGenerators(WORLD, state.worlds['huerta']!)).toEqual(['hortelana', 'escardadora', 'pastora-de-gallinas', 'abuelo-del-huerto']);
    const { genIds, cost } = rowBundleCost(state, CONTENT, 'huerta');
    expect(genIds.length).toBe(4);
    const before = state.worlds['huerta']!.currency;
    expect(buyRow(state, CONTENT, 'huerta')).toBe(true);
    expect(before.sub(state.worlds['huerta']!.currency).toNumber()).toBeCloseTo(cost.toNumber(), -1);
    expect(state.worlds['huerta']!.generators['hortelana']!.owned.toNumber()).toBe(6);
    expect(state.worlds['huerta']!.generators['regador']!.owned.toNumber()).toBe(6);
  });

  it('Completar fila es todo o nada y actualiza maxHarmony', () => {
    const state = huertaState([5, 5, 5, 5, 5, 5, 5, 5]);
    const ws = state.worlds['huerta']!;
    ws.currency = D(1);
    expect(buyRow(state, CONTENT, 'huerta')).toBe(false);
    expect(ws.generators['hortelana']!.owned.toNumber()).toBe(5);
    ws.currency = D(1e12);
    expect(buyRow(state, CONTENT, 'huerta')).toBe(true);
    expect(ws.records.maxHarmony).toBe(6);
    expect(harmonyView(state, CONTENT, 'huerta')!.rows).toBe(6);
  });

  it('la autocompra reparte compras: nunca deja un cerdito a 0 con mucho dinero', () => {
    const state = huertaState([0, 0, 0, 0, 0, 0, 0, 0]);
    state.worlds['huerta']!.currency = D(1e9);
    greedyBuy(state, CONTENT, 'huerta', true, false);
    expect(harmonyLevel(WORLD, state.worlds['huerta']!)).toBeGreaterThan(0);
  });

  it('harmonyView es null fuera de la Huerta', () => {
    expect(harmonyView(createInitialState(CONTENT, 0), CONTENT, 'valle')).toBeNull();
  });
});
