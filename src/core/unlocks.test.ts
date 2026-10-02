import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { setActiveWorld } from './actions.ts';
import { simulateOffline } from './offline.ts';
import { D } from './num.ts';
import { worldTabs } from './selectors.ts';
import { createInitialState } from './state.ts';
import { advance } from './tick.ts';
import { unlockProgress, updateUnlocks } from './unlocks.ts';

const BOSQUE = CONTENT.worlds.find((w) => w.id === 'bosque')!;

describe('desbloqueo de mundos', () => {
  it('el umbral es exacto (60.000 plumas del Valle)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(59_999);
    expect(updateUnlocks(state, CONTENT, 0)).toEqual([]);
    expect(state.worlds['bosque']!.unlocked).toBe(false);
    state.worlds['valle']!.plumasTotal = D(60_000);
    expect(updateUnlocks(state, CONTENT, 0)).toEqual(['bosque']);
    expect(state.worlds['bosque']!.unlocked).toBe(true);
  });

  it('da la moneda inicial y deja una entrada en el diario', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(60_000);
    updateUnlocks(state, CONTENT, 123);
    expect(state.worlds['bosque']!.currency.toNumber()).toBe(BOSQUE.startCurrency);
    expect(state.journal.at(-1)).toMatchObject({ at: 123 });
    expect(state.journal.at(-1)!.text).toContain('El Bosque');
  });

  it('no se desbloquea dos veces (ni regala moneda otra vez)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(60_000);
    updateUnlocks(state, CONTENT, 0);
    state.worlds['bosque']!.currency = D(7);
    expect(updateUnlocks(state, CONTENT, 1)).toEqual([]);
    expect(state.worlds['bosque']!.currency.toNumber()).toBe(7);
    expect(state.journal.length).toBe(1);
  });

  it('unlockProgress muestra el progreso y el mundo inicial no tiene requisito', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(12_300);
    expect(unlockProgress(state, BOSQUE)).toEqual({ fromWorld: 'valle', current: 12_300, target: 60_000, done: false });
    expect(unlockProgress(state, CONTENT.worlds[0]!)).toBeNull();
  });

  it('advance() desbloquea y ambos mundos producen a la vez, también offline', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(60_000);
    advance(state, CONTENT, 1);
    expect(state.worlds['bosque']!.unlocked).toBe(true);
    state.worlds['valle']!.generators['lechon']!.owned = D(10);
    state.worlds['bosque']!.generators['buscadora']!.owned = D(10);
    const before = [state.worlds['valle']!.lifetimeEarned, state.worlds['bosque']!.lifetimeEarned];
    const summary = simulateOffline(state, CONTENT, 3600);
    expect(state.worlds['valle']!.lifetimeEarned.gt(before[0]!)).toBe(true);
    expect(state.worlds['bosque']!.lifetimeEarned.gt(before[1]!)).toBe(true);
    expect(summary.earnedByWorld['bosque']!.gt(0)).toBe(true);
  });
});

describe('pestañas de mundo', () => {
  it('muestra los abiertos y solo el siguiente en gris, con su requisito', () => {
    const state = createInitialState(CONTENT, 0);
    const tabs = worldTabs(state, CONTENT);
    expect(tabs.map((t) => t.id)).toEqual(['valle', 'bosque']);
    expect(tabs[1]).toMatchObject({ unlocked: false, requirement: { fromWorldName: 'El Valle', target: 60_000 } });
  });

  it('setActiveWorld solo cambia a mundos desbloqueados', () => {
    const state = createInitialState(CONTENT, 0);
    setActiveWorld(state, 'bosque');
    expect(state.activeWorld).toBe('valle');
    state.worlds['bosque']!.unlocked = true;
    setActiveWorld(state, 'bosque');
    expect(state.activeWorld).toBe('bosque');
  });
});
