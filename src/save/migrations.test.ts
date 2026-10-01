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
