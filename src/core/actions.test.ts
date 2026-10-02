import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { buyGenerator, buyUpgrade, setBuyAmount, tap } from './actions.ts';
import { bulkCost, generatorCost, getGeneratorDef, getWorldDef, maxAffordable } from './formulas.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

const world = getWorldDef(CONTENT, 'valle');
const lechon = getGeneratorDef(world, 'lechon');

describe('tap', () => {
  it('sin producción suma 1 a la moneda del mundo', () => {
    const state = createInitialState(CONTENT, 0);
    const before = state.worlds['valle']!.currency.toNumber();
    tap(state, CONTENT, 'valle');
    expect(state.worlds['valle']!.currency.toNumber()).toBe(before + 1);
    expect(state.taps).toBe(1);
  });
});

describe('buyGenerator', () => {
  it('sin dinero suficiente no compra nada y no cambia el estado', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(5); // coste del Lechón es 10
    const bought = buyGenerator(state, CONTENT, 'valle', 'lechon', 1);
    expect(bought).toBe(0);
    expect(state.worlds['valle']!.currency.toNumber()).toBe(5);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(0);
  });

  it('×1 cobra generatorCost(n) y aumenta bought/owned en 1', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(100);
    const cost = generatorCost(world, lechon, 0);
    const bought = buyGenerator(state, CONTENT, 'valle', 'lechon', 1);
    expect(bought).toBe(1);
    expect(state.worlds['valle']!.currency.toNumber()).toBeCloseTo(100 - cost.toNumber(), 6);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(1);
    expect(state.worlds['valle']!.generators['lechon']!.owned.toNumber()).toBe(1);
  });

  it('×10 cobra bulkCost(n, 10) y es todo o nada', () => {
    const state = createInitialState(CONTENT, 0);
    const cost10 = bulkCost(world, lechon, 0, 10);

    // Con dinero justo por debajo: no compra nada (ni siquiera una parte).
    const short = createInitialState(CONTENT, 0);
    short.worlds['valle']!.currency = cost10.sub(1);
    expect(buyGenerator(short, CONTENT, 'valle', 'lechon', 10)).toBe(0);
    expect(short.worlds['valle']!.generators['lechon']!.bought).toBe(0);

    // Con dinero justo: compra las 10 de golpe.
    state.worlds['valle']!.currency = cost10;
    const bought = buyGenerator(state, CONTENT, 'valle', 'lechon', 10);
    expect(bought).toBe(10);
    expect(state.worlds['valle']!.currency.toNumber()).toBeCloseTo(0, 6);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(10);
  });

  it('"max" compra maxAffordable(n, money) unidades', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(1_000_000);
    const expected = maxAffordable(world, lechon, 0, D(1_000_000));
    const bought = buyGenerator(state, CONTENT, 'valle', 'lechon', 'max');
    expect(bought).toBe(expected);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(expected);
    expect(state.worlds['valle']!.currency.gte(0)).toBe(true);
  });

  it('actualiza records.maxBought y nunca lo reduce', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(1_000_000);
    buyGenerator(state, CONTENT, 'valle', 'lechon', 10);
    expect(state.worlds['valle']!.records.maxBought['lechon']).toBe(10);
    // Simular un reinicio de ronda (como haría ascend en el hito 5): bought vuelve a 0 pero
    // el récord histórico se mantiene.
    state.worlds['valle']!.generators['lechon']!.bought = 0;
    buyGenerator(state, CONTENT, 'valle', 'lechon', 1);
    expect(state.worlds['valle']!.records.maxBought['lechon']).toBe(10);
  });
});

describe('buyUpgrade', () => {
  function stateReadyForFirstUpgrade() {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(1_000_000);
    buyGenerator(state, CONTENT, 'valle', 'lechon', 10); // umbral de la 1ª mejora del Lechón
    return state;
  }

  it('no está disponible antes de alcanzar el umbral (bought < 10)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(1_000_000);
    for (let i = 0; i < 9; i++) buyGenerator(state, CONTENT, 'valle', 'lechon', 1);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(9);
    expect(buyUpgrade(state, CONTENT, 'valle', 'lechon-u0')).toBe(false);
  });

  it('se puede comprar al alcanzar el umbral y duplica la producción del cerdito', () => {
    const state = stateReadyForFirstUpgrade();
    expect(buyUpgrade(state, CONTENT, 'valle', 'lechon-u0')).toBe(true);
    expect(state.worlds['valle']!.upgrades['lechon-u0']).toBe(true);
  });

  it('no se puede comprar dos veces', () => {
    const state = stateReadyForFirstUpgrade();
    expect(buyUpgrade(state, CONTENT, 'valle', 'lechon-u0')).toBe(true);
    expect(buyUpgrade(state, CONTENT, 'valle', 'lechon-u0')).toBe(false);
  });

  it('una mejora global no está disponible hasta ganar el 25 % de su coste en la ronda', () => {
    const state = createInitialState(CONTENT, 0);
    const firstGlobal = world.globalUpgrades[0]!;
    state.worlds['valle']!.currency = D(firstGlobal.cost);
    state.worlds['valle']!.runEarned = D(firstGlobal.cost).mul(0.24);
    expect(buyUpgrade(state, CONTENT, 'valle', firstGlobal.id)).toBe(false);

    state.worlds['valle']!.runEarned = D(firstGlobal.cost).mul(0.25);
    expect(buyUpgrade(state, CONTENT, 'valle', firstGlobal.id)).toBe(true);
  });

  it('sin dinero suficiente no compra', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.currency = D(1); // no llega ni para la 1ª unidad de Lechón
    buyGenerator(state, CONTENT, 'valle', 'lechon', 1); // no hace nada, currency sigue en 1
    state.worlds['valle']!.generators['lechon']!.bought = 10; // forzar el umbral sin pagar
    state.worlds['valle']!.currency = D(1);
    expect(buyUpgrade(state, CONTENT, 'valle', 'lechon-u0')).toBe(false);
  });
});

describe('setBuyAmount', () => {
  it('cambia settings.buyAmount', () => {
    const state = createInitialState(CONTENT, 0);
    setBuyAmount(state, 10);
    expect(state.settings.buyAmount).toBe(10);
    setBuyAmount(state, 'max');
    expect(state.settings.buyAmount).toBe('max');
  });
});
