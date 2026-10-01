import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { ascend, buyGenerator, buyUpgrade } from './actions.ts';
import { plumasPending } from './formulas.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

function stateWithLifetime(amount: number) {
  const state = createInitialState(CONTENT, 0);
  const world = state.worlds['valle']!;
  world.lifetimeEarned = world.lifetimeEarned.add(amount);
  world.currency = world.currency.add(amount);
  return state;
}

describe('ascend', () => {
  it('no se puede ascender con 0 plumas pendientes', () => {
    const state = createInitialState(CONTENT, 0);
    expect(plumasPending(state, CONTENT, 'valle')).toBe(0);
    const gain = ascend(state, CONTENT, 'valle', 0);
    expect(gain).toBe(0);
    expect(state.worlds['valle']!.ascensions).toBe(0);
  });

  it('da exactamente las plumas pendientes y las suma a plumas y plumasTotal', () => {
    const state = stateWithLifetime(1e10); // (1e10/2e5)^(1/3) ≈ 36.8 → 36 plumas
    const pending = plumasPending(state, CONTENT, 'valle');
    expect(pending).toBeGreaterThan(0);
    const gain = ascend(state, CONTENT, 'valle', 0);
    expect(gain).toBe(pending);
    expect(state.worlds['valle']!.plumas.toNumber()).toBe(pending);
    expect(state.worlds['valle']!.plumasTotal.toNumber()).toBe(pending);
  });

  it('reinicia moneda, cerditos, mejoras, runEarned y runSeconds', () => {
    const state = stateWithLifetime(1e10);
    const world = state.worlds['valle']!;
    buyGenerator(state, CONTENT, 'valle', 'lechon', 10);
    world.generators['lechon']!.bought = 10; // asegurar el umbral de la mejora
    buyUpgrade(state, CONTENT, 'valle', 'lechon-u0');
    world.runSeconds = 1234;

    ascend(state, CONTENT, 'valle', 0);

    expect(world.currency.toNumber()).toBe(15); // startCurrency, sin ventajas todavía
    expect(world.runEarned.toNumber()).toBe(0);
    expect(world.runSeconds).toBe(0);
    for (const gen of Object.values(world.generators)) {
      expect(gen.bought).toBe(0);
      expect(gen.owned.toNumber()).toBe(0);
    }
    expect(Object.keys(world.upgrades).length).toBe(0);
  });

  it('conserva plumas, ventajas, colección, diario y lo ganado en la vida', () => {
    const state = stateWithLifetime(1e10);
    const world = state.worlds['valle']!;
    const lifetimeBefore = world.lifetimeEarned.toNumber();
    state.collection['lechon-manchado'] = { adoptedAt: 1 };

    const gain = ascend(state, CONTENT, 'valle', 999);

    expect(world.lifetimeEarned.toNumber()).toBe(lifetimeBefore); // nunca se reinicia
    expect(state.collection['lechon-manchado']).toEqual({ adoptedAt: 1 });
    expect(state.journal.length).toBeGreaterThan(0);
    expect(state.journal[state.journal.length - 1]!.at).toBe(999);
    expect(gain).toBeGreaterThan(0);
  });

  it('no toca otros mundos', () => {
    const state = stateWithLifetime(1e10);
    const bosqueBefore = state.worlds['bosque']!.plumasTotal.toNumber();
    ascend(state, CONTENT, 'valle', 0);
    expect(state.worlds['bosque']!.plumasTotal.toNumber()).toBe(bosqueBefore);
  });

  it('plumasTotal nunca disminuye tras varias ascensiones', () => {
    const state = createInitialState(CONTENT, 0);
    const world = state.worlds['valle']!;
    let lastTotal = 0;
    for (let i = 0; i < 5; i++) {
      world.lifetimeEarned = world.lifetimeEarned.add(1e9 * (i + 1));
      ascend(state, CONTENT, 'valle', 0);
      const total = world.plumasTotal.toNumber();
      expect(total).toBeGreaterThanOrEqual(lastTotal);
      lastTotal = total;
    }
  });

  it('incrementa el contador de ascensiones', () => {
    const state = stateWithLifetime(1e10);
    ascend(state, CONTENT, 'valle', 0);
    expect(state.worlds['valle']!.ascensions).toBe(1);
  });

  it('con Buen comienzo, la moneda inicial tras ascender es mayor', () => {
    const state = stateWithLifetime(1e12); // suficientes plumas para comprar Buen comienzo
    ascend(state, CONTENT, 'valle', 0);
    const world = state.worlds['valle']!;
    world.perks['valle.abono'] = 1;
    world.perks['valle.comienzo'] = 2; // ×25^2 = 625
    world.lifetimeEarned = world.lifetimeEarned.add(1e12);
    ascend(state, CONTENT, 'valle', 0);
    expect(world.currency.toNumber()).toBe(15 * 25 ** 2);
  });
});
