import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content/index.ts';
import { generatorMultiplierFn, globalMultiplier, productionPerSecond } from '../formulas.ts';
import { D } from '../num.ts';
import { createInitialState, type GameState } from '../state.ts';
import { advance } from '../tick.ts';
import { advanceChain } from './chain.ts';

const WORLD = CONTENT.worlds.find((w) => w.id === 'bosque')!;

function bosqueState(owned: number[]): GameState {
  const state = createInitialState(CONTENT, 0);
  const ws = state.worlds['bosque']!;
  ws.unlocked = true;
  WORLD.generators.forEach((gen, k) => (ws.generators[gen.id]!.owned = D(owned[k] ?? 0)));
  return state;
}

function ownedOf(state: GameState): number[] {
  return WORLD.generators.map((gen) => state.worlds['bosque']!.generators[gen.id]!.owned.toNumber());
}

describe('cadena (Bosque)', () => {
  it('con solo Buscadoras es lineal', () => {
    const state = bosqueState([10]);
    advance(state, CONTENT, 100);
    expect(state.worlds['bosque']!.currency.toNumber()).toBeCloseTo(1000, 6); // 10 · 1/s · 100 s
    expect(ownedOf(state)[0]).toBe(10);
  });

  it('valores conocidos a mano con 2 niveles: 10 Buscadoras + 100 Madres, 100 s', () => {
    // ρ0 = 1, ρ1 = 0,01. Buscadoras(100) = 10 + 100·0,01·100 = 110.
    // moneda = ρ0·(10·100 + 100·ρ1·100²/2) = 1000 + 100·0,01·5000 = 6000.
    const state = bosqueState([10, 100]);
    advance(state, CONTENT, 100);
    expect(ownedOf(state)[0]).toBeCloseTo(110, 9);
    expect(state.worlds['bosque']!.runEarned.toNumber()).toBeCloseTo(6000, 6);
  });

  it('un paso de 3600 s = 3600 pasos de 1 s (error relativo < 1e-9)', () => {
    const big = bosqueState([5, 40, 12, 6, 2]);
    const small = bosqueState([5, 40, 12, 6, 2]);
    advance(big, CONTENT, 3600);
    for (let i = 0; i < 3600; i++) advance(small, CONTENT, 1);
    const a = big.worlds['bosque']!.lifetimeEarned.toNumber();
    const b = small.worlds['bosque']!.lifetimeEarned.toNumber();
    expect(Math.abs(a - b) / b).toBeLessThan(1e-9);
    const ownedBig = ownedOf(big);
    ownedOf(small).forEach((v, k) => expect(Math.abs(ownedBig[k]! - v) / Math.max(1, v)).toBeLessThan(1e-9));
  });

  it('el multiplicador global solo afecta al nivel 0', () => {
    const state = bosqueState([1, 1]);
    const ws = state.worlds['bosque']!;
    const m = globalMultiplier(state, CONTENT, 'bosque');
    const gained = advanceChain(WORLD, ws, m, generatorMultiplierFn(WORLD, ws), 10);
    // moneda = ρ0 · (a0·Δ + a1·ρ1·Δ²/2), con ρ0 = m y ρ1 = 0,01
    expect(gained.toNumber()).toBeCloseTo(m * (10 + 0.01 * 50), 9);
  });

  it('productionPerSecond solo cuenta las Buscadoras', () => {
    const state = bosqueState([4, 1000]);
    expect(productionPerSecond(state, CONTENT, 'bosque').toNumber()).toBeCloseTo(4 * globalMultiplier(state, CONTENT, 'bosque'), 9);
  });
});
