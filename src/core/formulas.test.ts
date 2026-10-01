import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import {
  availableUpgrades,
  bulkCost,
  generatorCost,
  generatorMultiplier,
  generatorUpgradeId,
  getGeneratorDef,
  getWorldDef,
  globalMultiplier,
  maxAffordable,
  productionPerSecond,
} from './formulas.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

const world = getWorldDef(CONTENT, 'valle');
const lechon = getGeneratorDef(world, 'lechon');

describe('generatorCost', () => {
  it('coste de la unidad 0 es el coste base', () => {
    expect(generatorCost(world, lechon, 0).toNumber()).toBeCloseTo(10);
  });

  it('coste de la unidad 1 es base × r', () => {
    expect(generatorCost(world, lechon, 1).toNumber()).toBeCloseTo(10 * 1.15);
  });

  it('coste de la unidad 10 es base × r^10', () => {
    expect(generatorCost(world, lechon, 10).toNumber()).toBeCloseTo(10 * 1.15 ** 10);
  });
});

describe('bulkCost', () => {
  it('comprar 0 unidades no cuesta nada', () => {
    expect(bulkCost(world, lechon, 5, 0).toNumber()).toBe(0);
  });

  it('es la suma de los costes unitarios', () => {
    let expected = 0;
    for (let i = 0; i < 5; i++) expected += 10 * 1.15 ** i;
    expect(bulkCost(world, lechon, 0, 5).toNumber()).toBeCloseTo(expected, 6);
  });

  it('comprar k unidades a partir de n coincide con la suma de generatorCost(n..n+k-1)', () => {
    const n = 3;
    const k = 4;
    let expected = 0;
    for (let i = n; i < n + k; i++) expected += generatorCost(world, lechon, i).toNumber();
    expect(bulkCost(world, lechon, n, k).toNumber()).toBeCloseTo(expected, 4);
  });
});

describe('maxAffordable', () => {
  it('con 0 dinero no se puede comprar nada', () => {
    expect(maxAffordable(world, lechon, 0, D(0))).toBe(0);
  });

  it('con dinero justo para 1 unidad compra exactamente 1', () => {
    expect(maxAffordable(world, lechon, 0, D(10))).toBe(1);
  });

  it('con dinero justo por debajo del coste no compra nada', () => {
    expect(maxAffordable(world, lechon, 0, D(9.99))).toBe(0);
  });

  it('con mucho dinero compra muchas unidades y su coste total es asequible', () => {
    const money = D(1_000_000);
    const n = maxAffordable(world, lechon, 0, money);
    expect(n).toBeGreaterThan(50);
    expect(bulkCost(world, lechon, 0, n).lte(money)).toBe(true);
    expect(bulkCost(world, lechon, 0, n + 1).gt(money)).toBe(true);
  });
});

describe('generatorMultiplier', () => {
  it('es 1 sin mejoras compradas', () => {
    const state = createInitialState(CONTENT, 0);
    expect(generatorMultiplier(world, state.worlds['valle']!, lechon)).toBe(1);
  });

  it('con 2 mejoras del Lechón compradas su producción es ×4 (2^2)', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    worldState.upgrades[generatorUpgradeId('lechon', 0)] = true;
    worldState.upgrades[generatorUpgradeId('lechon', 1)] = true;
    expect(generatorMultiplier(world, worldState, lechon)).toBeCloseTo(4);
  });

  it('las mejoras de otro cerdito no afectan', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    worldState.upgrades[generatorUpgradeId('cerdita-rosa', 0)] = true;
    expect(generatorMultiplier(world, worldState, lechon)).toBe(1);
  });
});

describe('globalMultiplier', () => {
  it('es 1 sin mejoras globales compradas', () => {
    const state = createInitialState(CONTENT, 0);
    expect(globalMultiplier(state, CONTENT, 'valle')).toBe(1);
  });

  it('una mejora global ×1,5 multiplica todo el mundo', () => {
    const state = createInitialState(CONTENT, 0);
    const upgrade = world.globalUpgrades[0]!;
    state.worlds['valle']!.upgrades[upgrade.id] = true;
    expect(globalMultiplier(state, CONTENT, 'valle')).toBeCloseTo(upgrade.mult);
  });

  it('dos mejoras globales se multiplican entre sí', () => {
    const state = createInitialState(CONTENT, 0);
    const [u0, u1] = world.globalUpgrades;
    state.worlds['valle']!.upgrades[u0!.id] = true;
    state.worlds['valle']!.upgrades[u1!.id] = true;
    expect(globalMultiplier(state, CONTENT, 'valle')).toBeCloseTo(u0!.mult * u1!.mult);
  });
});

describe('productionPerSecond', () => {
  it('combina generatorMultiplier y globalMultiplier (03 §3.1)', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    worldState.generators['lechon']!.owned = D(10);
    worldState.upgrades[generatorUpgradeId('lechon', 0)] = true; // ×2
    worldState.upgrades[world.globalUpgrades[0]!.id] = true; // ×1,5
    const expected = 10 * lechon.baseProd * 2 * world.globalUpgrades[0]!.mult;
    expect(productionPerSecond(state, CONTENT, 'valle').toNumber()).toBeCloseTo(expected, 6);
  });
});

describe('availableUpgrades', () => {
  it('una mejora por cerdito solo aparece al alcanzar su umbral', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    worldState.generators['lechon']!.bought = 9;
    expect(availableUpgrades(state, CONTENT, 'valle').some((o) => o.id === generatorUpgradeId('lechon', 0))).toBe(false);
    worldState.generators['lechon']!.bought = 10;
    expect(availableUpgrades(state, CONTENT, 'valle').some((o) => o.id === generatorUpgradeId('lechon', 0))).toBe(true);
  });

  it('una mejora ya comprada no vuelve a aparecer', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    worldState.generators['lechon']!.bought = 10;
    worldState.upgrades[generatorUpgradeId('lechon', 0)] = true;
    expect(availableUpgrades(state, CONTENT, 'valle').some((o) => o.id === generatorUpgradeId('lechon', 0))).toBe(false);
  });

  it('una mejora global aparece al ganar el 25 % de su coste en la ronda (03 §2)', () => {
    const state = createInitialState(CONTENT, 0);
    const worldState = state.worlds['valle']!;
    const upgrade = world.globalUpgrades[0]!;
    worldState.runEarned = D(upgrade.cost).mul(0.2);
    expect(availableUpgrades(state, CONTENT, 'valle').some((o) => o.id === upgrade.id)).toBe(false);
    worldState.runEarned = D(upgrade.cost).mul(0.25);
    expect(availableUpgrades(state, CONTENT, 'valle').some((o) => o.id === upgrade.id)).toBe(true);
  });
});
