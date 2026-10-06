import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { burstSeconds, blockHpAt, digPower, hazardFactor, incomePerSecond, milestoneMult, zoneIndexOf } from './formulas.ts';
import { advanceMine, breakBlock } from './mining.ts';
import { D } from './num.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

const MINE = CONTENT.mine;

function fresh(): GameState {
  return createInitialState(CONTENT, 0);
}

describe('fórmulas de la mina', () => {
  it('la vida del bloque crece por nivel y las zonas miden zoneLength niveles', () => {
    expect(blockHpAt(CONTENT, 1)).toBe(MINE.hpBase);
    expect(blockHpAt(CONTENT, 2)).toBeCloseTo(MINE.hpBase * MINE.hpGrowth, 9);
    expect(zoneIndexOf(CONTENT, 1)).toBe(0);
    expect(zoneIndexOf(CONTENT, MINE.zoneLength)).toBe(0);
    expect(zoneIndexOf(CONTENT, MINE.zoneLength + 1)).toBe(1);
    expect(zoneIndexOf(CONTENT, 100000)).toBe(CONTENT.zones.length - 1); // la última zona no acaba
  });

  it('el cavado inicial es el base; el rascador y los hitos lo suben', () => {
    const state = fresh();
    expect(digPower(state, CONTENT, 0)).toBe(MINE.baseDps);
    state.gear['rascador'] = 9;
    expect(digPower(state, CONTENT, 0)).toBeCloseTo(MINE.baseDps + 9, 9);
    state.gear['rascador'] = 10; // hito de nivel 10: ×2 al efecto de la pieza
    expect(digPower(state, CONTENT, 0)).toBeCloseTo(MINE.baseDps + 10 * milestoneMult(CONTENT, 10), 9);
    expect(milestoneMult(CONTENT, 10)).toBe(MINE.milestoneMult);
  });

  it('sin resistencia, el peligro frena el cavado hasta el suelo; con el nivel necesario, no', () => {
    const state = fresh();
    expect(hazardFactor(state, CONTENT, 0)).toBe(1); // tierra: sin peligro
    expect(hazardFactor(state, CONTENT, 1)).toBeCloseTo(MINE.hazardFloor, 9); // arcilla sin botas
    state.gear['botas'] = 5 + 3 * 1; // needBase + needStep · zona
    expect(hazardFactor(state, CONTENT, 1)).toBe(1);
    state.gear['botas'] = 4; // a medias
    expect(hazardFactor(state, CONTENT, 1)).toBeCloseTo(MINE.hazardFloor + (1 - MINE.hazardFloor) * 0.5, 9);
  });
});

describe('cavar', () => {
  it('romper un bloque da monedas y material y baja un nivel', () => {
    const state = fresh();
    const coins = state.coins;
    breakBlock(state, CONTENT);
    expect(state.depth).toBe(2);
    expect(state.coins.gt(coins)).toBe(true);
    expect(state.materials['raices']!.toNumber()).toBe(1);
    expect(state.records.blocks).toBe(1);
    expect(state.blockHp).toBeCloseTo(blockHpAt(CONTENT, 2), 9);
  });

  it('un paso grande equivale a muchos pequeños (sin compras de por medio)', () => {
    const big = fresh();
    const small = fresh();
    advance(big, CONTENT, 600);
    for (let i = 0; i < 600; i++) advance(small, CONTENT, 1);
    expect(big.depth).toBe(small.depth);
    expect(big.blockHp).toBeCloseTo(small.blockHp, 6);
    expect(big.coins.toNumber()).toBeCloseTo(small.coins.toNumber(), 6);
  });

  it('con una zona elegida se queda en su último nivel en vez de bajar', () => {
    const state = fresh();
    state.runMaxDepth = 25;
    state.records.maxDepth = 25;
    state.depth = MINE.zoneLength; // último nivel de la zona 0
    state.blockHp = blockHpAt(CONTENT, state.depth);
    state.farmZone = 0;
    advanceMine(state, CONTENT, 5000);
    expect(state.depth).toBe(MINE.zoneLength);
    expect(state.records.blocks).toBeGreaterThan(1);
    expect(state.materials['raices']!.toNumber()).toBeGreaterThan(1);
  });

  it('anota en el diario la primera vez que se llega a una zona nueva', () => {
    const state = fresh();
    state.depth = MINE.zoneLength;
    state.blockHp = 0.0001;
    state.runMaxDepth = MINE.zoneLength;
    state.records.maxDepth = MINE.zoneLength;
    breakBlock(state, CONTENT);
    expect(state.journal.at(-1)!.text).toContain(CONTENT.zones[1]!.name);
  });

  it('el impulso del visitante multiplica el cavado solo mientras dura (integral exacta)', () => {
    const plain = fresh();
    const boosted = fresh();
    boosted.buff = { mult: 5, until: 60 };
    advance(plain, CONTENT, 90);
    advance(boosted, CONTENT, 90); // 60 s a ×5 y 30 s a ×1
    expect(boosted.buff).toBeNull();
    expect(boosted.records.blocks).toBeGreaterThan(plain.records.blocks);

    const a = fresh();
    const b = fresh();
    a.buff = { mult: 5, until: 60 };
    b.buff = { mult: 5, until: 60 };
    advance(a, CONTENT, 100);
    for (let i = 0; i < 100; i++) advance(b, CONTENT, 1);
    expect(a.depth).toBe(b.depth);
    expect(a.coins.toNumber()).toBeCloseTo(b.coins.toNumber(), 6);
  });

  it('los ingresos por segundo salen de cavado / vida del bloque × monedas del bloque', () => {
    const state = fresh();
    const expected = (MINE.baseDps / MINE.hpBase) * MINE.coinBase;
    expect(incomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(expected, 9);
  });

  it('la dinamita da segundos de cavado según su nivel', () => {
    const state = fresh();
    expect(burstSeconds(state, CONTENT)).toBe(0);
    state.gear['dinamita'] = 3;
    expect(burstSeconds(state, CONTENT)).toBe(30 + 6 * 3);
  });

  it('no se rompe con una cantidad enorme de tiempo (tope de bloques por paso)', () => {
    const state = fresh();
    state.gear['rascador'] = 100;
    state.coins = D(0);
    expect(() => advance(state, CONTENT, 1e9)).not.toThrow();
    expect(state.depth).toBeGreaterThan(10);
  });
});
