import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { updateAchievements } from './achievements.ts';
import { ascend, buyCaveNode, buyCompanion, buyFurnace, caveBlow, rabbitWaitSeconds, useRabbit, companionTick, buyGlobalUpgrade, buySkin, claimVisitor, equipSkin, MAX_ACTIVE_COMPANIONS, tap, toggleCompanion } from './actions.ts';
import { visitorModifiers, baseIncomePerSecond, globalMultiplier, incomePerSecond, momentumMaxMult, momentumMult, prodMultiplier, relicOwned } from './formulas.ts';
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
    for (const id of ['topo', 'gato']) expect(buyCompanion(state, CONTENT, id)).toBe(true);
    expect(toggleCompanion(state, CONTENT, 'dragon')).toBe(false);
    toggleCompanion(state, CONTENT, 'topo');
    toggleCompanion(state, CONTENT, 'gato');
    state.achievements['ascender-10'] = { at: 0 };
    toggleCompanion(state, CONTENT, 'dragon');
    expect(state.activeCompanions).toEqual(['gato', 'dragon']);
    expect(state.activeCompanions.length).toBeLessThanOrEqual(MAX_ACTIVE_COMPANIONS);
    toggleCompanion(state, CONTENT, 'gato');
    expect(state.activeCompanions).toEqual(['dragon']);
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

describe('habilidades de los compañeros', () => {
  it('el topo da una bellota cada 40 picos, solo mientras se lleva', () => {
    const state = fresh();
    for (let i = 0; i < 40; i++) tap(state, CONTENT);
    expect(state.acorns).toBe(0);
    state.acorns = 10;
    state.activeCompanions = ['topo'];
    for (let i = 0; i < 39; i++) tap(state, CONTENT);
    expect(state.acorns).toBe(10);
    tap(state, CONTENT);
    expect(state.acorns).toBe(11);
    expect(state.companionProgress['topo']).toBe(0);
  });

  it('el gato trae monedas cada 120 s y lo anota en el diario', () => {
    const state = fresh();
    state.activeCompanions = ['gato'];
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    companionTick(state, CONTENT, 119);
    expect(state.coins.toNumber()).toBe(0);
    companionTick(state, CONTENT, 1);
    expect(state.coins.toNumber()).toBeCloseTo(base * 90, 6);
    expect(state.journal.at(-1)?.text).toContain('Gato');
  });

  it('el dragón enciende la inercia al máximo cada 180 s', () => {
    const state = fresh();
    state.activeCompanions = ['dragon'];
    companionTick(state, CONTENT, 179);
    expect(state.momentum).toBe(0);
    companionTick(state, CONTENT, 1);
    expect(state.momentum).toBe(1);
  });
});

describe('perro, pájaro y conejo', () => {
  it('el perro hace rendir ×1,1 solo a la mejor herramienta', () => {
    const state = fresh();
    const before = baseIncomePerSecond(state, CONTENT).toNumber();
    state.activeCompanions = ['perro'];
    expect(baseIncomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(before * 1.1, 9);
  });

  it('el pájaro acelera al visitante', () => {
    const state = fresh();
    expect(visitorModifiers(state, CONTENT).speed).toBe(1);
    state.activeCompanions = ['pajaro'];
    expect(visitorModifiers(state, CONTENT).speed).toBeGreaterThan(1.3);
  });

  it('el conejo da una herramienta gratis y luego espera 6 horas reales', () => {
    const state = fresh();
    const t0 = 1_000_000;
    expect(useRabbit(state, CONTENT, PICO.id, t0)).toBe(false); // sin llevarlo
    state.activeCompanions = ['conejo'];
    expect(useRabbit(state, CONTENT, CONTENT.tools[5]!.id, t0)).toBe(false); // no descubierta
    expect(useRabbit(state, CONTENT, PICO.id, t0)).toBe(true);
    expect(state.tools[PICO.id]).toBe(21);
    expect(state.coins.toNumber()).toBe(0);
    expect(rabbitWaitSeconds(state, CONTENT, t0 + 3600_000)).toBeCloseTo(5 * 3600, 6);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 3600_000)).toBe(false);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 6 * 3600_000)).toBe(true);
  });
});

describe('cueva del dragón', () => {
  function withDragon(): GameState {
    const state = fresh();
    state.achievements['ascender-10'] = { at: 0 };
    return state;
  }

  it('está cerrada sin dragón', () => {
    const state = fresh();
    expect(caveBlow(state, CONTENT).toNumber()).toBe(0);
    state.cave.embers = D(1e6);
    expect(buyFurnace(state, CONTENT, 'brasero')).toBe(false);
  });

  it('soplar da brasas con enfriamiento, los hornos producen y el tiempo las acumula', () => {
    const state = withDragon();
    expect(caveBlow(state, CONTENT).toNumber()).toBe(1);
    expect(caveBlow(state, CONTENT).toNumber()).toBe(0);
    state.cave.embers = D(100);
    expect(buyFurnace(state, CONTENT, 'brasero')).toBe(true);
    expect(state.cave.embers.toNumber()).toBe(85);
    advance(state, CONTENT, 10);
    expect(state.cave.embers.toNumber()).toBeCloseTo(85 + 2, 6);
  });

  it('las ventajas piden la anterior y suben la producción del juego principal', () => {
    const state = withDragon();
    state.cave.embers = D(1e6);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-plata')).toBe(false);
    const before = prodMultiplier(state, CONTENT);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-bronce')).toBe(true);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-bronce')).toBe(false);
    buyCaveNode(state, CONTENT, 'cesta-honda');
    buyCaveNode(state, CONTENT, 'ojo-de-dragon');
    expect(visitorModifiers(state, CONTENT).stayBonus).toBe(5);
  });

  it('el aliento frecuente acorta el intervalo del dragón y ascender no borra la cueva', () => {
    const state = withDragon();
    state.cave.embers = D(1e6);
    buyCaveNode(state, CONTENT, 'fuego-interior');
    buyCaveNode(state, CONTENT, 'aliento-frecuente');
    state.activeCompanions = ['dragon'];
    companionTick(state, CONTENT, 150);
    expect(state.momentum).toBe(1);
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.cave.nodes['fuego-interior']).toBe(true);
    expect(state.cave.embers.toNumber()).toBeGreaterThan(0);
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
