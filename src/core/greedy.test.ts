import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { greedyBuy } from './greedy.ts';
import { D } from './num.ts';
import { createInitialState } from './state.ts';

function stateWith(currency: number) {
  const state = createInitialState(CONTENT, 0);
  state.worlds['valle']!.currency = D(currency); // reemplaza los 15 de moneda inicial, no se suma
  return state;
}

describe('greedyBuy', () => {
  it('compra cerditos con el dinero disponible', () => {
    const state = stateWith(1000);
    greedyBuy(state, CONTENT, 'valle', true, true);
    const totalBought = Object.values(state.worlds['valle']!.generators).reduce((sum, g) => sum + g.bought, 0);
    expect(totalBought).toBeGreaterThan(0);
  });

  it('nunca deja la moneda negativa', () => {
    const state = stateWith(12345);
    greedyBuy(state, CONTENT, 'valle', true, true);
    expect(state.worlds['valle']!.currency.gte(0)).toBe(true);
  });

  it('con dinero para uno solo, compra el más barato (Lechón)', () => {
    const state = stateWith(10); // exactamente el coste del Lechón
    greedyBuy(state, CONTENT, 'valle', true, true);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(1);
    expect(state.worlds['valle']!.generators['cerdita-rosa']!.bought).toBe(0);
  });

  it('con includeGenerators = false no compra cerditos', () => {
    const state = stateWith(1000);
    greedyBuy(state, CONTENT, 'valle', false, true);
    expect(state.worlds['valle']!.generators['lechon']!.bought).toBe(0);
  });
});
