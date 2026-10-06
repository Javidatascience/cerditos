import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { achievementProgress, updateAchievements } from './achievements.ts';
import { D } from './num.ts';
import { achievementViews, perkViews, pieceViews } from './selectors.ts';
import { createInitialState } from './state.ts';

describe('logros', () => {
  it('se adoptan solos y una sola vez, con línea en el diario los grandes', () => {
    const state = createInitialState(CONTENT, 0);
    state.records.maxDepth = 12;
    expect(updateAchievements(state, CONTENT, 7)).toEqual(['nivel-10']);
    expect(state.achievements['nivel-10']).toEqual({ at: 7 });
    expect(state.journal.at(-1)!.text).toContain('Primeros metros');
    expect(updateAchievements(state, CONTENT, 8)).toEqual([]);
  });

  it('los de nivel de pieza no llenan el diario', () => {
    const state = createInitialState(CONTENT, 0);
    state.gear['rascador'] = 30;
    const got = updateAchievements(state, CONTENT, 0);
    expect(got).toEqual(['rascador-10', 'rascador-25']);
    expect(state.journal.length).toBe(0);
  });

  it('cada tipo de requisito mide lo que dice', () => {
    const state = createInitialState(CONTENT, 0);
    state.records.blocks = 100;
    state.taps = 99;
    state.ascensions = 1;
    state.plumasTotal = D(10);
    expect(achievementProgress(state, { kind: 'blocks', count: 100 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'taps', count: 100 }).done).toBe(false);
    expect(achievementProgress(state, { kind: 'ascensions', count: 1 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'plumasTotal', count: 10 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'depth', count: 5 }).current.toNumber()).toBe(1);
  });
});

describe('selectores', () => {
  it('las 14 piezas se ven siempre, con las bloqueadas explicando qué falta', () => {
    const state = createInitialState(CONTENT, 0);
    const views = pieceViews(state, CONTENT);
    expect(views.length).toBe(14);
    expect(views.find((v) => v.id === 'rascador')!.unlocked).toBe(true);
    const mascara = views.find((v) => v.id === 'mascara')!;
    expect(mascara.unlocked).toBe(false);
    expect(mascara.lockedReason).toContain('nivel 118');
    expect(mascara.lockedReason).toContain('6 veces');
  });

  it('el botón dice cuántos niveles compraría según el ajuste', () => {
    const state = createInitialState(CONTENT, 0);
    state.coins = D(1e6);
    state.settings.buyAmount = 10;
    expect(pieceViews(state, CONTENT).find((v) => v.id === 'rascador')!.amountToBuy).toBe(10);
    state.settings.buyAmount = 1;
    expect(pieceViews(state, CONTENT).find((v) => v.id === 'rascador')!.amountToBuy).toBe(1);
  });

  it('las ventajas bloqueadas dicen qué requieren', () => {
    const state = createInitialState(CONTENT, 0);
    const comienzo = perkViews(state, CONTENT).find((p) => p.id === 'comienzo')!;
    expect(comienzo.missingRequirements).toEqual(['Abono de calidad']);
    expect(comienzo.purchasable).toBe(false);
  });

  it('los logros de piezas llevan la pieza para agruparlos', () => {
    const state = createInitialState(CONTENT, 0);
    const views = achievementViews(state, CONTENT);
    expect(views.find((v) => v.id === 'rascador-10')!.piece).toMatchObject({ id: 'rascador', count: 10 });
    expect(views.find((v) => v.id === 'nivel-10')!.piece).toBeNull();
  });
});
