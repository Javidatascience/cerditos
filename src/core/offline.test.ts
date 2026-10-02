import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { MAX_OFFLINE_SECONDS, simulateOffline } from './offline.ts';
import { createInitialState } from './state.ts';
import { advance } from './tick.ts';

function stateWithLechones(n: number) {
  const state = createInitialState(CONTENT, 0);
  const world = state.worlds['valle']!;
  world.generators['lechon']!.bought = n;
  world.generators['lechon']!.owned = world.generators['lechon']!.owned.add(n);
  return state;
}

describe('simulateOffline', () => {
  it('simulateOffline(2 h) da el mismo resultado que advance(2 h)', () => {
    const viaOffline = stateWithLechones(10);
    const viaAdvance = stateWithLechones(10);

    const summary = simulateOffline(viaOffline, CONTENT, 2 * 3600);
    advance(viaAdvance, CONTENT, 2 * 3600);

    expect(viaOffline.worlds['valle']!.currency.toNumber()).toBeCloseTo(viaAdvance.worlds['valle']!.currency.toNumber(), 6);
    expect(viaOffline.worlds['valle']!.lifetimeEarned.toNumber()).toBeCloseTo(viaAdvance.worlds['valle']!.lifetimeEarned.toNumber(), 6);
    expect(summary.awaySeconds).toBe(2 * 3600);
  });

  it('devuelve lo ganado por mundo durante la ausencia', () => {
    const state = stateWithLechones(10); // 10 × 0.5/s = 5/s
    const summary = simulateOffline(state, CONTENT, 100);
    expect(summary.earnedByWorld['valle']!.toNumber()).toBeCloseTo(500, 6);
  });

  it('seconds <= 0 no hace nada', () => {
    const state = stateWithLechones(10);
    const before = state.worlds['valle']!.currency.toNumber();
    const summary = simulateOffline(state, CONTENT, -5);
    expect(state.worlds['valle']!.currency.toNumber()).toBe(before);
    expect(summary.awaySeconds).toBe(0);

    const summaryZero = simulateOffline(state, CONTENT, 0);
    expect(state.worlds['valle']!.currency.toNumber()).toBe(before);
    expect(summaryZero.awaySeconds).toBe(0);
  });

  it('una ausencia de más de 2 horas solo produce durante las 2 primeras', () => {
    const long = stateWithLechones(10);
    const summary = simulateOffline(long, CONTENT, 60 * 24 * 3600); // 60 días
    expect(summary.awaySeconds).toBe(MAX_OFFLINE_SECONDS);
    expect(summary.totalAwaySeconds).toBe(60 * 24 * 3600);
    const exact = stateWithLechones(10);
    simulateOffline(exact, CONTENT, MAX_OFFLINE_SECONDS);
    expect(long.worlds['valle']!.lifetimeEarned.toNumber()).toBeCloseTo(exact.worlds['valle']!.lifetimeEarned.toNumber(), 3);
  });

  it('no toca mundos bloqueados', () => {
    const state = createInitialState(CONTENT, 0);
    expect(state.worlds['bosque']!.unlocked).toBe(false);
    simulateOffline(state, CONTENT, 3600);
    expect(state.worlds['bosque']!.currency.toNumber()).toBe(0);
  });

  it('trocear en más o menos pasos no cambia el resultado (advance es exacta)', () => {
    const viaManyChunks = stateWithLechones(5);
    // 2 h ≈ 480 trozos de 15 s con la configuración por defecto.
    simulateOffline(viaManyChunks, CONTENT, 2 * 3600);

    const viaOneStep = stateWithLechones(5);
    advance(viaOneStep, CONTENT, 2 * 3600);

    expect(viaManyChunks.worlds['valle']!.currency.toNumber()).toBeCloseTo(viaOneStep.worlds['valle']!.currency.toNumber(), 6);
  });

  it('tras ejecutarse dos veces seguidas, el total ganado es consistente', () => {
    const state = stateWithLechones(2); // 1/s
    simulateOffline(state, CONTENT, 1000);
    simulateOffline(state, CONTENT, 500);
    expect(state.worlds['valle']!.lifetimeEarned.toNumber()).toBeCloseTo(1500, 6);
  });
});
