import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { D, Decimal } from '../core/num.ts';
import { createInitialState } from '../core/state.ts';
import { deserialize, serialize } from './serialize.ts';

function decimalsEqual(a: Decimal, b: Decimal): boolean {
  return a.eq(b);
}

describe('serialize / deserialize', () => {
  it('ida y vuelta de una partida nueva es idéntica', () => {
    const state = createInitialState(CONTENT, 123);
    const roundTripped = deserialize(serialize(state, 456));
    expect(roundTripped.version).toBe(state.version);
    expect(roundTripped.createdAt).toBe(state.createdAt);
    expect(roundTripped.activeWorld).toBe(state.activeWorld);
    for (const worldId of Object.keys(state.worlds)) {
      expect(decimalsEqual(roundTripped.worlds[worldId]!.currency, state.worlds[worldId]!.currency)).toBe(true);
    }
  });

  it('conserva números Decimal enormes (1e300)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D('1e300');
    const roundTripped = deserialize(serialize(state, 0));
    expect(roundTripped.worlds['valle']!.currency.toString()).toBe(D('1e300').toString());
  });

  it('conserva números Decimal gigantescos (1e1000, fuera de rango de number)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.lifetimeEarned = D('1e1000');
    const roundTripped = deserialize(serialize(state, 0));
    expect(roundTripped.worlds['valle']!.lifetimeEarned.toString()).toBe(D('1e1000').toString());
  });

  it('conserva cerditos comprados, mejoras, plumas y ventajas', () => {
    const state = createInitialState(CONTENT, 0);
    const world = state.worlds['valle']!;
    world.generators['lechon']!.bought = 7;
    world.generators['lechon']!.owned = world.generators['lechon']!.owned.add(7);
    world.upgrades['lechon-u0'] = true;
    world.plumas = D(12);
    world.plumasTotal = D(34);
    world.perks['valle.abono'] = 3;
    world.ascensions = 2;
    world.records.maxBought['lechon'] = 7;

    const roundTripped = deserialize(serialize(state, 0));
    const w = roundTripped.worlds['valle']!;
    expect(w.generators['lechon']!.bought).toBe(7);
    expect(decimalsEqual(w.generators['lechon']!.owned, D(7))).toBe(true);
    expect(w.upgrades['lechon-u0']).toBe(true);
    expect(decimalsEqual(w.plumas, D(12))).toBe(true);
    expect(decimalsEqual(w.plumasTotal, D(34))).toBe(true);
    expect(w.perks['valle.abono']).toBe(3);
    expect(w.ascensions).toBe(2);
    expect(w.records.maxBought['lechon']).toBe(7);
  });

  it('conserva el diario y la colección', () => {
    const state = createInitialState(CONTENT, 0);
    state.journal.push({ at: 111, text: 'hola' });
    state.collection['lechon-manchado'] = { adoptedAt: 222 };

    const roundTripped = deserialize(serialize(state, 0));
    expect(roundTripped.journal).toEqual([{ at: 111, text: 'hola' }]);
    expect(roundTripped.collection['lechon-manchado']).toEqual({ adoptedAt: 222 });
  });

  it('no comparte referencias mutables con el original (copia profunda de lo serializable)', () => {
    const state = createInitialState(CONTENT, 0);
    const roundTripped = deserialize(serialize(state, 0));
    roundTripped.journal.push({ at: 1, text: 'x' });
    expect(state.journal.length).toBe(0);
  });
});
