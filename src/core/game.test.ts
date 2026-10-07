import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { ascend, buyPerk, buyTool, buyUpgrade, claimVisitor, collectBasket, tap, VISITOR_BOOST, VISITOR_INJECTION_SECONDS } from './actions.ts';
import { BASKET_CAP_SECONDS, BASKET_RATE, basketSeconds } from './basket.ts';
import {
  ascendUnlocked,
  baseIncomePerSecond,
  incomePerSecond,
  nextUpgradeCost,
  nextUpgradeThreshold,
  nextUpgradeUnlocked,
  upgradeMult,
  offlineCapSeconds,
  perkCost,
  plumasPending,
  startCoins,
  tapGain,
  toolBulkCost,
  toolProduction,
  unitProduction,
} from './formulas.ts';
import { simulateOffline } from './offline.ts';
import { D } from './num.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

const G = CONTENT.game;
const PICO = CONTENT.tools[0]!;
const ASCEND_TOOL = CONTENT.tools[G.ascendTool]!;

function fresh(): GameState {
  return createInitialState(CONTENT, 0);
}

describe('al empezar', () => {
  it('no hay ganancias, no hay monedas y solo se ve la primera herramienta', () => {
    const state = fresh();
    expect(state.coins.toNumber()).toBe(0);
    expect(incomePerSecond(state, CONTENT).toNumber()).toBe(0);
    expect(state.revealed).toBe(1);
  });

  it('picar da 1 moneda sin producción, y comprar el pico sube los ingresos a 0,1/s', () => {
    const state = fresh();
    for (let i = 0; i < 15; i++) expect(tap(state, CONTENT).toNumber()).toBe(1);
    expect(state.taps).toBe(15);
    expect(buyTool(state, CONTENT, PICO.id, 1)).toBe(1);
    expect(state.coins.toNumber()).toBe(0);
    expect(baseIncomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(0.1, 9);
    // y picar sube la inercia: 15 picos = 0,45 de barra
    expect(incomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(0.1 * (1 + (CONTENT.game.momentumMax - 1) * 0.45), 9);
  });
});

describe('herramientas', () => {
  it('el coste crece un 17 % por unidad y la compra en bloque suma los costes', () => {
    const state = fresh();
    const one = toolBulkCost(state, CONTENT, PICO, 0, 1).toNumber();
    const two = toolBulkCost(state, CONTENT, PICO, 1, 1).toNumber();
    expect(one).toBe(PICO.baseCost);
    expect(two / one).toBeCloseTo(G.costGrowth, 9);
    expect(toolBulkCost(state, CONTENT, PICO, 0, 2).toNumber()).toBeCloseTo(one + two, 9);
  });

  it('no compra sin dinero y nunca deja la moneda negativa', () => {
    const state = fresh();
    state.coins = D(5);
    expect(buyTool(state, CONTENT, PICO.id, 1)).toBe(0);
    state.coins = D(1e6);
    buyTool(state, CONTENT, PICO.id, 'max');
    expect(state.coins.gte(0)).toBe(true);
    expect(state.tools[PICO.id]).toBeGreaterThan(10);
  });

  it('×10 es todo o nada', () => {
    const state = fresh();
    state.coins = D(50);
    expect(buyTool(state, CONTENT, PICO.id, 10)).toBe(0);
    state.coins = D(1000);
    expect(buyTool(state, CONTENT, PICO.id, 10)).toBe(10);
  });

  it('al llegar a 5, 15, 25, 50… se desbloquea una mejora que hay que comprar (×2 de producción)', () => {
    const state = fresh();
    state.tools[PICO.id] = 4;
    expect(nextUpgradeThreshold(state, CONTENT, PICO.id)).toBe(5);
    expect(nextUpgradeUnlocked(state, CONTENT, PICO.id)).toBe(false);
    state.coins = D(1e12);
    expect(buyUpgrade(state, CONTENT, PICO.id)).toBe(false); // aún no se tienen 5
    state.tools[PICO.id] = 5;
    expect(nextUpgradeUnlocked(state, CONTENT, PICO.id)).toBe(true);
    // no se aplica sola: sin comprarla, la producción no cambia
    expect(unitProduction(state, CONTENT, PICO).toNumber()).toBeCloseTo(PICO.baseProd, 9);
    const cost = nextUpgradeCost(state, CONTENT, PICO)!;
    expect(cost.toNumber()).toBe(Math.ceil(PICO.baseCost * G.costGrowth ** 5 * G.upgradeCostFactor));
    const before = state.coins;
    expect(buyUpgrade(state, CONTENT, PICO.id)).toBe(true);
    expect(before.sub(state.coins).toNumber()).toBeCloseTo(cost.toNumber(), 3);
    expect(state.upgrades[PICO.id]).toBe(1);
    expect(unitProduction(state, CONTENT, PICO).toNumber()).toBeCloseTo(PICO.baseProd * 2, 9);
    expect(toolProduction(state, CONTENT, PICO).toNumber()).toBeCloseTo(PICO.baseProd * 2 * 5, 9);
    expect(nextUpgradeThreshold(state, CONTENT, PICO.id)).toBe(15);
  });

  it('las mejoras se compran en orden, piden monedas y se acaban', () => {
    const state = fresh();
    state.tools[PICO.id] = 1000;
    state.coins = D(0);
    expect(buyUpgrade(state, CONTENT, PICO.id)).toBe(false); // sin dinero
    state.coins = D('1e300');
    for (let i = 0; i < G.milestones.length; i++) expect(buyUpgrade(state, CONTENT, PICO.id)).toBe(true);
    expect(buyUpgrade(state, CONTENT, PICO.id)).toBe(false);
    expect(nextUpgradeThreshold(state, CONTENT, PICO.id)).toBeNull();
    expect(nextUpgradeCost(state, CONTENT, PICO)).toBeNull();
    expect(upgradeMult(CONTENT, G.milestones.length)).toBe(2 ** G.milestones.length);
  });

  it('cada herramienta se descubre al poder pagarla y no se vuelve a ocultar', () => {
    const state = fresh();
    state.coins = D(PICO.baseCost);
    buyTool(state, CONTENT, PICO.id, 1);
    expect(state.revealed).toBe(1);
    state.coins = D(CONTENT.tools[1]!.baseCost);
    advance(state, CONTENT, 1);
    expect(state.revealed).toBe(2);
    state.coins = D(0);
    advance(state, CONTENT, 1);
    expect(state.revealed).toBe(2);
  });
});

describe('tiempo', () => {
  it('un paso grande equivale a muchos pequeños', () => {
    const a = fresh();
    const b = fresh();
    a.tools[PICO.id] = 20;
    b.tools[PICO.id] = 20;
    advance(a, CONTENT, 3600);
    for (let i = 0; i < 3600; i++) advance(b, CONTENT, 1);
    expect(a.coins.toNumber()).toBeCloseTo(b.coins.toNumber(), 6);
    expect(a.lifetime.toNumber()).toBeCloseTo(a.coins.toNumber(), 6);
  });

  it('el impulso del visitante multiplica la producción y los picos solo mientras dura (integral exacta)', () => {
    const plain = fresh();
    const boosted = fresh();
    plain.tools[PICO.id] = 10;
    boosted.tools[PICO.id] = 10;
    claimVisitor(boosted, CONTENT, 'boost');
    expect(boosted.buff).toEqual({ mult: VISITOR_BOOST.mult, until: VISITOR_BOOST.seconds });
    advance(plain, CONTENT, 90);
    advance(boosted, CONTENT, 90); // el impulso dura VISITOR_BOOST.seconds y el resto va a ×1
    expect(boosted.coins.toNumber() / plain.coins.toNumber()).toBeCloseTo((VISITOR_BOOST.mult * VISITOR_BOOST.seconds + (90 - VISITOR_BOOST.seconds)) / 90, 9);
    expect(boosted.buff).toBeNull();

    const x = fresh();
    x.tools[PICO.id] = 10;
    const normal = tapGain(x, CONTENT).toNumber();
    claimVisitor(x, CONTENT, 'boost');
    expect(tapGain(x, CONTENT).toNumber()).toBeCloseTo(normal * VISITOR_BOOST.mult, 9);
  });

  it('un toque vale 1 s de producción cuando ya hay producción', () => {
    const state = fresh();
    state.tools[PICO.id] = 1000;
    expect(tapGain(state, CONTENT).toNumber()).toBeCloseTo(incomePerSecond(state, CONTENT).toNumber() * G.tapSeconds, 9);
  });
});

describe('ascender', () => {
  function ready(): GameState {
    const state = fresh();
    state.lifetime = D(1e9);
    state.coins = D(1e7);
    state.tools[PICO.id] = 40;
    state.maxOwned[PICO.id] = 40;
    state.tools[ASCEND_TOOL.id] = 1;
    state.maxOwned[ASCEND_TOOL.id] = 1;
    state.revealed = 8;
    return state;
  }

  it('hace falta haber llegado a la herramienta 8', () => {
    const state = ready();
    delete state.maxOwned[ASCEND_TOOL.id];
    expect(ascendUnlocked(state, CONTENT)).toBe(false);
    expect(ascend(state, CONTENT, 0)).toBe(0);
    state.maxOwned[ASCEND_TOOL.id] = 1;
    expect(ascendUnlocked(state, CONTENT)).toBe(true);
  });

  it('cobra plumas por lo ganado en la vida y reinicia la ronda', () => {
    const state = ready();
    const expected = Math.floor((1e9 / G.plumaE0) ** G.plumaExponent);
    expect(plumasPending(state, CONTENT)).toBe(expected);
    expect(ascend(state, CONTENT, 77)).toBe(expected);
    expect(state.plumas.toNumber()).toBe(expected);
    expect(state.plumasTotal.toNumber()).toBe(expected);
    expect(state.ascensions).toBe(1);
    expect(state.tools).toEqual({});
    expect(state.upgrades).toEqual({});
    expect(state.coins.toNumber()).toBe(G.startCoins);
    expect(state.lifetime.toNumber()).toBe(1e9); // lo ganado en la vida se conserva
    expect(state.maxOwned[ASCEND_TOOL.id]).toBe(1); // y el récord, así que sigue desbloqueado
    expect(state.journal.at(-1)).toMatchObject({ at: 77 });
  });

  it('no se puede cobrar dos veces lo mismo y las plumas nunca bajan', () => {
    const state = ready();
    ascend(state, CONTENT, 0);
    expect(plumasPending(state, CONTENT)).toBe(0);
    expect(ascend(state, CONTENT, 0)).toBe(0);
    const before = state.plumasTotal.toNumber();
    state.lifetime = D(1e12);
    expect(ascend(state, CONTENT, 0)).toBeGreaterThan(0);
    expect(state.plumasTotal.toNumber()).toBeGreaterThan(before);
  });

  it('las plumas multiplican la producción (+5 % cada una) y Buen comienzo da monedas', () => {
    const state = fresh();
    state.tools[PICO.id] = 10;
    const base = incomePerSecond(state, CONTENT).toNumber();
    state.plumasTotal = D(20);
    expect(incomePerSecond(state, CONTENT).toNumber() / base).toBeCloseTo(1 + G.perPluma * 20, 9);
    state.perks['abono'] = 1;
    state.perks['comienzo'] = 2;
    expect(startCoins(state, CONTENT).toNumber()).toBe(100 * (10 ** 2 - 1));
  });
});

describe('ventajas permanentes', () => {
  it('se compran con plumas respetando requisitos y máximo', () => {
    const state = fresh();
    state.plumas = D(1000);
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(false);
    const abono = CONTENT.perks.find((p) => p.id === 'abono')!;
    const cost = perkCost(abono, 0);
    expect(buyPerk(state, CONTENT, 'abono')).toBe(true);
    expect(state.plumas.toNumber()).toBe(1000 - cost.toNumber());
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(true);
    state.perks['comienzo'] = 5;
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(false);
  });

  it('Manos de acero multiplica cada pico y Regateo abarata las herramientas', () => {
    const state = fresh();
    const base = tapGain(state, CONTENT).toNumber();
    state.perks['manos'] = 2;
    expect(tapGain(state, CONTENT).toNumber()).toBeCloseTo(base * (1 + 1.5 * 2), 9);
    const cost = toolBulkCost(state, CONTENT, PICO, 0, 1).toNumber();
    state.perks['ahorro'] = 1;
    expect(toolBulkCost(state, CONTENT, PICO, 0, 1).toNumber()).toBeCloseTo(cost * 0.93, 9);
  });
});

describe('cesta y visitante', () => {
  it('la cesta se llena con el tiempo (con tope) y recoger la vacía', () => {
    const state = fresh();
    state.tools[PICO.id] = 30;
    advance(state, CONTENT, 100);
    expect(basketSeconds(state)).toBe(100);
    const expected = incomePerSecond(state, CONTENT).mul(100 * BASKET_RATE);
    const before = state.coins;
    const got = collectBasket(state, CONTENT);
    expect(got.toNumber()).toBeCloseTo(expected.toNumber(), 6);
    expect(state.coins.sub(before).toNumber()).toBeCloseTo(got.toNumber(), 6);
    expect(basketSeconds(state)).toBe(0);
    state.time += 10 * 3600;
    expect(basketSeconds(state)).toBe(BASKET_CAP_SECONDS);
  });

  it('la inyección da 10 min de ingresos', () => {
    const state = fresh();
    state.tools[PICO.id] = 30;
    const income = incomePerSecond(state, CONTENT).toNumber();
    claimVisitor(state, CONTENT, 'injection');
    expect(state.coins.toNumber()).toBeCloseTo(income * VISITOR_INJECTION_SECONDS, 6);
  });
});

describe('offline', () => {
  it('una ausencia corta da lo mismo que avanzar de una vez; solo cuentan las 2 primeras horas', () => {
    const a = fresh();
    const b = fresh();
    a.tools[PICO.id] = 20;
    b.tools[PICO.id] = 20;
    simulateOffline(a, CONTENT, 3600);
    advance(b, CONTENT, 3600);
    expect(a.coins.toNumber()).toBeCloseTo(b.coins.toNumber(), 6);

    const long = fresh();
    const exact = fresh();
    long.tools[PICO.id] = 20;
    exact.tools[PICO.id] = 20;
    const summary = simulateOffline(long, CONTENT, 60 * 24 * 3600);
    simulateOffline(exact, CONTENT, 2 * 3600);
    expect(summary.awaySeconds).toBe(2 * 3600);
    expect(summary.totalAwaySeconds).toBe(60 * 24 * 3600);
    expect(long.coins.toNumber()).toBeCloseTo(exact.coins.toNumber(), 3);
  });

  it('Siesta larga amplía el tope y un tiempo negativo no hace nada', () => {
    const state = fresh();
    expect(offlineCapSeconds(state, CONTENT)).toBe(2 * 3600);
    state.perks['abono'] = 1;
    state.perks['descanso'] = 3;
    expect(offlineCapSeconds(state, CONTENT)).toBe(5 * 3600);
    expect(simulateOffline(state, CONTENT, -10).awaySeconds).toBe(0);
  });
});
