import { describe, expect, it } from 'vitest';
import { CONTENT } from './index.ts';
import type { Content, PerkDef, WorldDef } from './types.ts';
import { validateContent } from './validate.ts';

function baseWorld(): WorldDef {
  return {
    id: 'w1',
    name: 'Mundo 1',
    currency: 'Monedas',
    prestigeCurrency: 'Plumas',
    mechanic: 'classic',
    costGrowth: 1.15,
    startCurrency: 10,
    generators: [{ id: 'g1', name: 'G1', flavor: 'f', baseCost: 10, baseProd: 1 }],
    genUpgrades: null,
    globalUpgrades: [],
    prestige: { e0: 100, exponent: 0.5, perPluma: 0.05 },
    unlock: null,
    flavor: 'f',
  };
}

function baseContent(): Content {
  return { worlds: [baseWorld()], perks: [], varieties: [], sets: [], achievements: [] };
}

describe('validateContent', () => {
  it('el contenido real del juego no tiene errores', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('detecta un id de mundo duplicado', () => {
    const content = baseContent();
    content.worlds.push(baseWorld());
    const errors = validateContent(content);
    expect(errors.some((e) => e.includes('Mundo duplicado'))).toBe(true);
  });

  it('detecta que una ventaja requiera otra que no existe', () => {
    const content = baseContent();
    const perk: PerkDef = {
      id: 'w1.a',
      world: 'w1',
      name: 'A',
      flavor: 'f',
      maxLevel: 1,
      baseCost: 1,
      costGrowth: 1,
      requires: ['w1.fantasma'],
      effect: { kind: 'prodMult', perLevel: 1 },
    };
    content.perks = [perk];
    const errors = validateContent(content);
    expect(errors.some((e) => e.includes('ventaja inexistente'))).toBe(true);
  });

  it('detecta un ciclo en las ventajas', () => {
    const content = baseContent();
    const a: PerkDef = {
      id: 'w1.a',
      world: 'w1',
      name: 'A',
      flavor: 'f',
      maxLevel: 1,
      baseCost: 1,
      costGrowth: 1,
      requires: ['w1.b'],
      effect: { kind: 'prodMult', perLevel: 1 },
    };
    const b: PerkDef = {
      id: 'w1.b',
      world: 'w1',
      name: 'B',
      flavor: 'f',
      maxLevel: 1,
      baseCost: 1,
      costGrowth: 1,
      requires: ['w1.a'],
      effect: { kind: 'prodMult', perLevel: 1 },
    };
    content.perks = [a, b];
    const errors = validateContent(content);
    expect(errors.some((e) => e.includes('Ciclo de ventajas'))).toBe(true);
  });

  it('detecta un genCount que apunta a un cerdito inexistente', () => {
    const content = baseContent();
    content.sets = [{ id: 's1', name: 'Set 1', bonus: { kind: 'prod', world: 'w1', mult: 1.1 } }];
    content.varieties = [
      {
        id: 'v1',
        name: 'V1',
        flavor: 'f',
        set: 's1',
        requires: [{ kind: 'genCount', world: 'w1', gen: 'fantasma', count: 5 }],
        bonus: { kind: 'prod', world: 'w1', mult: 1.05 },
      },
    ];
    const errors = validateContent(content);
    expect(errors.some((e) => e.includes('cerdito desconocido'))).toBe(true);
  });

  it('el primer mundo debe estar abierto desde el inicio', () => {
    const content = baseContent();
    content.worlds[0]!.unlock = { world: 'w1', gen: 'g1', count: 10 }; // además, auto-referencia
    const errors = validateContent(content);
    expect(errors.some((e) => e.includes('primer mundo'))).toBe(true);
  });
});
