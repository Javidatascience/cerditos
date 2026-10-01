import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { runAutobuy, runAutobuyForAllWorlds } from './autobuy.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

function stateWithCapataz(currency: number) {
  const state = createInitialState(CONTENT, 0);
  const world = state.worlds['valle']!;
  world.perks['valle.capataz'] = 1;
  world.currency = D(currency); // reemplaza los 15 de moneda inicial, no se suma
  return state;
}

describe('runAutobuy', () => {
  it('sin Capataz ni Encargada, no compra nada', () => {
    const state = createInitialState(CONTENT, 0);
    const world = state.worlds['valle']!;
    world.currency = world.currency.add(1000);
    runAutobuy(state, CONTENT, 'valle');
    expect(world.generators['lechon']!.bought).toBe(0);
    expect(world.currency.toNumber()).toBeCloseTo(1015, 6);
  });

  it('con Capataz, compra cerditos automáticamente', () => {
    const state = stateWithCapataz(1000);
    runAutobuy(state, CONTENT, 'valle');
    const world = state.worlds['valle']!;
    const totalBought = Object.values(world.generators).reduce((sum, g) => sum + g.bought, 0);
    expect(totalBought).toBeGreaterThan(0);
  });

  it('nunca deja la moneda negativa', () => {
    const state = stateWithCapataz(12345);
    runAutobuy(state, CONTENT, 'valle');
    expect(state.worlds['valle']!.currency.gte(0)).toBe(true);
  });

  it('compra el candidato de mejor puntuación: con dinero para uno solo, compra el más barato (Lechón)', () => {
    const state = stateWithCapataz(10); // exactamente el coste del Lechón
    runAutobuy(state, CONTENT, 'valle');
    const world = state.worlds['valle']!;
    expect(world.generators['lechon']!.bought).toBe(1);
    expect(world.generators['cerdita-rosa']!.bought).toBe(0);
  });

  it('respeta autobuyEnabled = false (pausa)', () => {
    const state = stateWithCapataz(1000);
    state.settings.autobuyEnabled = false;
    runAutobuy(state, CONTENT, 'valle');
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(0);
  });

  it('un mundo bloqueado no compra nada aunque tenga la ventaja (no debería, pero por si acaso)', () => {
    const state = createInitialState(CONTENT, 0);
    state.worlds['bosque']!.perks['bosque.capataz'] = 1;
    state.worlds['bosque']!.currency = state.worlds['bosque']!.currency.add(1_000_000);
    runAutobuy(state, CONTENT, 'bosque');
    const bought = Object.values(state.worlds['bosque']!.generators).reduce((sum, g) => sum + g.bought, 0);
    expect(bought).toBe(0);
  });
});

describe('runAutobuyForAllWorlds', () => {
  it('ejecuta runAutobuy en todos los mundos del contenido', () => {
    const state = stateWithCapataz(1000);
    runAutobuyForAllWorlds(state, CONTENT);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBeGreaterThan(0);
  });
});
