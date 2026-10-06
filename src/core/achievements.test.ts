import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { achievementProgress, updateAchievements } from './achievements.ts';
import { D } from './num.ts';
import { achievementViews, ascendView, perkViews, toolViews } from './selectors.ts';
import { createInitialState } from './state.ts';

describe('logros', () => {
  it('se adoptan solos y una sola vez, con línea en el diario los generales', () => {
    const state = createInitialState(CONTENT, 0);
    state.taps = 100;
    expect(updateAchievements(state, CONTENT, 7)).toEqual(['picar-100']);
    expect(state.achievements['picar-100']).toEqual({ at: 7 });
    expect(state.journal.at(-1)!.text).toContain('Picar');
    expect(updateAchievements(state, CONTENT, 8)).toEqual([]);
  });

  it('los de cantidad de herramienta no llenan el diario', () => {
    const state = createInitialState(CONTENT, 0);
    state.maxOwned['pico-de-madera'] = 20;
    expect(updateAchievements(state, CONTENT, 0)).toEqual(['pico-de-madera-1', 'pico-de-madera-5', 'pico-de-madera-15']);
    expect(state.journal.length).toBe(0);
  });

  it('cada tipo de requisito mide lo que dice', () => {
    const state = createInitialState(CONTENT, 0);
    state.ascensions = 1;
    state.plumasTotal = D(10);
    state.lifetime = D(1e6);
    expect(achievementProgress(state, { kind: 'ascensions', count: 1 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'plumasTotal', count: 10 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'lifetime', amount: 1e6 }).done).toBe(true);
    expect(achievementProgress(state, { kind: 'lifetime', amount: 1e9 }).done).toBe(false);
    expect(achievementProgress(state, { kind: 'taps', count: 5 }).current.toNumber()).toBe(0);
  });
});

describe('selectores', () => {
  it('muestra solo la herramienta descubierta y la siguiente difuminada, y el botón dice cuántas compraría', () => {
    const state = createInitialState(CONTENT, 0);
    const views = toolViews(state, CONTENT);
    expect(views.map((v) => v.reveal).slice(0, 3)).toEqual(['visible', 'teaser', 'hidden']);
    state.coins = D(1e6);
    state.settings.buyAmount = 10;
    expect(toolViews(state, CONTENT)[0]!.amountToBuy).toBe(10);
    state.settings.buyAmount = 1;
    expect(toolViews(state, CONTENT)[0]!.amountToBuy).toBe(1);
  });

  it('ascender se ve bloqueado hasta tener la herramienta 8, diciendo cuál es', () => {
    const state = createInitialState(CONTENT, 0);
    const view = ascendView(state, CONTENT);
    expect(view.unlocked).toBe(false);
    expect(view.canAscend).toBe(false);
    expect(view.requiredTool.index).toBe(7);
    expect(view.requiredTool.name).toBe('Grúa perforadora');
  });

  it('las ventajas bloqueadas dicen qué requieren', () => {
    const state = createInitialState(CONTENT, 0);
    const comienzo = perkViews(state, CONTENT).find((p) => p.id === 'comienzo')!;
    expect(comienzo.missingRequirements).toEqual(['Abono de calidad']);
    expect(comienzo.purchasable).toBe(false);
  });

  it('los logros de herramienta llevan la herramienta para agruparlos', () => {
    const state = createInitialState(CONTENT, 0);
    const views = achievementViews(state, CONTENT);
    expect(views.find((v) => v.id === 'pico-de-madera-5')!.tool).toMatchObject({ id: 'pico-de-madera', count: 5 });
    expect(views.find((v) => v.id === 'picar-100')!.tool).toBeNull();
    expect(views.length).toBe(CONTENT.achievements.length);
  });
});

describe('lo que falta para comprar', () => {
  it('cada herramienta (también la siguiente por desbloquear) dice lo que falta y cuánto tardará', () => {
    const state = createInitialState(CONTENT, 0);
    state.coins = D(4);
    const [first, second] = toolViews(state, CONTENT);
    expect(first!.canAfford).toBe(false);
    expect(first!.missing.toNumber()).toBe(6);
    expect(first!.etaSeconds).toBeNull(); // sin producción no hay estimación
    expect(second!.reveal).toBe('teaser');
    expect(second!.missing.toNumber()).toBe(106);
    state.tools['pico-de-madera'] = 1;
    state.coins = D(0);
    expect(toolViews(state, CONTENT)[1]!.etaSeconds).toBeCloseTo(110 / 0.1, 6);
    state.coins = D(100);
    expect(toolViews(state, CONTENT)[0]!.missing.toNumber()).toBe(0);
  });
});
