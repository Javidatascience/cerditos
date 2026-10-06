import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { D } from '../core/num.ts';
import { createInitialState } from '../core/state.ts';
import type { SaveStorage } from './storage.ts';
import { createLocalStorageStorage, loadGame, saveGame } from './storage.ts';
import { serialize } from './serialize.ts';

function memoryStorage(initial: Record<string, string> = {}): SaveStorage {
  const mem: Record<string, string> = { ...initial };
  return {
    read: (key) => (key in mem ? mem[key]! : null),
    write: (key, value) => {
      mem[key] = value;
    },
  };
}

describe('loadGame', () => {
  it('sin ningún guardado, crea una partida nueva', () => {
    const storage = memoryStorage();
    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('new');
    expect(result.state.createdAt).toBe(1000);
  });

  it('carga la partida principal si es válida', () => {
    const storage = memoryStorage();
    const state = createInitialState(CONTENT, 0);
    state.coins = D(123);
    saveGame(storage, state, 0);

    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('main');
    expect(result.state.coins.toNumber()).toBe(123);
  });

  it('si la principal está corrupta, usa el respaldo', () => {
    const state = createInitialState(CONTENT, 0);
    state.coins = D(55);
    const goodSave = JSON.stringify(serialize(state, 0));

    const storage = memoryStorage({
      'cerditos:save': '{ esto no es JSON válido',
      'cerditos:save:backup': goodSave,
    });

    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('backup');
    expect(result.state.coins.toNumber()).toBe(55);
    expect(result.state.journal.some((e) => e.text.includes('copia de seguridad'))).toBe(true);
    expect(result.state.journal[result.state.journal.length - 1]!.at).toBe(1000);
  });

  it('si la principal falla la validación (no un JSON corrupto, pero no es un guardado), usa el respaldo', () => {
    const state = createInitialState(CONTENT, 0);
    const goodSave = JSON.stringify(serialize(state, 0));
    const storage = memoryStorage({
      'cerditos:save': JSON.stringify({ no: 'es un guardado' }),
      'cerditos:save:backup': goodSave,
    });

    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('backup');
  });

  it('una partida de la versión anterior (las granjas) se ignora y empieza una nueva', () => {
    const storage = memoryStorage({ 'cerditos:save': JSON.stringify({ format: 'cerditos', version: 3, savedAt: 0, state: {} }) });
    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('new');
  });

  it('si principal y respaldo están corruptos, crea una partida nueva', () => {
    const storage = memoryStorage({
      'cerditos:save': 'basura',
      'cerditos:save:backup': 'más basura',
    });
    const result = loadGame(storage, CONTENT, 1000);
    expect(result.source).toBe('new');
  });
});

describe('saveGame', () => {
  it('el guardado anterior pasa a ser el respaldo', () => {
    const storage = memoryStorage();
    const first = createInitialState(CONTENT, 0);
    first.coins = D(10);
    saveGame(storage, first, 0);

    const second = createInitialState(CONTENT, 0);
    second.coins = D(20);
    saveGame(storage, second, 0);

    const main = JSON.parse(storage.read('cerditos:save')!);
    const backup = JSON.parse(storage.read('cerditos:save:backup')!);
    expect(main.state.coins).toBe('20');
    expect(backup.state.coins).toBe('10');
  });

  it('la primera vez no crea un respaldo (no hay guardado anterior)', () => {
    const storage = memoryStorage();
    const state = createInitialState(CONTENT, 0);
    saveGame(storage, state, 0);
    expect(storage.read('cerditos:save:backup')).toBeNull();
  });
});

describe('createLocalStorageStorage', () => {
  // Los tests corren en Node (sin DOM): `window` no existe, así que leer/escribir con
  // `createLocalStorageStorage()` aquí dispara exactamente el mismo camino que en el
  // navegador cuando localStorage falla (modo privado, cuota llena…): debe tratarse como
  // "no hay guardado" en vez de reventar.
  it('nunca lanza aunque no haya localStorage disponible', () => {
    const storage = createLocalStorageStorage();
    expect(() => storage.read('cerditos:save')).not.toThrow();
    expect(storage.read('cerditos:save')).toBeNull();
    expect(() => storage.write('cerditos:save', '{}')).not.toThrow();
  });
});
