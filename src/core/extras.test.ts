import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { updateAchievements } from './achievements.ts';
import { ascend, buyCompanion, buyGlobalUpgrade, buySkin, claimVisitor, equipSkin, MAX_ACTIVE_COMPANIONS, tap, toggleCompanion } from './actions.ts';
import { baseIncomePerSecond, globalMultiplier, incomePerSecond, momentumMaxMult, momentumMult, prodMultiplier, relicOwned } from './formulas.ts';
import { D } from './num.ts';
import { cosmeticViews, globalUpgradeViews, headerView, statsView, toolViews } from './selectors.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

const G = CONTENT.game;
const PICO = CONTENT.tools[0]!;

function fresh(): GameState {
  const state = createInitialState(CONTENT, 0);
  state.tools[PICO.id] = 20;
  return state;
}

describe('inercia', () => {
  it('cada pico sube la barra, que tiene tope; el multiplicador va de ×1 a ×5', () => {
    const state = fresh();
    expect(momentumMult(state, CONTENT)).toBe(1);
    for (let i = 0; i < 10; i++) tap(state, CONTENT);
    expect(state.momentum).toBeCloseTo(10 * G.momentumPerTap, 9);
    state.momentum = 1;
    expect(momentumMult(state, CONTENT)).toBe(G.momentumMax);
    expect(incomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(baseIncomePerSecond(state, CONTENT).toNumber() * G.momentumMax, 9);
    for (let i = 0; i < 100; i++) tap(state, CONTENT);
    expect(state.momentum).toBe(1);
  });

  it('baja linealmente con el tiempo y produce la media exacta mientras baja', () => {
    const state = fresh();
    state.momentum = 0.5;
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    advance(state, CONTENT, 5);
    expect(state.momentum).toBeCloseTo(0.5 - 5 * G.momentumDecay, 9);
    const average = 0.5 - (5 * G.momentumDecay) / 2;
    expect(state.coins.toNumber()).toBeCloseTo(base * 5 * (1 + (G.momentumMax - 1) * average), 9);
  });

  it('si se agota a mitad del avance, solo cuenta hasta que llega a 0 y el resto va a ×1', () => {
    const state = fresh();
    state.momentum = 0.1;
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    advance(state, CONTENT, 10);
    expect(state.momentum).toBe(0);
    const tZero = 0.1 / G.momentumDecay;
    expect(state.coins.toNumber()).toBeCloseTo(base * (tZero * (1 + (G.momentumMax - 1) * 0.05) + (10 - tZero)), 9);
  });

  it('un paso grande equivale a muchos pequeños, también con el impulso del visitante', () => {
    const a = fresh();
    const b = fresh();
    for (const s of [a, b]) {
      s.momentum = 0.7;
      claimVisitor(s, CONTENT, 'boost');
    }
    advance(a, CONTENT, 100);
    for (let i = 0; i < 1000; i++) advance(b, CONTENT, 0.1);
    expect(a.coins.toNumber()).toBeCloseTo(b.coins.toNumber(), 4);
    expect(a.momentum).toBeCloseTo(b.momentum, 9);
  });

  it('la reliquia Muelle mágico sube el tope y ascender reinicia la barra', () => {
    const state = fresh();
    state.achievements['grua-perforadora-25'] = { at: 0 };
    expect(momentumMaxMult(state, CONTENT)).toBe(G.momentumMax + 1);
    state.momentum = 0.8;
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.momentum).toBe(0);
  });
});

describe('mejoras globales', () => {
  it('se desbloquean al ganar una cantidad, se compran una vez y multiplican ×1,5 toda la producción', () => {
    const state = fresh();
    expect(globalUpgradeViews(state, CONTENT).available).toEqual([]);
    expect(globalUpgradeViews(state, CONTENT).nextUnlockAt).toBe(500);
    state.coins = D(1e6);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(false);
    state.lifetime = D(600);
    expect(globalUpgradeViews(state, CONTENT).available.map((u) => u.id)).toEqual(['comedero-grande']);
    const base = prodMultiplier(state, CONTENT);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(true);
    expect(state.coins.toNumber()).toBeCloseTo(1e6 - 5000, 3);
    expect(globalMultiplier(state, CONTENT)).toBe(1.5);
    expect(prodMultiplier(state, CONTENT) / base).toBeCloseTo(1.5, 9);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(false);
  });

  it('se pierden al ascender', () => {
    const state = fresh();
    state.globalUpgrades['comedero-grande'] = true;
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.globalUpgrades).toEqual({});
  });
});

describe('bellotas, pieles, compañeros y reliquias', () => {
  it('el cerdito viajero da siempre 1 bellota, sea cual sea la recompensa', () => {
    const state = fresh();
    claimVisitor(state, CONTENT, 'injection');
    claimVisitor(state, CONTENT, 'boost');
    expect(state.acorns).toBe(2);
    expect(state.stats.visitors).toBe(2);
    expect(headerView(state, CONTENT).bellotas).toBe(2);
  });

  it('las pieles se compran con bellotas, se equipan y las de logro se tienen al conseguirlo', () => {
    const state = fresh();
    expect(state.activeSkin).toBe('rosa');
    expect(buySkin(state, CONTENT, 'manchado')).toBe(false);
    expect(equipSkin(state, CONTENT, 'manchado')).toBe(false);
    state.acorns = 4;
    expect(buySkin(state, CONTENT, 'manchado')).toBe(true);
    expect(state.acorns).toBe(1);
    expect(equipSkin(state, CONTENT, 'manchado')).toBe(true);
    expect(state.activeSkin).toBe('manchado');
    expect(buySkin(state, CONTENT, 'dorado')).toBe(false);
    state.achievements['monedas-1000000000'] = { at: 0 };
    expect(equipSkin(state, CONTENT, 'dorado')).toBe(true);
    expect(cosmeticViews(state, CONTENT).skins.find((s) => s.id === 'dorado')!.owned).toBe(true);
  });

  it('los compañeros se compran, se llevan (máximo 2) y el sobrante quita el más antiguo', () => {
    const state = fresh();
    state.acorns = 100;
    for (const id of ['topo', 'perro', 'pajaro']) expect(buyCompanion(state, CONTENT, id)).toBe(true);
    expect(toggleCompanion(state, CONTENT, 'gato')).toBe(false);
    toggleCompanion(state, CONTENT, 'topo');
    toggleCompanion(state, CONTENT, 'perro');
    toggleCompanion(state, CONTENT, 'pajaro');
    expect(state.activeCompanions).toEqual(['perro', 'pajaro']);
    expect(state.activeCompanions.length).toBeLessThanOrEqual(MAX_ACTIVE_COMPANIONS);
    toggleCompanion(state, CONTENT, 'perro');
    expect(state.activeCompanions).toEqual(['pajaro']);
  });

  it('las reliquias se consiguen con su logro y dan su bono', () => {
    const state = fresh();
    const relic = CONTENT.relics.find((r) => r.id === 'pico-ancestral')!;
    expect(relicOwned(state, relic)).toBe(false);
    const before = prodMultiplier(state, CONTENT);
    state.maxOwned['pico-de-madera'] = 100;
    updateAchievements(state, CONTENT, 0);
    expect(relicOwned(state, relic)).toBe(true);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    expect(cosmeticViews(state, CONTENT).relics.find((r) => r.id === 'pico-ancestral')!.owned).toBe(true);
  });
});

describe('estadísticas y herramienta siguiente', () => {
  it('recogen lo jugado, incluido el mejor ingreso', () => {
    const state = fresh();
    state.momentum = 1;
    advance(state, CONTENT, 1);
    const stats = statsView(state, CONTENT);
    expect(stats.toolsOwned).toBe(20);
    expect(stats.bestIncome.toNumber()).toBeGreaterThan(0);
    expect(stats.playSeconds).toBe(1);
    expect(stats.achievements.total).toBe(CONTENT.achievements.length);
  });

  it('la siguiente herramienta por desbloquear se ve con su coste y lo que falta', () => {
    const state = createInitialState(CONTENT, 0);
    state.tools[PICO.id] = 1;
    state.coins = D(40);
    const teaser = toolViews(state, CONTENT).find((t) => t.reveal === 'teaser')!;
    expect(teaser.name).toBe('Cubo y pala');
    expect(teaser.nextCost.toNumber()).toBeGreaterThan(100);
    expect(teaser.missing.toNumber()).toBeCloseTo(teaser.nextCost.toNumber() - 40, 9);
  });
});
