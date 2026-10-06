import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { offlineCapSeconds } from './formulas.ts';
import { simulateOffline } from './offline.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

function fresh(): GameState {
  const state = createInitialState(CONTENT, 0);
  state.gear['rascador'] = 20;
  return state;
}

describe('simulateOffline', () => {
  it('una ausencia corta da lo mismo que avanzar esos segundos de una vez', () => {
    const viaOffline = fresh();
    const viaAdvance = fresh();
    const summary = simulateOffline(viaOffline, CONTENT, 3600);
    advance(viaAdvance, CONTENT, 3600);
    expect(viaOffline.depth).toBe(viaAdvance.depth);
    expect(viaOffline.coins.toNumber()).toBeCloseTo(viaAdvance.coins.toNumber(), 6);
    expect(summary.awaySeconds).toBe(3600);
    expect(summary.totalAwaySeconds).toBe(3600);
    expect(summary.coinsEarned.gt(0)).toBe(true);
    expect(summary.blocks).toBeGreaterThan(0);
  });

  it('solo produce durante las primeras 2 horas', () => {
    const long = fresh();
    const exact = fresh();
    const summary = simulateOffline(long, CONTENT, 60 * 24 * 3600);
    simulateOffline(exact, CONTENT, 2 * 3600);
    expect(summary.awaySeconds).toBe(2 * 3600);
    expect(summary.totalAwaySeconds).toBe(60 * 24 * 3600);
    expect(long.depth).toBe(exact.depth);
    expect(long.coins.toNumber()).toBeCloseTo(exact.coins.toNumber(), 3);
  });

  it('Siesta larga amplía el tope', () => {
    const state = fresh();
    expect(offlineCapSeconds(state, CONTENT)).toBe(2 * 3600);
    state.perks['abono'] = 1;
    state.perks['descanso'] = 3;
    expect(offlineCapSeconds(state, CONTENT)).toBe(5 * 3600);
  });

  it('una ausencia de 0 s o negativa (reloj atrasado) no hace nada', () => {
    const state = fresh();
    const before = state.coins.toNumber();
    expect(simulateOffline(state, CONTENT, 0).awaySeconds).toBe(0);
    expect(simulateOffline(state, CONTENT, -50).awaySeconds).toBe(0);
    expect(state.coins.toNumber()).toBe(before);
  });
});
