import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { achievementProgress, updateAchievements } from './achievements.ts';
import { claimVisitor, collectBasket, tap, tapValue, VISITOR_BOOST, VISITOR_INJECTION_SECONDS } from './actions.ts';
import { BASKET_CAP_SECONDS, BASKET_RATE, basketSeconds, basketValue } from './basket.ts';
import { displayProductionPerSecond } from './formulas.ts';
import { D } from './num.ts';
import { updateReveals } from './reveal.ts';
import { nextDiscovery } from './selectors.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

function withLechones(n: number): GameState {
  const state = createInitialState(CONTENT, 0);
  const g = state.worlds['valle']!.generators['lechon']!;
  g.bought = n;
  g.owned = D(n);
  state.worlds['valle']!.records.maxBought['lechon'] = n;
  return state;
}

describe('rascar la barriga', () => {
  it('da 1 s de producción (mínimo 1)', () => {
    const state = withLechones(79); // 79 · 0,5 = 39,5/s (con 80 se adoptaría una variedad y subiría un 5 %)
    expect(tapValue(state, CONTENT, 'valle').toNumber()).toBeCloseTo(displayProductionPerSecond(state, CONTENT, 'valle').toNumber(), 9);
    const before = state.worlds['valle']!.currency;
    const gained = tap(state, CONTENT, 'valle');
    expect(gained.toNumber()).toBeCloseTo(39.5, 9);
    expect(state.worlds['valle']!.currency.sub(before).toNumber()).toBeCloseTo(39.5, 9);
    expect(state.taps).toBe(1);
  });
});

describe('rascar con el impulso del visitante', () => {
  it('con el ×5 activo, rascar también da ×5; al acabar, vuelve a lo normal', () => {
    const state = withLechones(79);
    const normal = tapValue(state, CONTENT, 'valle').toNumber();
    claimVisitor(state, CONTENT, 'boost', 'valle');
    expect(tapValue(state, CONTENT, 'valle').toNumber()).toBeCloseTo(normal * VISITOR_BOOST.mult, 9);
    const before = state.worlds['valle']!.currency;
    expect(tap(state, CONTENT, 'valle').toNumber()).toBeCloseTo(normal * VISITOR_BOOST.mult, 9);
    expect(state.worlds['valle']!.currency.sub(before).toNumber()).toBeCloseTo(normal * VISITOR_BOOST.mult, 6);
    advance(state, CONTENT, VISITOR_BOOST.seconds + 1);
    expect(state.buff).toBeNull();
    expect(tapValue(state, CONTENT, 'valle').toNumber()).toBeGreaterThanOrEqual(normal);
  });
});

describe('cesta de la granja', () => {
  it('se llena con el tiempo, con tope, y recoger la vacía', () => {
    const state = withLechones(79);
    advance(state, CONTENT, 600);
    expect(basketSeconds(state, 'valle')).toBe(600);
    const expected = 39.5 * 600 * BASKET_RATE;
    expect(basketValue(state, CONTENT, 'valle').toNumber()).toBeCloseTo(expected, 6);
    const before = state.worlds['valle']!.currency;
    expect(collectBasket(state, CONTENT, 'valle').toNumber()).toBeCloseTo(expected, 6);
    expect(state.worlds['valle']!.currency.sub(before).toNumber()).toBeCloseTo(expected, 6);
    expect(basketSeconds(state, 'valle')).toBe(0);
    advance(state, CONTENT, 10 * 3600);
    expect(basketSeconds(state, 'valle')).toBe(BASKET_CAP_SECONDS);
  });
});

describe('visitante', () => {
  it('la inyección da 10 min de producción', () => {
    const state = withLechones(79);
    const before = state.worlds['valle']!.currency;
    claimVisitor(state, CONTENT, 'injection', 'valle');
    expect(state.worlds['valle']!.currency.sub(before).toNumber()).toBeCloseTo(39.5 * VISITOR_INJECTION_SECONDS, 6);
  });

  it('el impulso multiplica la producción y caduca a su hora, con integral exacta', () => {
    const plain = withLechones(79);
    const boosted = withLechones(79);
    claimVisitor(boosted, CONTENT, 'boost', 'valle');
    expect(boosted.buff).toEqual({ mult: VISITOR_BOOST.mult, until: VISITOR_BOOST.seconds });
    advance(plain, CONTENT, 90);
    advance(boosted, CONTENT, 90); // 60 s a ×5 + 30 s a ×1
    const a = plain.worlds['valle']!.lifetimeEarned.toNumber();
    const b = boosted.worlds['valle']!.lifetimeEarned.toNumber();
    expect(b / a).toBeCloseTo((VISITOR_BOOST.mult * 60 + 30) / 90, 9);
    expect(boosted.buff).toBeNull();
  });

  it('el impulso en pasos pequeños coincide con un paso grande', () => {
    const big = withLechones(79);
    const small = withLechones(79);
    claimVisitor(big, CONTENT, 'boost', 'valle');
    claimVisitor(small, CONTENT, 'boost', 'valle');
    advance(big, CONTENT, 100);
    for (let i = 0; i < 100; i++) advance(small, CONTENT, 1);
    const a = big.worlds['valle']!.lifetimeEarned.toNumber();
    const b = small.worlds['valle']!.lifetimeEarned.toNumber();
    expect(Math.abs(a - b) / b).toBeLessThan(1e-9);
  });
});

describe('cerditos descubiertos', () => {
  it('empieza con 1 visible y descubre el siguiente al poder pagarlo', () => {
    const state = createInitialState(CONTENT, 0);
    const ws = state.worlds['valle']!;
    expect(ws.revealed).toBe(1);
    ws.currency = D(109);
    updateReveals(state, CONTENT);
    expect(ws.revealed).toBe(1); // Cerdita rosa cuesta 110
    ws.currency = D(110);
    updateReveals(state, CONTENT);
    expect(ws.revealed).toBe(2);
    ws.currency = D(0); // gastar no los oculta de nuevo
    updateReveals(state, CONTENT);
    expect(ws.revealed).toBe(2);
  });

  it('en la armonía se ven todos desde el principio', () => {
    const state = createInitialState(CONTENT, 0);
    expect(state.worlds['huerta']!.revealed).toBe(8);
  });
});

describe('logros', () => {
  it('se adoptan solos, una vez, con línea en el diario', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.ascensions = 1;
    expect(updateAchievements(state, CONTENT, 7)).toEqual(['primer-vuelo']);
    expect(state.achievements['primer-vuelo']).toEqual({ at: 7 });
    expect(state.journal.at(-1)!.text).toContain('Primer vuelo');
    expect(updateAchievements(state, CONTENT, 8)).toEqual([]);
  });

  it('uno por cada cantidad de cada cerdito, sin llenar el diario', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.records.maxBought['lechon'] = 60; // 1, 15, 25 y 50
    const got = updateAchievements(state, CONTENT, 0);
    expect(got).toEqual(['lechon-1', 'lechon-15', 'lechon-25', 'lechon-50']);
    expect(state.journal.length).toBe(0);
    const total = CONTENT.worlds.reduce((n, w) => n + w.generators.length * (w.mechanic === 'merge' ? 3 : 11), 0);
    expect(CONTENT.achievements.filter((a) => a.requires.kind === 'genCount').length).toBe(total);
  });

  it('contadores: rascados, variedades y mundos abiertos', () => {
    const state = createInitialState(CONTENT, 0);
    state.taps = 100;
    expect(achievementProgress(state, { kind: 'taps', count: 100 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'varietyCount', count: 5 })).toMatchObject({ done: false });
    state.collection['a'] = { adoptedAt: 0 };
    expect(achievementProgress(state, { kind: 'varietyCount', count: 1 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'worldUnlocked', world: 'bosque' }).done).toBe(false);
    state.worlds['bosque']!.unlocked = true;
    expect(achievementProgress(state, { kind: 'worldUnlocked', world: 'bosque' }).done).toBe(true);
  });
});

describe('próximo cerdito por descubrir', () => {
  it('da el tiempo que falta para poder pagarlo y desaparece al descubrirlos todos', () => {
    const state = createInitialState(CONTENT, 0);
    const ws = state.worlds['valle']!;
    ws.generators['lechon']!.owned = D(10); // 5/s
    ws.currency = D(0); // Cerdita rosa cuesta 110
    const found = nextDiscovery(state, CONTENT, 'valle')!;
    expect(found.etaSeconds).toBeCloseTo(110 / 5, 6);
    ws.revealed = 8;
    expect(nextDiscovery(state, CONTENT, 'valle')).toBeNull();
  });

  it('sin producción no hay tiempo estimado, y en la armonía no hay nada por descubrir', () => {
    const state = createInitialState(CONTENT, 0);
    expect(nextDiscovery(state, CONTENT, 'valle')).toMatchObject({ etaSeconds: null });
    expect(nextDiscovery(state, CONTENT, 'huerta')).toBeNull();
  });
});
