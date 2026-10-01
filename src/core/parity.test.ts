// Paridad entre `core` (break_infinity.js, el juego) y `tools/sim` (number, el simulador de
// economía): un guion fijo —comprar siempre el cerdito con la compra más barata, cada 10 s,
// durante 1 h— debe dar la misma moneda en los dos motores. Si algún día difieren es que una
// fórmula se desincronizó entre docs/03-economia.md, core/formulas.ts y tools/sim/engine.ts.
// Ver docs/02-arquitectura.md §10 y docs/04-plan-implementacion.md (hito 3).

import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { buyGenerator } from './actions.ts';
import { generatorCost, getWorldDef } from './formulas.ts';
import { createInitialState } from './state.ts';
import { advance } from './tick.ts';

// tools/sim no se importa con los flags del tsconfig raíz (usa `number`, no Decimal), pero al
// importarlo aquí sí pasa a formar parte de `npm run typecheck` (02/04, "Desviaciones" hito 2-3).
import * as sim from '../../tools/sim/engine.ts';
import { WORLD_BY_ID as SIM_WORLD_BY_ID } from '../../tools/sim/content.ts';

const WORLD_ID = 'valle';
const STEP_SECONDS = 10;
const TOTAL_SECONDS = 3600;

/** Compra, en core, el generador más barato mientras se pueda pagar (ignora mejoras). */
function buyCheapestCore(state: ReturnType<typeof createInitialState>): void {
  const world = getWorldDef(CONTENT, WORLD_ID);
  const worldState = state.worlds[WORLD_ID]!;
  for (;;) {
    let cheapestId: string | null = null;
    let cheapestCost = null as ReturnType<typeof generatorCost> | null;
    for (const gen of world.generators) {
      const genState = worldState.generators[gen.id]!;
      const cost = generatorCost(world, gen, genState.bought);
      if (cheapestCost === null || cost.lt(cheapestCost)) {
        cheapestCost = cost;
        cheapestId = gen.id;
      }
    }
    if (!cheapestId || !cheapestCost || worldState.currency.lt(cheapestCost)) return;
    buyGenerator(state, CONTENT, WORLD_ID, cheapestId, 1);
  }
}

/** La misma estrategia, en tools/sim. */
function buyCheapestSim(state: sim.SimState): void {
  const simWorld = SIM_WORLD_BY_ID[WORLD_ID]!;
  for (;;) {
    let cheapestIdx = -1;
    let cheapestCost = Infinity;
    for (let i = 0; i < simWorld.generators.length; i++) {
      const cost = sim.genCost(state, WORLD_ID, i);
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapestIdx = i;
      }
    }
    const worldState = state.worlds[WORLD_ID]!;
    if (cheapestIdx < 0 || worldState.currency < cheapestCost) return;
    sim.buyGenerator(state, WORLD_ID, cheapestIdx);
  }
}

describe('paridad core/tools-sim (Valle, 1 h, estrategia "más barato")', () => {
  it('la moneda ganada en la vida coincide con error relativo < 1e-9', () => {
    const coreState = createInitialState(CONTENT, 0);
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestCore(coreState);
      advance(coreState, CONTENT, STEP_SECONDS);
    }
    const coreLifetime = coreState.worlds[WORLD_ID]!.lifetimeEarned.toNumber();

    const simState = sim.newSimState();
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestSim(simState);
      sim.produce(simState, STEP_SECONDS);
    }
    const simLifetime = simState.worlds[WORLD_ID]!.lifetimeEarned;

    expect(simLifetime).toBeGreaterThan(0); // que la comparación no sea trivialmente 0 = 0
    const relError = Math.abs(coreLifetime - simLifetime) / simLifetime;
    expect(relError).toBeLessThan(1e-9);
  });
});
