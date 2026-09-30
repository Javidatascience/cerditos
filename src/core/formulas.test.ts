import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { bulkCost, generatorCost, getGeneratorDef, getWorldDef, maxAffordable } from './formulas.ts';
import { D } from './num.ts';

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
