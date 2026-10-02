import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION } from './serialize.ts';
import { migrate, SaveValidationError } from './migrations.ts';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf-8'));
}

describe('migrate', () => {
  it('v1.json carga sin errores y llega a CURRENT_VERSION', () => {
    const data = migrate(loadFixture('v1.json'));
    expect(data.version).toBe(CURRENT_VERSION);
    expect(data.format).toBe('cerditos');
    expect(data.state.worlds['valle']).toBeDefined();
  });

  it('v1 → v2 añade visitante, logros, rascados, cesta y cerditos descubiertos', () => {
    const data = migrate(loadFixture('v1.json'));
    const state = data.state;
    expect(state.version).toBe(2);
    expect(state.buff).toBeNull();
    expect(state.achievements).toEqual({});
    expect(state.taps).toBe(0);
    // la fixture v1 tiene 3 lechones comprados: se descubre solo el primero (y el siguiente se ve difuminado)
    expect(state.worlds['valle']!.revealed).toBe(1);
    expect(state.worlds['valle']!.basketSince).toBe(state.time);
  });

  it('v2.json carga sin cambios', () => {
    const data = migrate(loadFixture('v2.json'));
    expect(data.version).toBe(2);
    expect(data.state.worlds['valle']!.revealed).toBeGreaterThanOrEqual(1);
  });

  it('rechaza un guardado de una versión más nueva que el juego', () => {
    const future = { format: 'cerditos', version: CURRENT_VERSION + 1, savedAt: 0, state: {} };
    expect(() => migrate(future)).toThrow(SaveValidationError);
  });

  it('rechaza datos basura', () => {
    expect(() => migrate(null)).toThrow(SaveValidationError);
    expect(() => migrate('un texto cualquiera')).toThrow(SaveValidationError);
    expect(() => migrate(42)).toThrow(SaveValidationError);
    expect(() => migrate([])).toThrow(SaveValidationError);
  });

  it('rechaza un objeto que no tiene pinta de guardado de Cerditos', () => {
    expect(() => migrate({ hola: 'mundo' })).toThrow(SaveValidationError);
    expect(() => migrate({ format: 'otro-juego', version: 1 })).toThrow(SaveValidationError);
  });

  it('rechaza una versión no numérica o negativa', () => {
    expect(() => migrate({ format: 'cerditos', version: 'uno' })).toThrow(SaveValidationError);
    expect(() => migrate({ format: 'cerditos', version: -1 })).toThrow(SaveValidationError);
    expect(() => migrate({ format: 'cerditos', version: 0 })).toThrow(SaveValidationError);
  });

  it('exige que haya un campo state', () => {
    expect(() => migrate({ format: 'cerditos', version: 1 })).toThrow(SaveValidationError);
  });
});
