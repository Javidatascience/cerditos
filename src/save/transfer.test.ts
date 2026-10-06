import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { D } from '../core/num.ts';
import { createInitialState } from '../core/state.ts';
import { CURRENT_VERSION } from './serialize.ts';
import { exportSave, parseImport } from './transfer.ts';

/** Mismo algoritmo que transfer.ts (no exportado): solo para construir un código a mano en
 * el test de "versión futura", sin depender de exportSave (que ya valida la versión actual). */
function fnv1aForTest(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('exportSave / parseImport', () => {
  it('exportar e importar reproduce el mismo estado', () => {
    const state = createInitialState(CONTENT, 0);
    state.coins = D('1.2345e42');
    state.gear['rascador'] = 9;

    const code = exportSave(state, 1000);
    const result = parseImport(code);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.version).toBe(CURRENT_VERSION);
    expect(result.data.state.coins).toBe('1.2345e+42');
    expect(result.data.state.gear['rascador']).toBe(9);
  });

  it('empieza por el prefijo esperado', () => {
    const state = createInitialState(CONTENT, 0);
    expect(exportSave(state, 0).startsWith('CERDITOS1:')).toBe(true);
  });

  it('rechaza un texto que no tiene el prefijo', () => {
    const result = parseImport('esto no es un código de partida');
    expect(result.ok).toBe(false);
  });

  it('detecta un carácter cambiado en el código (checksum)', () => {
    const state = createInitialState(CONTENT, 0);
    const code = exportSave(state, 0);
    // Cambia un carácter en medio de la parte base64 (no en el checksum).
    const mid = Math.floor(code.length / 2);
    const corrupted = code.slice(0, mid) + (code[mid] === 'A' ? 'B' : 'A') + code.slice(mid + 1);
    const result = parseImport(corrupted);
    expect(result.ok).toBe(false);
  });

  it('detecta un código truncado (copia incompleta)', () => {
    const state = createInitialState(CONTENT, 0);
    const code = exportSave(state, 0);
    const truncated = code.slice(0, code.length - 10);
    const result = parseImport(truncated);
    expect(result.ok).toBe(false);
  });

  it('rechaza una versión futura (construida a mano con el mismo formato de checksum)', () => {
    const tampered = { format: 'cerditos' as const, version: CURRENT_VERSION + 1, savedAt: 0, state: {} };
    const b64 = Buffer.from(JSON.stringify(tampered), 'utf-8').toString('base64');
    const code = `CERDITOS1:${b64}:${fnv1aForTest(b64)}`;
    const result = parseImport(code);
    expect(result.ok).toBe(false);
  });

  it('acepta tildes y eñes (UTF-8) sin corromperse', () => {
    const state = createInitialState(CONTENT, 0);
    state.journal.push({ at: 1, text: 'Ha llegado a Roca. Niñez, mañana, corazón.' });
    const code = exportSave(state, 0);
    const result = parseImport(code);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.state.journal[0]!.text).toBe('Ha llegado a Roca. Niñez, mañana, corazón.');
  });
});
