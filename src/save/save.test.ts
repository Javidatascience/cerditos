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
    state.lifetime = D('2.5e500');
    state.tools['pico-de-madera'] = 7;
    state.upgrades['pico-de-madera'] = 1;
    state.maxOwned['pico-de-madera'] = 9;
    state.revealed = 3;
    state.perks['abono'] = 3;
    state.plumas = D(9);
    state.plumasTotal = D(40);
    state.ascensions = 2;
    state.taps = 5;
    state.basketSince = 11;
    state.buff = { mult: 5, until: 99 };
    state.achievements['picar-100'] = { at: 1 };
    state.globalUpgrades['comedero-grande'] = true;
    state.momentum = 0.4;
    state.acorns = 7;
    state.skins['azulado'] = true;
    state.activeSkin = 'azulado';
    state.companions['topo'] = true;
    state.activeCompanions = ['topo'];
    state.stats = { visitors: 3, bestIncome: D('1.5e400') };
    state.cave.dragonStage = 2;
    state.wardrobe = { owned: { hechicero: true }, worn: { head: 'hechicero', body: null, tail: null } };
    state.journal.push({ at: 2, text: 'hola' });

    const back = deserialize(serialize(state, 456));
    expect(back.coins.toString()).toBe(state.coins.toString());
    expect(back.lifetime.toString()).toBe(state.lifetime.toString());
    expect(back).toMatchObject({
      createdAt: 123,
      tools: { 'pico-de-madera': 7 },
      upgrades: { 'pico-de-madera': 1 },
      maxOwned: { 'pico-de-madera': 9 },
      revealed: 3,
      perks: { abono: 3 },
      ascensions: 2,
      taps: 5,
      basketSince: 11,
      buff: { mult: 5, until: 99 },
      achievements: { 'picar-100': { at: 1 } },
      globalUpgrades: { 'comedero-grande': true },
      momentum: 0.4,
      acorns: 7,
      skins: { azulado: true },
      activeSkin: 'azulado',
      companions: { topo: true },
      activeCompanions: ['topo'],
    });
    expect(back.stats.visitors).toBe(3);
    expect(back.stats.bestIncome.toString()).toBe(D('1.5e400').toString());
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

  it('rechaza las partidas de juegos anteriores (versiones 1 a 4) con un mensaje claro', () => {
    for (const version of [1, 2, 3, 4]) {
      expect(() => migrate({ format: 'cerditos', version, savedAt: 0, state: {} })).toThrow(/versión anterior/);
    }
  });

  it('rechaza una versión futura, datos basura y versiones inválidas', () => {
    expect(() => migrate({ format: 'cerditos', version: CURRENT_VERSION + 1, savedAt: 0, state: {} })).toThrow(SaveValidationError);
    for (const bad of [null, 'texto', 42, [], { hola: 'mundo' }, { format: 'otro', version: 5 }, { format: 'cerditos', version: 'uno' }, { format: 'cerditos', version: 0 }]) {
      expect(() => migrate(bad)).toThrow(SaveValidationError);
    }
    expect(() => migrate({ format: 'cerditos', version: CURRENT_VERSION })).toThrow(SaveValidationError); // sin state
  });
});

describe('migración v5 → v6', () => {
  it('da como compradas las mejoras que ya correspondían a las unidades que se tenían', () => {
    const state = createInitialState(CONTENT, 0);
    const v6 = JSON.parse(JSON.stringify(serialize(state, 0)));
    const v5 = { ...v6, version: 5, state: { ...v6.state, version: 5, tools: { 'pico-de-madera': 30, 'cubo-y-pala': 3 } } };
    delete v5.state.upgrades;
    const data = migrate(v5);
    expect(data.version).toBe(CURRENT_VERSION);
    expect(data.state.upgrades).toEqual({ 'pico-de-madera': 3 }); // 5, 15 y 25
  });
});

describe('migración v6 → v7', () => {
  it('añade los campos nuevos con valores neutros', () => {
    const state = createInitialState(CONTENT, 0);
    const v7 = JSON.parse(JSON.stringify(serialize(state, 0)));
    const v6 = { ...v7, version: 6, state: { ...v7.state, version: 6 } };
    for (const key of ['globalUpgrades', 'momentum', 'acorns', 'skins', 'activeSkin', 'companions', 'activeCompanions', 'stats']) delete v6.state[key];
    const data = migrate(v6);
    expect(data.version).toBe(CURRENT_VERSION);
    expect(data.state).toMatchObject({ globalUpgrades: {}, momentum: 0, acorns: 0, skins: {}, activeSkin: 'rosa', companions: {}, activeCompanions: [], stats: { visitors: 0, bestIncome: '0' } });
  });
});

describe('normalize', () => {
  it('descarta herramientas, ventajas y logros que ya no existen', () => {
    const state = createInitialState(CONTENT, 0);
    state.tools['fantasma'] = 3;
    state.maxOwned['fantasma'] = 3;
    state.perks['fantasma'] = 1;
    state.achievements['fantasma'] = { at: 0 };
    normalize(state, CONTENT);
    expect(state.tools['fantasma']).toBeUndefined();
    expect(state.maxOwned['fantasma']).toBeUndefined();
    expect(state.perks['fantasma']).toBeUndefined();
    expect(state.achievements['fantasma']).toBeUndefined();
  });

  it('acota niveles de ventaja y repara las herramientas descubiertas', () => {
    const state = createInitialState(CONTENT, 0);
    state.perks['comienzo'] = 99;
    state.upgrades['pico-de-madera'] = 99;
    state.revealed = 0;
    state.activeSkin = 'fantasma';
    state.activeCompanions = ['fantasma', 'topo', 'topo', 'perro', 'gato'];
    state.momentum = 7;
    state.tools['cubo-y-pala'] = 4;
    normalize(state, CONTENT);
    expect(state.perks['comienzo']).toBe(5);
    expect(state.activeSkin).toBe('rosa');
    expect(state.activeCompanions).toEqual(['perro', 'gato']);
    expect(state.momentum).toBe(1);
    expect(state.upgrades['pico-de-madera']).toBe(CONTENT.game.milestones.length);
    expect(state.maxOwned['cubo-y-pala']).toBe(4);
    expect(state.revealed).toBeGreaterThanOrEqual(2); // si se tiene la 2.ª, ya está descubierta
  });

  it('es seguro llamarlo siempre: un estado correcto no cambia', () => {
    const state = createInitialState(CONTENT, 0);
    normalize(state, CONTENT);
    const before = JSON.stringify(serialize(state, 0));
    normalize(state, CONTENT);
    expect(JSON.stringify(serialize(state, 0))).toBe(before);
  });
});
