import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../content/index.ts';
import { buyGenerator, mergePigs } from '../actions.ts';
import { productionPerSecond } from '../formulas.ts';
import { D } from '../num.ts';
import { mergeView } from '../selectors.ts';
import { createInitialState, type GameState } from '../state.ts';
import { advance } from '../tick.ts';
import { canMerge, freeSlots, slotsOf, totalPigs } from './merge.ts';

const WORLD = CONTENT.worlds.find((w) => w.id === 'pocilga')!;
const ids = WORLD.generators.map((g) => g.id);

function pocilga(counts: number[], currency = 1e9): GameState {
  const state = createInitialState(CONTENT, 0);
  const ws = state.worlds['pocilga']!;
  ws.currency = D(currency);
  counts.forEach((n, k) => (ws.generators[ids[k]!]!.owned = D(n)));
  return state;
}

describe('fusión (La Pocilga)', () => {
  it('está abierta desde el principio y con todos los niveles descubiertos', () => {
    const state = createInitialState(CONTENT, 0);
    expect(state.worlds['pocilga']!.unlocked).toBe(true);
    expect(state.worlds['pocilga']!.revealed).toBe(WORLD.generators.length);
  });

  it('fusionar dos del mismo nivel da uno del siguiente y libera un hueco', () => {
    const state = pocilga([3, 0, 0]);
    const ws = state.worlds['pocilga']!;
    expect(totalPigs(WORLD, ws)).toBe(3);
    expect(mergePigs(state, CONTENT, 'pocilga', 0)).toBe(true);
    expect(ws.generators['cochinillo']!.owned.toNumber()).toBe(1);
    expect(ws.generators['cerdito']!.owned.toNumber()).toBe(1);
    expect(totalPigs(WORLD, ws)).toBe(2);
    expect(freeSlots(WORLD, ws)).toBe(slotsOf(WORLD) - 2);
  });

  it('no fusiona con menos de dos, ni el último nivel', () => {
    const state = pocilga([1]);
    expect(mergePigs(state, CONTENT, 'pocilga', 0)).toBe(false);
    const top = pocilga([0, 0, 0, 0, 0, 0, 0, 0, 0, 2]);
    expect(canMerge(WORLD, top.worlds['pocilga']!, WORLD.generators.length - 1)).toBe(false);
    expect(mergePigs(top, CONTENT, 'pocilga', WORLD.generators.length - 1)).toBe(false);
  });

  it('fusionar compensa: dos del nivel k producen menos que uno del k+1', () => {
    const before = pocilga([2]);
    const after = pocilga([2]);
    mergePigs(after, CONTENT, 'pocilga', 0);
    expect(productionPerSecond(after, CONTENT, 'pocilga').gt(productionPerSecond(before, CONTENT, 'pocilga'))).toBe(true);
  });

  it('solo se compra el nivel 0, y solo caben tantos como huecos libres', () => {
    const state = pocilga([0, 5]); // 5 cerditos ocupan 5 huecos
    expect(buyGenerator(state, CONTENT, 'pocilga', 'cerdito', 1)).toBe(0);
    const bought = buyGenerator(state, CONTENT, 'pocilga', 'cochinillo', 'max');
    expect(bought).toBe(slotsOf(WORLD) - 5);
    expect(buyGenerator(state, CONTENT, 'pocilga', 'cochinillo', 1)).toBe(0); // lleno
    mergePigs(state, CONTENT, 'pocilga', 0);
    expect(buyGenerator(state, CONTENT, 'pocilga', 'cochinillo', 1)).toBe(1); // se liberó un hueco
  });

  it('produce con el mismo tick que el resto de mundos', () => {
    const state = pocilga([4]);
    advance(state, CONTENT, 100);
    expect(state.worlds['pocilga']!.lifetimeEarned.toNumber()).toBeCloseTo(4 * 0.5 * 100, 6);
  });

  it('mergeView resume el tablero', () => {
    const state = pocilga([2, 1]);
    const view = mergeView(state, CONTENT, 'pocilga')!;
    expect(view.used).toBe(3);
    expect(view.slots).toBe(slotsOf(WORLD));
    expect(view.levels[0]).toMatchObject({ count: 2, canMerge: true });
    expect(view.levels[1]).toMatchObject({ count: 1, canMerge: false });
    expect(view.canBuy).toBe(true);
    expect(mergeView(state, CONTENT, 'valle')).toBeNull();
  });
});
