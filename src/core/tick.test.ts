import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { createInitialState } from './state.ts';
import { advance } from './tick.ts';

function stateWithLechones(n: number) {
  const state = createInitialState(CONTENT, 0);
  const world = state.worlds['valle'];
  if (!world) throw new Error('mundo valle no existe');
  const gen = world.generators['lechon'];
  if (!gen) throw new Error('generador lechon no existe');
  gen.bought = n;
  gen.owned = gen.owned.add(n);
  return state;
}

describe('advance', () => {
  it('suma producción·dt a currency, runEarned y lifetimeEarned', () => {
    const state = stateWithLechones(10); // 10 lechones × 0.5/s = 5/s
    const before = state.worlds['valle']!.currency.toNumber();
    advance(state, CONTENT, 4);
    const world = state.worlds['valle']!;
    expect(world.currency.toNumber()).toBeCloseTo(before + 20, 6);
    expect(world.runEarned.toNumber()).toBeCloseTo(20, 6);
    expect(world.lifetimeEarned.toNumber()).toBeCloseTo(20, 6);
    expect(world.runSeconds).toBeCloseTo(4, 6);
  });

  it('avanza el reloj interno de juego', () => {
    const state = createInitialState(CONTENT, 0);
    advance(state, CONTENT, 12.5);
    expect(state.time).toBeCloseTo(12.5, 6);
  });

  it('advance(dt=10) equivale a acumular 10× advance(dt=1) (sin compras de por medio)', () => {
    const a = stateWithLechones(10);
    const b = stateWithLechones(10);
    advance(a, CONTENT, 10);
    for (let i = 0; i < 10; i++) advance(b, CONTENT, 1);
    expect(a.worlds['valle']!.currency.toNumber()).toBeCloseTo(b.worlds['valle']!.currency.toNumber(), 6);
    expect(a.worlds['valle']!.lifetimeEarned.toNumber()).toBeCloseTo(b.worlds['valle']!.lifetimeEarned.toNumber(), 6);
  });

  it('no toca mundos bloqueados', () => {
    const state = createInitialState(CONTENT, 0);
    // El Valle es el único mundo del contenido del hito 1 (empieza desbloqueado, con su
    // moneda inicial de 03 §8); comprobamos que si se marca como bloqueado, advance no
    // le añade nada más.
    const world = state.worlds['valle']!;
    world.unlocked = false;
    const currencyBefore = world.currency.toNumber();
    advance(state, CONTENT, 100);
    expect(world.currency.toNumber()).toBe(currencyBefore);
    expect(world.lifetimeEarned.toNumber()).toBe(0);
  });

  it('dt <= 0 no hace nada', () => {
    const state = stateWithLechones(5);
    const before = state.worlds['valle']!.currency.toNumber();
    advance(state, CONTENT, 0);
    advance(state, CONTENT, -1);
    expect(state.worlds['valle']!.currency.toNumber()).toBe(before);
    expect(state.time).toBe(0);
  });
});
