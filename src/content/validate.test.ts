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
    c.tools.push({ ...c.tools[0]! });
    expect(validateContent(c).some((e) => e.includes('Herramienta duplicado'))).toBe(true);
  });

  it('detecta herramientas con números no válidos y una herramienta de ascensión inexistente', () => {
    const c = clone();
    c.tools[0]!.baseProd = 0;
    c.game.ascendTool = 99;
    const errors = validateContent(c);
    expect(errors.some((e) => e.includes('baseProd'))).toBe(true);
    expect(errors.some((e) => e.includes('ascendTool'))).toBe(true);
  });

  it('exige hitos crecientes', () => {
    const c = clone();
    c.game.milestones = [5, 5, 10];
    expect(validateContent(c).some((e) => e.includes('milestones'))).toBe(true);
  });

  it('detecta una ventaja que requiere otra inexistente y un ciclo', () => {
    const c = clone();
    c.perks[1]!.requires = ['fantasma'];
    expect(validateContent(c).some((e) => e.includes('ventaja inexistente'))).toBe(true);
    const d = clone();
    d.perks[0]!.requires = ['comienzo'];
    expect(validateContent(d).some((e) => e.includes('Ciclo de ventajas'))).toBe(true);
  });

  it('detecta un logro de una herramienta inexistente', () => {
    const c = clone();
    c.achievements.push({ id: 'x', name: 'x', flavor: 'x', requires: { kind: 'toolCount', tool: 'fantasma', count: 1 } });
    expect(validateContent(c).some((e) => e.includes('herramienta desconocida'))).toBe(true);
  });
});
