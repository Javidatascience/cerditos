import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { ascend } from './actions.ts';
import { collectionMultiplier, requirementProgress, updateCollection } from './collection.ts';
import { globalMultiplier, totalCostMultiplier } from './formulas.ts';
import { D } from './num.ts';
import { albumViews, journalEntries } from './selectors.ts';
import { createInitialState } from './state.ts';
import { advance } from './tick.ts';

describe('requirementProgress (cada tipo de requisito)', () => {
  it('genCount: usa el máximo comprado alguna vez', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.records.maxBought['lechon'] = 60;
    const p = requirementProgress(state, { kind: 'genCount', world: 'valle', gen: 'lechon', count: 100 });
    expect(p.current.toNumber()).toBe(60);
    expect(p.target.toNumber()).toBe(100);
    expect(p.done).toBe(false);
    state.worlds['valle']!.records.maxBought['lechon'] = 100;
    expect(requirementProgress(state, { kind: 'genCount', world: 'valle', gen: 'lechon', count: 100 }).done).toBe(true);
  });

  it('ascensions', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.ascensions = 5;
    expect(requirementProgress(state, { kind: 'ascensions', world: 'valle', count: 5 }).done).toBe(true);
    expect(requirementProgress(state, { kind: 'ascensions', world: 'valle', count: 6 }).done).toBe(false);
  });

  it('plumasTotal', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.plumasTotal = D(99);
    expect(requirementProgress(state, { kind: 'plumasTotal', world: 'valle', count: 100 }).done).toBe(false);
    state.worlds['valle']!.plumasTotal = D(100);
    expect(requirementProgress(state, { kind: 'plumasTotal', world: 'valle', count: 100 }).done).toBe(true);
  });

  it('lifetime (con números enormes)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['bosque']!.lifetimeEarned = D('1e33');
    expect(requirementProgress(state, { kind: 'lifetime', world: 'bosque', amount: 1e33 }).done).toBe(true);
    expect(requirementProgress(state, { kind: 'lifetime', world: 'bosque', amount: 1e34 }).done).toBe(false);
  });

  it('harmony', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['huerta']!.records.maxHarmony = 25;
    expect(requirementProgress(state, { kind: 'harmony', world: 'huerta', count: 25 }).done).toBe(true);
    expect(requirementProgress(state, { kind: 'harmony', world: 'huerta', count: 150 }).done).toBe(false);
  });

  it('varieties: cuenta cuántas de las pedidas hay en la colección', () => {
    const state = createInitialState(CONTENT, 0);
    state.collection['a'] = { adoptedAt: 0 };
    const p = requirementProgress(state, { kind: 'varieties', ids: ['a', 'b'] });
    expect(p.current.toNumber()).toBe(1);
    expect(p.target.toNumber()).toBe(2);
    expect(p.done).toBe(false);
  });

  it('no lanza con mundos o cerditos inexistentes (cuenta como 0)', () => {
    const state = createInitialState(CONTENT, 0);
    expect(requirementProgress(state, { kind: 'ascensions', world: 'fantasma', count: 1 }).done).toBe(false);
  });
});

describe('updateCollection', () => {
  it('adopta lo cumplido, anota en el diario y no vuelve a adoptarlo', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.records.maxBought['lechon'] = 100;
    const adopted = updateCollection(state, CONTENT, 5000);
    expect(adopted).toEqual(['lechon-manchado']);
    expect(state.collection['lechon-manchado']).toEqual({ adoptedAt: 5000 });
    expect(state.journal[state.journal.length - 1]!.text).toContain('Lechón manchado');
    expect(updateCollection(state, CONTENT, 6000)).toEqual([]);
    expect(state.journal.length).toBe(1);
  });

  it('cruces en cadena en una sola llamada', () => {
    const state = createInitialState(CONTENT, 0);
    // Ibérico de bellota + Buscadora veterana → Trufero ibérico (cruce, que a su vez cuenta
    // para Cerdo de oro junto a los otros tres cruces).
    state.worlds['valle']!.records.maxBought['iberico'] = 245;
    state.worlds['bosque']!.ascensions = 1;
    const adopted = updateCollection(state, CONTENT, 0);
    expect(adopted).toContain('iberico-de-bellota');
    expect(adopted).toContain('buscadora-veterana');
    expect(adopted).toContain('trufero-iberico');
  });

  it('un cruce no se adopta si falta una de las variedades', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.records.maxBought['iberico'] = 245;
    updateCollection(state, CONTENT, 0);
    expect(state.collection['trufero-iberico']).toBeUndefined();
  });

  it('advance() la ejecuta sola', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.ascensions = 5;
    advance(state, CONTENT, 1);
    expect(state.collection['cerdito-boina']).toBeDefined();
  });

  it('la colección sobrevive a ascend', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['valle']!.lifetimeEarned = D(1e12);
    state.collection['lechon-manchado'] = { adoptedAt: 1 };
    ascend(state, CONTENT, 'valle', 0);
    expect(state.collection['lechon-manchado']).toEqual({ adoptedAt: 1 });
  });
});

describe('collectionMultiplier', () => {
  it('es 1 sin variedades', () => {
    const state = createInitialState(CONTENT, 0);
    expect(collectionMultiplier(state, CONTENT, 'valle', 'prod')).toBe(1);
    expect(collectionMultiplier(state, CONTENT, 'valle', 'cost')).toBe(1);
  });

  it('una variedad del Valle da +5 % al Valle y nada al Bosque', () => {
    const state = createInitialState(CONTENT, 0);
    state.collection['lechon-manchado'] = { adoptedAt: 0 };
    expect(collectionMultiplier(state, CONTENT, 'valle', 'prod')).toBeCloseTo(1.05, 9);
    expect(collectionMultiplier(state, CONTENT, 'bosque', 'prod')).toBe(1);
  });

  it('el bono del set solo llega con el set completo', () => {
    const state = createInitialState(CONTENT, 0);
    const ids = ['lechon-manchado', 'rosa-de-concurso', 'duroc-pelirrojo'];
    for (const id of ids) state.collection[id] = { adoptedAt: 0 };
    expect(collectionMultiplier(state, CONTENT, 'valle', 'prod')).toBeCloseTo(1.05 ** 3, 9);
    state.collection['iberico-de-bellota'] = { adoptedAt: 0 };
    expect(collectionMultiplier(state, CONTENT, 'valle', 'prod')).toBeCloseTo(1.05 ** 4 * 1.25, 9);
  });

  it('el set de Curiosos abarata los costes en todos los mundos', () => {
    const state = createInitialState(CONTENT, 0);
    for (const v of CONTENT.varieties.filter((x) => x.set === 'curiosos')) state.collection[v.id] = { adoptedAt: 0 };
    expect(collectionMultiplier(state, CONTENT, 'bosque', 'cost')).toBeCloseTo(0.95, 9);
    expect(totalCostMultiplier(state, CONTENT, 'valle')).toBeCloseTo(0.95, 9);
  });

  it('se aplica al multiplicador global', () => {
    const state = createInitialState(CONTENT, 0);
    const before = globalMultiplier(state, CONTENT, 'valle');
    state.collection['lechon-manchado'] = { adoptedAt: 0 };
    expect(globalMultiplier(state, CONTENT, 'valle') / before).toBeCloseTo(1.05, 9);
  });
});

describe('albumViews', () => {
  it('muestra desde el principio el requisito exacto de todas las variedades', () => {
    const state = createInitialState(CONTENT, 0);
    const views = albumViews(state, CONTENT);
    const all = views.flatMap((s) => s.varieties);
    expect(all.length).toBe(CONTENT.varieties.length);
    for (const v of all) {
      expect(v.owned).toBe(false);
      expect(v.requirements.length).toBeGreaterThan(0);
      for (const r of v.requirements) expect(r.describe((n) => n.toString())).not.toBe('');
    }
    const iberico = all.find((v) => v.id === 'iberico-de-bellota')!;
    expect(iberico.requirements[0]!.describe((n) => n.toString())).toBe('Ten 200 Ibérico a la vez en El Valle');
  });
});

describe('diario', () => {
  it('journalEntries devuelve lo más reciente primero', () => {
    const state = createInitialState(CONTENT, 0);
    state.journal.push({ at: 1, text: 'primera' }, { at: 2, text: 'segunda' });
    expect(journalEntries(state).map((e) => e.text)).toEqual(['segunda', 'primera']);
  });
});
