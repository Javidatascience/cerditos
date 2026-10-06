import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { D } from '../core/num.ts';
import { createInitialState } from '../core/state.ts';
import { migrate, SaveValidationError } from './migrations.ts';
import { normalize } from './normalize.ts';
import { CURRENT_VERSION, deserialize, serialize } from './serialize.ts';

describe('serialize / deserialize', () => {
  it('ida y vuelta conserva todo el estado, incluidos Decimal enormes', () => {
    const state = createInitialState(CONTENT, 123);
    state.coins = D('1.5e400'); // fuera del rango de number
    state.materials['piedra'] = D('2.5e30');
    state.gear['rascador'] = 7;
    state.perks['abono'] = 3;
    state.plumas = D(9);
    state.plumasTotal = D(40);
    state.depth = 33;
    state.blockHp = 12.5;
    state.runMaxDepth = 40;
    state.records = { maxDepth: 77, blocks: 1234 };
    state.farmZone = 1;
    state.taps = 5;
    state.buff = { mult: 5, until: 99 };
    state.achievements['nivel-10'] = { at: 1 };
    state.journal.push({ at: 2, text: 'hola' });

    const back = deserialize(serialize(state, 456));
    expect(back.coins.toString()).toBe(state.coins.toString());
    expect(back.materials['piedra']!.toString()).toBe(state.materials['piedra']!.toString());
    expect(back).toMatchObject({
      createdAt: 123,
      depth: 33,
      blockHp: 12.5,
      runMaxDepth: 40,
      records: { maxDepth: 77, blocks: 1234 },
      farmZone: 1,
      taps: 5,
      buff: { mult: 5, until: 99 },
      gear: { rascador: 7 },
      perks: { abono: 3 },
      achievements: { 'nivel-10': { at: 1 } },
    });
    expect(back.plumasTotal.toNumber()).toBe(40);
    expect(back.journal).toEqual([{ at: 2, text: 'hola' }]);
  });

  it('el SaveData lleva el formato y la versión actuales', () => {
    const data = serialize(createInitialState(CONTENT, 0), 5);
    expect(data).toMatchObject({ format: 'cerditos', version: CURRENT_VERSION, savedAt: 5 });
  });
});

describe('migrate', () => {
  it('un guardado actual pasa sin cambios', () => {
    const data = migrate(JSON.parse(JSON.stringify(serialize(createInitialState(CONTENT, 0), 0))));
    expect(data.version).toBe(CURRENT_VERSION);
  });

  it('rechaza las partidas de las granjas (versiones 1 a 3) con un mensaje claro', () => {
    for (const version of [1, 2, 3]) {
      expect(() => migrate({ format: 'cerditos', version, savedAt: 0, state: {} })).toThrow(/versión anterior/);
    }
  });

  it('rechaza una versión futura, datos basura y versiones inválidas', () => {
    expect(() => migrate({ format: 'cerditos', version: CURRENT_VERSION + 1, savedAt: 0, state: {} })).toThrow(SaveValidationError);
    for (const bad of [null, 'texto', 42, [], { hola: 'mundo' }, { format: 'otro', version: 4 }, { format: 'cerditos', version: 'uno' }, { format: 'cerditos', version: 0 }]) {
      expect(() => migrate(bad)).toThrow(SaveValidationError);
    }
    expect(() => migrate({ format: 'cerditos', version: CURRENT_VERSION })).toThrow(SaveValidationError); // sin state
  });
});

describe('normalize', () => {
  it('descarta piezas, materiales, ventajas y logros que ya no existen', () => {
    const state = createInitialState(CONTENT, 0);
    state.gear['fantasma'] = 3;
    state.materials['humo'] = D(1);
    state.perks['fantasma'] = 1;
    state.achievements['fantasma'] = { at: 0 };
    normalize(state, CONTENT);
    expect(state.gear['fantasma']).toBeUndefined();
    expect(state.materials['humo']).toBeUndefined();
    expect(state.perks['fantasma']).toBeUndefined();
    expect(state.achievements['fantasma']).toBeUndefined();
  });

  it('acota niveles de pieza y profundidades fuera de rango y repara la vida del bloque', () => {
    const state = createInitialState(CONTENT, 0);
    state.gear['rascador'] = 9999;
    state.depth = -5;
    state.runMaxDepth = 0;
    state.blockHp = NaN;
    state.farmZone = 99;
    normalize(state, CONTENT);
    expect(state.gear['rascador']).toBe(CONTENT.pieces[0]!.maxLevel);
    expect(state.depth).toBe(1);
    expect(state.runMaxDepth).toBe(1);
    expect(state.blockHp).toBe(CONTENT.mine.hpBase);
    expect(state.farmZone).toBeNull();
  });

  it('es seguro llamarlo siempre: un estado correcto no cambia', () => {
    const state = createInitialState(CONTENT, 0);
    const before = JSON.stringify(serialize(state, 0));
    normalize(state, CONTENT);
    expect(JSON.stringify(serialize(state, 0))).toBe(before);
  });
});
