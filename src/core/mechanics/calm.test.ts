import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content/index.ts';
import { ascend, buyGenerator, buyUpgrade } from '../actions.ts';
import { displayProductionPerSecond, productionPerSecond } from '../formulas.ts';
import { D } from '../num.ts';
import { calmView } from '../selectors.ts';
import { createInitialState, type GameState } from '../state.ts';
import { advance } from '../tick.ts';
import { advanceCalm, calmMultiplier, purchaseWouldDisturb, touchCalm } from './calm.ts';

const WORLD = CONTENT.worlds.find((w) => w.id === 'balneario')!;
const CALM = WORLD.calm!;

function balnearioState(): GameState {
  const state = createInitialState(CONTENT, 0);
  const ws = state.worlds['balneario']!;
  ws.unlocked = true;
  ws.currency = D(1e9);
  return state;
}

describe('calma (Balneario)', () => {
  it('cada ronda empieza con la calma llena', () => {
    const state = balnearioState();
    expect(state.worlds['balneario']!.calm).toBe(1);
    expect(calmMultiplier(WORLD, state.worlds['balneario']!)).toBe(1 + CALM.maxBonus);
  });

  it('integral exacta con rampa parcial (no llega a 1)', () => {
    const ws = balnearioState().worlds['balneario']!;
    ws.calm = 0;
    const factor = advanceCalm(WORLD, ws, 900); // calma 0 → 0,5; media 0,25
    expect(ws.calm).toBeCloseTo(0.5, 12);
    expect(factor).toBeCloseTo(1 + CALM.maxBonus * 0.25, 12);
  });

  it('integral exacta con rampa completa (llega a 1 justo)', () => {
    const ws = balnearioState().worlds['balneario']!;
    ws.calm = 0;
    const factor = advanceCalm(WORLD, ws, 1800);
    expect(ws.calm).toBe(1);
    expect(factor).toBeCloseTo(1 + CALM.maxBonus * 0.5, 12);
  });

  it('integral exacta mixta: rampa y luego tramo plano', () => {
    const ws = balnearioState().worlds['balneario']!;
    ws.calm = 0.5;
    const factor = advanceCalm(WORLD, ws, 1800); // 900 s de rampa (0,5→1, media 0,75) + 900 s a 1
    expect(ws.calm).toBe(1);
    expect(factor).toBeCloseTo(1 + CALM.maxBonus * ((900 * 0.75 + 900 * 1) / 1800), 12);
  });

  it('un paso grande equivale a muchos pequeños (producción acumulada)', () => {
    const a = balnearioState();
    const b = balnearioState();
    for (const s of [a, b]) {
      s.worlds['balneario']!.calm = 0.2;
      s.worlds['balneario']!.generators['banista']!.owned = D(10);
    }
    advance(a, CONTENT, 3000);
    for (let i = 0; i < 3000; i++) advance(b, CONTENT, 1);
    const x = a.worlds['balneario']!.lifetimeEarned.toNumber();
    const y = b.worlds['balneario']!.lifetimeEarned.toNumber();
    expect(Math.abs(x - y) / y).toBeLessThan(1e-9);
  });

  it('comprar baja la calma a la mitad y abre una ventana de 60 s', () => {
    const state = balnearioState();
    const ws = state.worlds['balneario']!;
    expect(purchaseWouldDisturb(WORLD, ws, state.time)).toBe(true);
    buyGenerator(state, CONTENT, 'balneario', 'banista', 1);
    expect(ws.calm).toBeCloseTo(0.5, 12);
    expect(ws.calmPenaltyUntil).toBe(state.time + CALM.windowSeconds);
    expect(purchaseWouldDisturb(WORLD, ws, state.time)).toBe(false);
  });

  it('dos compras en el mismo minuto solo penalizan una vez', () => {
    const state = balnearioState();
    const ws = state.worlds['balneario']!;
    buyGenerator(state, CONTENT, 'balneario', 'banista', 1);
    buyGenerator(state, CONTENT, 'balneario', 'banista', 1);
    expect(ws.calm).toBeCloseTo(0.5, 12);
    advance(state, CONTENT, 61); // sale de la ventana (la calma sube un poco)
    const before = ws.calm;
    buyGenerator(state, CONTENT, 'balneario', 'banista', 1);
    expect(ws.calm).toBeCloseTo(before * 0.5, 12);
  });

  it('comprar una mejora también molesta; touchCalm respeta la ventana', () => {
    const state = balnearioState();
    const ws = state.worlds['balneario']!;
    ws.runEarned = D(1e9);
    expect(buyUpgrade(state, CONTENT, 'balneario', 'toallas-calentitas')).toBe(true);
    expect(ws.calm).toBeCloseTo(0.5, 12);
    touchCalm(WORLD, ws, state.time);
    expect(ws.calm).toBeCloseTo(0.5, 12);
  });

  it('ascender devuelve la calma llena', () => {
    const state = balnearioState();
    const ws = state.worlds['balneario']!;
    ws.calm = 0.1;
    ws.calmPenaltyUntil = 999;
    ws.lifetimeEarned = D(1e12);
    expect(ascend(state, CONTENT, 'balneario', 0)).toBeGreaterThan(0);
    expect(ws.calm).toBe(1);
    expect(ws.calmPenaltyUntil).toBe(-1);
  });

  it('la producción mostrada incluye la calma; la de decisión no', () => {
    const state = balnearioState();
    const ws = state.worlds['balneario']!;
    ws.generators['banista']!.owned = D(10);
    ws.calm = 0.5;
    const base = productionPerSecond(state, CONTENT, 'balneario').toNumber();
    expect(displayProductionPerSecond(state, CONTENT, 'balneario').toNumber()).toBeCloseTo(base * 2.5, 9);
  });

  it('calmView solo existe en el Balneario', () => {
    const state = balnearioState();
    expect(calmView(state, CONTENT, 'valle')).toBeNull();
    expect(calmView(state, CONTENT, 'balneario')).toMatchObject({ calm: 1, multiplier: 4, buyWillDisturb: true });
  });
});
