import { describe, expect, it } from 'vitest';
import { CONTENT } from './index.ts';
import type { Content } from './types.ts';
import { validateContent } from './validate.ts';

function clone(): Content {
  return structuredClone(CONTENT);
}

describe('validateContent', () => {
  it('el contenido real del juego no tiene errores', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('detecta ids duplicados', () => {
    const c = clone();
    c.pieces.push({ ...c.pieces[0]! });
    expect(validateContent(c).some((e) => e.includes('Pieza duplicado'))).toBe(true);
  });

  it('detecta una zona con material inexistente', () => {
    const c = clone();
    c.zones[0]!.material = 'fantasma';
    expect(validateContent(c).some((e) => e.includes('material desconocido'))).toBe(true);
  });

  it('detecta un peligro de zona que ninguna pieza resiste', () => {
    const c = clone();
    c.pieces = c.pieces.filter((p) => !(p.effect.kind === 'resist' && p.effect.hazard === 'frio'));
    expect(validateContent(c).some((e) => e.includes('ninguna pieza resiste frio'))).toBe(true);
  });

  it('detecta una ventaja que requiere otra inexistente y un ciclo', () => {
    const c = clone();
    c.perks[1]!.requires = ['fantasma'];
    expect(validateContent(c).some((e) => e.includes('ventaja inexistente'))).toBe(true);
    const d = clone();
    d.perks[0]!.requires = ['comienzo'];
    expect(validateContent(d).some((e) => e.includes('Ciclo de ventajas'))).toBe(true);
  });

  it('detecta un logro de una pieza inexistente', () => {
    const c = clone();
    c.achievements.push({ id: 'x', name: 'x', flavor: 'x', requires: { kind: 'pieceLevel', piece: 'fantasma', count: 1 } });
    expect(validateContent(c).some((e) => e.includes('pieza desconocida'))).toBe(true);
  });
});
