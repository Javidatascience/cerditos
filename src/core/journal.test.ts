import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { addEntry, gameClockMs, MAX_JOURNAL_ENTRIES } from './journal.ts';
import { createInitialState } from './state.ts';

describe('addEntry', () => {
  it('añade al final', () => {
    const state = createInitialState(CONTENT, 0);
    addEntry(state, 'hola', 10);
    expect(state.journal).toEqual([{ at: 10, text: 'hola' }]);
  });

  it('guarda como mucho 100 entradas y descarta las más antiguas', () => {
    const state = createInitialState(CONTENT, 0);
    for (let i = 0; i < MAX_JOURNAL_ENTRIES + 25; i++) addEntry(state, `entrada ${i}`, i);
    expect(state.journal.length).toBe(MAX_JOURNAL_ENTRIES);
    expect(state.journal[0]!.text).toBe('entrada 25');
    expect(state.journal[state.journal.length - 1]!.text).toBe(`entrada ${MAX_JOURNAL_ENTRIES + 24}`);
  });
});

describe('gameClockMs', () => {
  it('es createdAt + segundos de juego', () => {
    const state = createInitialState(CONTENT, 1_000_000);
    state.time = 90;
    expect(gameClockMs(state)).toBe(1_090_000);
  });
});
