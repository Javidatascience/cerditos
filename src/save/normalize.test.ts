import { describe, expect, it } from 'vitest';
import { D } from '../core/num.ts';
import { createInitialState } from '../core/state.ts';
import type { Content, WorldDef } from '../content/types.ts';
import { normalize } from './normalize.ts';

function world(overrides: Partial<WorldDef> = {}): WorldDef {
  return {
    id: 'w1',
    name: 'Mundo 1',
    currency: 'Monedas',
    prestigeCurrency: 'Plumas',
    mechanic: 'classic',
    costGrowth: 1.15,
    startCurrency: 10,
    generators: [{ id: 'g1', name: 'G1', flavor: 'f', baseCost: 10, baseProd: 1 }],
    genUpgrades: null,
    globalUpgrades: [],
    prestige: { e0: 100, exponent: 0.5, perPluma: 0.05 },
    unlock: null,
    flavor: 'f',
    ...overrides,
  };
}

function content(w: WorldDef): Content {
  return { worlds: [w], perks: [], varieties: [], sets: [], achievements: [] };
}

describe('normalize', () => {
  it('un cerdito nuevo en el contenido aparece en el estado con 0', () => {
    const original = content(world());
    const state = createInitialState(original, 0);

    const withExtraGen = content(
      world({ generators: [...original.worlds[0]!.generators, { id: 'g2', name: 'G2', flavor: 'f', baseCost: 20, baseProd: 2 }] }),
    );
    const normalized = normalize(state, withExtraGen);

    expect(normalized.worlds['w1']!.generators['g2']).toBeDefined();
    expect(normalized.worlds['w1']!.generators['g2']!.bought).toBe(0);
    expect(normalized.worlds['w1']!.generators['g2']!.owned.toNumber()).toBe(0);
    expect(normalized.worlds['w1']!.records.maxBought['g2']).toBe(0);
    // El cerdito que ya existía no se toca.
    expect(normalized.worlds['w1']!.generators['g1']).toBeDefined();
  });

  it('un cerdito eliminado del contenido desaparece del estado sin error', () => {
    const original = content(world());
    const state = createInitialState(original, 0);
    state.worlds['w1']!.generators['g1']!.bought = 5;

    const withoutGen = content(world({ generators: [] }));
    expect(() => normalize(state, withoutGen)).not.toThrow();
    const normalized = normalize(state, withoutGen);

    expect(normalized.worlds['w1']!.generators['g1']).toBeUndefined();
    expect(normalized.worlds['w1']!.records.maxBought['g1']).toBeUndefined();
  });

  it('un mundo nuevo en el contenido aparece fresco en el estado', () => {
    const w1 = world();
    const state = createInitialState(content(w1), 0);
    const w2 = world({ id: 'w2', name: 'Mundo 2', unlock: { world: 'w1', plumasTotal: 10 } });
    const normalized = normalize(state, { worlds: [w1, w2], perks: [], varieties: [], sets: [], achievements: [] });

    expect(normalized.worlds['w2']).toBeDefined();
    expect(normalized.worlds['w2']!.unlocked).toBe(false);
  });

  it('un mundo eliminado del contenido desaparece del estado', () => {
    const w1 = world();
    const state = createInitialState(content(w1), 0);
    const normalized = normalize(state, { worlds: [], perks: [], varieties: [], sets: [], achievements: [] });
    expect(normalized.worlds['w1']).toBeUndefined();
  });

  it('una mejora que ya no existe en el contenido se descarta', () => {
    const w1 = world({ globalUpgrades: [{ id: 'up1', name: 'Up1', flavor: 'f', cost: 100, mult: 1.5 }] });
    const state = createInitialState(content(w1), 0);
    state.worlds['w1']!.upgrades['up1'] = true;
    state.worlds['w1']!.upgrades['fantasma'] = true;

    const normalized = normalize(state, content(w1));
    expect(normalized.worlds['w1']!.upgrades['up1']).toBe(true);
    expect(normalized.worlds['w1']!.upgrades['fantasma']).toBeUndefined();
  });

  it('activeWorld se corrige si apuntaba a un mundo que ya no existe', () => {
    const w1 = world();
    const state = createInitialState(content(w1), 0);
    state.activeWorld = 'fantasma';
    const normalized = normalize(state, content(w1));
    expect(normalized.activeWorld).toBe('w1');
  });

  it('una variedad de colección que ya no existe se descarta', () => {
    const w1 = world();
    const state = createInitialState(content(w1), 0);
    state.collection['variedad-vieja'] = { adoptedAt: 1 };
    const normalized = normalize(state, content(w1));
    expect(normalized.collection['variedad-vieja']).toBeUndefined();
  });

  it('es seguro llamarlo varias veces seguidas (idempotente)', () => {
    const w1 = world();
    const state = createInitialState(content(w1), 0);
    state.worlds['w1']!.currency = D(42);
    normalize(state, content(w1));
    normalize(state, content(w1));
    expect(state.worlds['w1']!.currency.toNumber()).toBe(42);
  });
});
