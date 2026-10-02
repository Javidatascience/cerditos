import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { buyPerk } from './actions.ts';
import {
  generatorCost,
  getGeneratorDef,
  getPerkDef,
  getWorldDef,
  globalMultiplier,
  hasPerkEffect,
  perkAvailable,
  perkCost,
  perkCostGrowthDelta,
  perkCostMultiplier,
  perkLevel,
  perkUpgradeCostMultiplier,
  perPlumaBonusRate,
  plumaMultiplier,
  startCurrency,
} from './formulas.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

const world = getWorldDef(CONTENT, 'valle');
const lechon = getGeneratorDef(world, 'lechon');

function stateWithPlumas(amount: number) {
  const state = createInitialState(CONTENT, 0);
  state.worlds['valle']!.plumas = D(amount);
  return state;
}

describe('perkCost', () => {
  it('coste(nivel 0) es el coste base', () => {
    const abono = getPerkDef(CONTENT, 'valle.abono');
    expect(perkCost(abono, 0).toNumber()).toBe(abono.baseCost);
  });

  it('coste(nivel L) = ceil(base · crecimiento^L)', () => {
    const abono = getPerkDef(CONTENT, 'valle.abono');
    for (const level of [0, 1, 2, 5]) {
      expect(perkCost(abono, level).toNumber()).toBe(Math.ceil(abono.baseCost * abono.costGrowth ** level));
    }
  });
});

describe('perkAvailable', () => {
  it('una ventaja sin requisitos está disponible desde el principio', () => {
    const state = createInitialState(CONTENT, 0);
    const abono = getPerkDef(CONTENT, 'valle.abono');
    expect(perkAvailable(state, CONTENT, abono)).toBe(true);
  });

  it('una ventaja con requisitos no está disponible hasta tenerlos', () => {
    const state = createInitialState(CONTENT, 0);
    const comienzo = getPerkDef(CONTENT, 'valle.comienzo'); // requiere Abono
    expect(perkAvailable(state, CONTENT, comienzo)).toBe(false);
    state.worlds['valle']!.perks['valle.abono'] = 1;
    expect(perkAvailable(state, CONTENT, comienzo)).toBe(true);
  });

  it('una ventaja de nivel máximo deja de estar disponible al llegar a él', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.perks['valle.abono'] = 1;
    const comienzo = getPerkDef(CONTENT, 'valle.comienzo'); // maxLevel 5
    expect(perkAvailable(state, CONTENT, comienzo)).toBe(true);
    state.worlds['valle']!.perks['valle.comienzo'] = 5;
    expect(perkAvailable(state, CONTENT, comienzo)).toBe(false);
  });

  it('una ventaja sin tope (Abono) sigue disponible en cualquier nivel', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.perks['valle.abono'] = 50;
    const abono = getPerkDef(CONTENT, 'valle.abono');
    expect(perkAvailable(state, CONTENT, abono)).toBe(true);
  });
});

describe('buyPerk', () => {
  it('sube el nivel y cobra plumas', () => {
    const state = stateWithPlumas(100);
    const cost = perkCost(getPerkDef(CONTENT, 'valle.abono'), 0);
    expect(buyPerk(state, CONTENT, 'valle.abono')).toBe(true);
    expect(perkLevel(state, CONTENT, 'valle.abono')).toBe(1);
    expect(state.worlds['valle']!.plumas.toNumber()).toBe(100 - cost.toNumber());
  });

  it('sin plumas suficientes no compra', () => {
    const state = stateWithPlumas(1);
    expect(buyPerk(state, CONTENT, 'valle.abono')).toBe(false);
    expect(perkLevel(state, CONTENT, 'valle.abono')).toBe(0);
  });

  it('sin cumplir los requisitos no compra', () => {
    const state = stateWithPlumas(1_000_000);
    expect(buyPerk(state, CONTENT, 'valle.comienzo')).toBe(false);
  });

  it('al nivel máximo no compra más', () => {
    const state = stateWithPlumas(1_000_000_000);
    state.worlds['valle']!.perks['valle.abono'] = 1;
    state.worlds['valle']!.perks['valle.comienzo'] = 5;
    expect(buyPerk(state, CONTENT, 'valle.comienzo')).toBe(false);
  });
});

describe('efectos de las ventajas', () => {
  it('prodMult (Abono): multiplica el multiplicador global', () => {
    const state = createInitialState(CONTENT, 0);
    const before = globalMultiplier(state, CONTENT, 'valle');
    state.worlds['valle']!.perks['valle.abono'] = 2;
    const after = globalMultiplier(state, CONTENT, 'valle');
    expect(after / before).toBeCloseTo(1.1 ** 2, 6);
  });

  it('costMult (Regateo): abarata los cerditos', () => {
    const state = createInitialState(CONTENT, 0);
    const before = generatorCost(world, lechon, 0);
    state.worlds['valle']!.perks['valle.ahorro'] = 3;
    const mult = perkCostMultiplier(state, CONTENT, 'valle');
    const delta = perkCostGrowthDelta(state, CONTENT, 'valle');
    const after = generatorCost(world, lechon, 0, delta, mult);
    expect(after.toNumber()).toBeLessThan(before.toNumber());
    expect(mult).toBeCloseTo(0.93 ** 3, 6);
  });

  it('upgradeCostMult (Herramientas heredadas): abarata las mejoras', () => {
    const state = createInitialState(CONTENT, 0);
    expect(perkUpgradeCostMultiplier(state, CONTENT, 'valle')).toBe(1);
    state.worlds['valle']!.perks['valle.mejoras'] = 1;
    expect(perkUpgradeCostMultiplier(state, CONTENT, 'valle')).toBeCloseTo(0.75, 6);
  });

  it('startCurrency (Buen comienzo): multiplica la moneda inicial', () => {
    const state = createInitialState(CONTENT, 0);
    const before = startCurrency(state, CONTENT, 'valle');
    state.worlds['valle']!.perks['valle.comienzo'] = 1;
    const after = startCurrency(state, CONTENT, 'valle');
    expect(after.toNumber()).toBeCloseTo(before.toNumber() * 25, 6);
  });

  it('plumaMult (Plumas al viento): aumenta la multiplicadora de plumas', () => {
    const state = createInitialState(CONTENT, 0);
    expect(plumaMultiplier(state, CONTENT, 'valle')).toBe(1);
    state.worlds['valle']!.perks['valle.vuelo'] = 2;
    expect(plumaMultiplier(state, CONTENT, 'valle')).toBeCloseTo(1.3, 6);
  });

  it('crossProd (Hermandad): sube la producción de los OTROS mundos, no la propia', () => {
    const state = createInitialState(CONTENT, 0);
    const beforeValle = globalMultiplier(state, CONTENT, 'valle');
    const beforeBosque = globalMultiplier(state, CONTENT, 'bosque');
    state.worlds['valle']!.perks['valle.puente'] = 3; // Hermandad del Valle: sube a los DEMÁS

    expect(globalMultiplier(state, CONTENT, 'valle')).toBeCloseTo(beforeValle, 6); // no se afecta a sí mismo
    expect(globalMultiplier(state, CONTENT, 'bosque')).toBeCloseTo(beforeBosque * (1 + 0.1 * 3), 6);
  });

  it('costGrowthDelta (Establo ampliado): reduce el crecimiento de coste', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.perks['valle.establo'] = 2;
    const delta = perkCostGrowthDelta(state, CONTENT, 'valle');
    expect(delta).toBeCloseTo(0.0025 * 2, 6);
    const costWithout = generatorCost(world, lechon, 50);
    const costWith = generatorCost(world, lechon, 50, delta, 1);
    expect(costWith.toNumber()).toBeLessThan(costWithout.toNumber());
  });

  it('perPlumaBonus (Raíces profundas): sube la tasa del bono pasivo de plumas', () => {
    const state = createInitialState(CONTENT, 0);
    const before = perPlumaBonusRate(state, CONTENT, 'valle');
    state.worlds['valle']!.perks['valle.raices'] = 1;
    const after = perPlumaBonusRate(state, CONTENT, 'valle');
    expect(after).toBeCloseTo(before + 0.01, 6);
  });
});
