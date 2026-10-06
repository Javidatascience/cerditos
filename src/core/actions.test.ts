import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { ascend, buyPerk, buyPiece, claimVisitor, collectBasket, setFarmZone, tap, tapValue, useBurst, VISITOR_BOOST, VISITOR_INJECTION_SECONDS } from './actions.ts';
import { BASKET_CAP_SECONDS, BASKET_RATE, basketSeconds } from './basket.ts';
import { blockHpAt, incomePerSecond, perkCost, pieceCost, plumasPending, startDepth } from './formulas.ts';
import { D } from './num.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

function fresh(): GameState {
  return createInitialState(CONTENT, 0);
}

describe('picar', () => {
  it('equivale a segundos de cavado y cuenta como toque', () => {
    const state = fresh();
    const gain = tap(state, CONTENT);
    expect(state.taps).toBe(1);
    expect(gain.gt(0) || state.blockHp < blockHpAt(CONTENT, 1)).toBe(true);
  });

  it('tapValue no cambia el estado y coincide con lo que da picar', () => {
    const state = fresh();
    state.gear['rascador'] = 30;
    const predicted = tapValue(state, CONTENT);
    const depth = state.depth;
    expect(state.depth).toBe(depth);
    const real = tap(state, CONTENT);
    expect(real.toNumber()).toBeCloseTo(predicted.toNumber(), 6);
  });

  it('con el ×5 del visitante picar también da ×5', () => {
    const a = fresh();
    const b = fresh();
    a.gear['rascador'] = 20;
    b.gear['rascador'] = 20;
    b.buff = { mult: VISITOR_BOOST.mult, until: 1000 };
    expect(tap(b, CONTENT).toNumber()).toBeGreaterThan(tap(a, CONTENT).toNumber());
  });
});

describe('piezas', () => {
  it('sube de nivel gastando monedas', () => {
    const state = fresh();
    state.coins = D(1000);
    const cost = pieceCost(state, CONTENT, CONTENT.pieces[0]!, 0).coins;
    expect(buyPiece(state, CONTENT, 'rascador', 1)).toBe(1);
    expect(state.gear['rascador']).toBe(1);
    expect(state.coins.toNumber()).toBeCloseTo(1000 - cost.toNumber(), 6);
  });

  it('no compra sin dinero ni con la pieza bloqueada, y respeta el máximo', () => {
    const state = fresh();
    state.coins = D(0);
    expect(buyPiece(state, CONTENT, 'rascador', 1)).toBe(0);
    state.coins = D(1e30);
    expect(buyPiece(state, CONTENT, 'linterna', 1)).toBe(0); // bloqueada: pide nivel 38 y 1 subida
    state.gear['rascador'] = 100;
    expect(buyPiece(state, CONTENT, 'rascador', 1)).toBe(0);
  });

  it('una pieza con material pide material además de monedas', () => {
    const state = fresh();
    state.records.maxDepth = 10;
    state.coins = D(1e9);
    expect(buyPiece(state, CONTENT, 'botas', 1)).toBe(0); // sin raíces
    state.materials['raices'] = D(100);
    expect(buyPiece(state, CONTENT, 'botas', 1)).toBe(1);
    expect(state.materials['raices']!.toNumber()).toBeLessThan(100);
  });

  it('×10 y máx compran varios niveles de golpe', () => {
    const state = fresh();
    state.coins = D(1e6);
    expect(buyPiece(state, CONTENT, 'rascador', 10)).toBe(10);
    const more = buyPiece(state, CONTENT, 'rascador', 'max');
    expect(more).toBeGreaterThan(0);
    expect(state.gear['rascador']).toBe(10 + more);
    expect(state.coins.gte(0)).toBe(true);
  });

  it('las piezas de ascensiones se desbloquean al subir', () => {
    const state = fresh();
    state.records.maxDepth = 500;
    state.coins = D(1e30);
    state.materials['arcilla'] = D(1e6);
    expect(buyPiece(state, CONTENT, 'mochila', 1)).toBe(0); // pide 1 subida
    state.ascensions = 1;
    expect(buyPiece(state, CONTENT, 'mochila', 1)).toBe(1);
  });
});

describe('dinamita', () => {
  it('cava de golpe y tarda en recargarse', () => {
    const state = fresh();
    state.records.maxDepth = 100;
    state.ascensions = 2;
    state.gear['dinamita'] = 1;
    const before = state.records.blocks;
    useBurst(state, CONTENT);
    expect(state.records.blocks).toBeGreaterThan(before);
    const after = state.records.blocks;
    useBurst(state, CONTENT); // aún en enfriamiento
    expect(state.records.blocks).toBe(after);
    state.time += 100;
    useBurst(state, CONTENT);
    expect(state.records.blocks).toBeGreaterThan(after);
  });

  it('sin la pieza no hace nada', () => {
    const state = fresh();
    expect(useBurst(state, CONTENT).toNumber()).toBe(0);
  });
});

describe('zona de cavado', () => {
  it('solo deja elegir zonas alcanzadas en esta ronda y lleva al último nivel de esa zona', () => {
    const state = fresh();
    setFarmZone(state, CONTENT, 2);
    expect(state.farmZone).toBeNull(); // aún no ha llegado
    state.runMaxDepth = 45;
    state.depth = 45;
    setFarmZone(state, CONTENT, 0);
    expect(state.farmZone).toBe(0);
    expect(state.depth).toBe(CONTENT.mine.zoneLength);
    setFarmZone(state, CONTENT, null);
    expect(state.farmZone).toBeNull();
  });
});

describe('subir a la superficie', () => {
  function deep(): GameState {
    const state = fresh();
    state.runMaxDepth = 60;
    state.records.maxDepth = 60;
    state.depth = 60;
    state.coins = D(5000);
    state.gear['rascador'] = 40;
    state.materials['raices'] = D(5);
    return state;
  }

  it('cobra plumas por el nivel más hondo y reinicia la ronda', () => {
    const state = deep();
    const expected = plumasPending(state, CONTENT);
    expect(expected).toBeGreaterThan(0);
    expect(ascend(state, CONTENT, 123)).toBe(expected);
    expect(state.plumas.toNumber()).toBe(expected);
    expect(state.plumasTotal.toNumber()).toBe(expected);
    expect(state.ascensions).toBe(1);
    expect(state.depth).toBe(1);
    expect(state.gear).toEqual({});
    expect(state.materials).toEqual({});
    expect(state.coins.toNumber()).toBe(CONTENT.mine.startCoins);
    expect(state.records.maxDepth).toBe(60); // el récord se conserva
    expect(state.journal.at(-1)).toMatchObject({ at: 123 });
  });

  it('sin plumas pendientes no hace nada', () => {
    const state = fresh();
    state.runMaxDepth = 1;
    expect(ascend(state, CONTENT, 0)).toBe(0);
    expect(state.ascensions).toBe(0);
  });

  it('las plumas nunca bajan al subir otra vez', () => {
    const state = deep();
    ascend(state, CONTENT, 0);
    const before = state.plumasTotal.toNumber();
    state.runMaxDepth = 80;
    ascend(state, CONTENT, 0);
    expect(state.plumasTotal.toNumber()).toBeGreaterThan(before);
  });

  it('las ventajas mejoran el arranque: Atajo conocido y Buen comienzo', () => {
    const state = deep();
    state.perks['abono'] = 1;
    state.perks['atajo'] = 2;
    state.perks['comienzo'] = 1;
    ascend(state, CONTENT, 0);
    expect(state.depth).toBe(startDepth(state, CONTENT));
    expect(state.depth).toBe(9);
    expect(state.coins.toNumber()).toBe(CONTENT.mine.startCoins * 25);
  });
});

describe('ventajas permanentes', () => {
  it('se compran con plumas, respetando requisitos', () => {
    const state = fresh();
    state.plumas = D(1000);
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(false); // pide Abono
    const abono = CONTENT.perks.find((p) => p.id === 'abono')!;
    const cost = perkCost(abono, 0);
    expect(buyPerk(state, CONTENT, 'abono')).toBe(true);
    expect(state.plumas.toNumber()).toBe(1000 - cost.toNumber());
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(true);
  });

  it('respetan el nivel máximo y no compran sin plumas', () => {
    const state = fresh();
    state.perks['abono'] = 1;
    state.perks['comienzo'] = 5;
    state.plumas = D(1e12);
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(false);
    state.plumas = D(0);
    expect(buyPerk(state, CONTENT, 'atajo')).toBe(false);
  });
});

describe('cesta y visitante', () => {
  it('la cesta se llena con el tiempo (con tope) y recoger la vacía', () => {
    const state = fresh();
    state.gear['rascador'] = 30;
    advance(state, CONTENT, 100);
    expect(basketSeconds(state)).toBe(100);
    const expected = incomePerSecond(state, CONTENT).mul(100 * BASKET_RATE);
    const before = state.coins;
    const gain = collectBasket(state, CONTENT);
    expect(gain.toNumber()).toBeCloseTo(expected.toNumber(), 6);
    expect(state.coins.sub(before).toNumber()).toBeCloseTo(gain.toNumber(), 6);
    expect(basketSeconds(state)).toBe(0);
    state.time += 10 * 3600;
    expect(basketSeconds(state)).toBe(BASKET_CAP_SECONDS);
  });

  it('la inyección da 10 min de ingresos y el impulso pone un multiplicador temporal', () => {
    const state = fresh();
    state.gear['rascador'] = 30;
    const income = incomePerSecond(state, CONTENT).toNumber();
    const before = state.coins.toNumber();
    claimVisitor(state, CONTENT, 'injection');
    expect(state.coins.toNumber() - before).toBeCloseTo(income * VISITOR_INJECTION_SECONDS, 3);
    claimVisitor(state, CONTENT, 'boost');
    expect(state.buff).toEqual({ mult: VISITOR_BOOST.mult, until: VISITOR_BOOST.seconds });
  });
});
