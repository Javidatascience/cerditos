// Paridad entre `core` (break_infinity.js, el juego) y `tools/sim` (number, el simulador de
// economía): un guion fijo —comprar siempre el cerdito con la compra más barata, cada 10 s,
// durante 1 h— debe dar la misma moneda en los dos motores. Si algún día difieren es que una
// fórmula se desincronizó entre docs/03-economia.md, core/formulas.ts y tools/sim/engine.ts.
// Ver docs/02-arquitectura.md §10 y docs/04-plan-implementacion.md (hito 3).

import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { ascend, buyGenerator, buyPerk } from './actions.ts';
import { greedyBuy } from './autobuy.ts';
import { generatorCost, getWorldDef, perkAvailable, perkCost, perkLevel, plumasPending } from './formulas.ts';
import { D } from './num.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

// tools/sim no se importa con los flags del tsconfig raíz (usa `number`, no Decimal), pero al
// importarlo aquí sí pasa a formar parte de `npm run typecheck` (02/04, "Desviaciones" hito 2-3).
import * as sim from '../../tools/sim/engine.ts';
import { WORLD_BY_ID as SIM_WORLD_BY_ID } from '../../tools/sim/content.ts';
import * as strategy from '../../tools/sim/strategy.ts';

const WORLD_ID = 'valle';
const STEP_SECONDS = 10;
const TOTAL_SECONDS = 3600;

/** Compra, en core, el generador más barato mientras se pueda pagar (ignora mejoras). */
function buyCheapestCore(state: ReturnType<typeof createInitialState>, worldId: string = WORLD_ID): void {
  const world = getWorldDef(CONTENT, worldId);
  const worldState = state.worlds[worldId]!;
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
    buyGenerator(state, CONTENT, worldId, cheapestId, 1);
  }
}

/** La misma estrategia, en tools/sim. */
function buyCheapestSim(state: sim.SimState, worldId: string = WORLD_ID): void {
  const simWorld = SIM_WORLD_BY_ID[worldId]!;
  for (;;) {
    let cheapestIdx = -1;
    let cheapestCost = Infinity;
    for (let i = 0; i < simWorld.generators.length; i++) {
      const cost = sim.genCost(state, worldId, i);
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapestIdx = i;
      }
    }
    const worldState = state.worlds[worldId]!;
    if (cheapestIdx < 0 || worldState.currency < cheapestCost) return;
    sim.buyGenerator(state, worldId, cheapestIdx);
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
      sim.updateCollectionAndUnlocks(simState); // core lo hace dentro de advance()
    }
    const simLifetime = simState.worlds[WORLD_ID]!.lifetimeEarned;

    expect(simLifetime).toBeGreaterThan(0); // que la comparación no sea trivialmente 0 = 0
    const relError = Math.abs(coreLifetime - simLifetime) / simLifetime;
    expect(relError).toBeLessThan(1e-9);
  });
});

describe('paridad core/tools-sim en la cadena del Bosque (1 h)', () => {
  it('moneda de vida y unidades de cada nivel coinciden con error relativo < 1e-9', () => {
    const id = 'bosque';
    const START = 1e7; // para que la estrategia llegue a comprar varios niveles de la cadena

    const coreState = createInitialState(CONTENT, 0);
    coreState.worlds[id]!.unlocked = true;
    coreState.worlds[id]!.currency = D(START);
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestCore(coreState, id);
      advance(coreState, CONTENT, STEP_SECONDS);
    }

    const simState = sim.newSimState();
    simState.worlds[id]!.unlocked = true;
    simState.worlds[id]!.currency = START;
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestSim(simState, id);
      sim.produce(simState, STEP_SECONDS);
      sim.updateCollectionAndUnlocks(simState); // core lo hace dentro de advance()
    }

    const coreWorld = coreState.worlds[id]!;
    const simWorld = simState.worlds[id]!;
    expect(coreWorld.generators['madre-trufera']!.bought).toBeGreaterThan(0); // la cadena se ejerce
    const relError = Math.abs(coreWorld.lifetimeEarned.toNumber() - simWorld.lifetimeEarned) / simWorld.lifetimeEarned;
    expect(relError).toBeLessThan(1e-9);
    CONTENT.worlds.find((w) => w.id === id)!.generators.forEach((gen, k) => {
      const coreOwned = coreWorld.generators[gen.id]!.owned.toNumber();
      const simOwned = simWorld.owned[k]!;
      expect(Math.abs(coreOwned - simOwned) / Math.max(1, simOwned)).toBeLessThan(1e-9);
    });
  });
});

describe('paridad core/tools-sim con armonía (Huerta, 1 h)', () => {
  it('moneda de vida y filas completas coinciden', () => {
    const id = 'huerta';
    const START = 1e8;

    const coreState = createInitialState(CONTENT, 0);
    coreState.worlds[id]!.unlocked = true;
    coreState.worlds[id]!.currency = D(START);
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestCore(coreState, id);
      advance(coreState, CONTENT, STEP_SECONDS);
    }

    const simState = sim.newSimState();
    simState.worlds[id]!.unlocked = true;
    simState.worlds[id]!.currency = START;
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestSim(simState, id);
      sim.produce(simState, STEP_SECONDS);
      sim.updateCollectionAndUnlocks(simState); // core lo hace dentro de advance()
    }

    const coreWorld = coreState.worlds[id]!;
    const simWorld = simState.worlds[id]!;
    expect(simWorld.maxHarmony).toBeGreaterThan(0); // la armonía se ejerce
    expect(coreWorld.records.maxHarmony).toBe(simWorld.maxHarmony);
    const relError = Math.abs(coreWorld.lifetimeEarned.toNumber() - simWorld.lifetimeEarned) / simWorld.lifetimeEarned;
    expect(relError).toBeLessThan(1e-9);
  });
});

describe('paridad core/tools-sim con calma (Balneario, 1 h)', () => {
  it('moneda de vida y calma final coinciden', () => {
    const id = 'balneario';
    const START = 1e8;

    const coreState = createInitialState(CONTENT, 0);
    coreState.worlds[id]!.unlocked = true;
    coreState.worlds[id]!.currency = D(START);
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestCore(coreState, id);
      advance(coreState, CONTENT, STEP_SECONDS);
    }

    const simState = sim.newSimState();
    simState.worlds[id]!.unlocked = true;
    simState.worlds[id]!.currency = START;
    for (let t = 0; t < TOTAL_SECONDS; t += STEP_SECONDS) {
      buyCheapestSim(simState, id);
      sim.produce(simState, STEP_SECONDS);
      sim.updateCollectionAndUnlocks(simState); // core lo hace dentro de advance()
    }

    const coreWorld = coreState.worlds[id]!;
    const simWorld = simState.worlds[id]!;
    expect(coreWorld.calm).toBeCloseTo(simWorld.calm, 9);
    expect(simWorld.calm).toBeLessThan(1); // la penalización se ejerce
    const relError = Math.abs(coreWorld.lifetimeEarned.toNumber() - simWorld.lifetimeEarned) / simWorld.lifetimeEarned;
    expect(relError).toBeLessThan(1e-9);
  });
});

// ---------------------------------------------------------------------------
// Paridad con la estrategia completa del simulador (ventajas + ascensión), 24 h (hito 5)
// ---------------------------------------------------------------------------
//
// tools/sim/strategy.ts ya expone playerAct (compra ventajas, asciende cuando toca, compra
// cerditos/mejoras) y se reutiliza tal cual para el lado `sim`. Para el lado `core` no existe
// un "jugador simulado" (eso no es una función del juego real, 01 §5: la ascensión es decisión
// del jugador) así que aquí se reimplementa la MISMA lógica de decisión de buyPerks/maybeAscend
// usando las funciones de core/actions.ts y core/formulas.ts. La compra de cerditos/mejoras sí
// reutiliza código real del juego: core/autobuy.ts > greedyBuy (exportada para este test) es
// la misma función, con el mismo algoritmo, que tools/sim/strategy.ts > greedyBuy — aquí se
// llama directamente con (gens=true, upgrades=true), igual que hace playerAct en tools/sim
// para el jugador conectado (sin esperar a que posea Capataz/Encargada: eso solo gatea
// runAutobuy, la compra automática de cuando el jugador NO está).

const PERK_LOCAL_PRIORITY = ['capataz', 'encargada'];

function coreBuyPerks(state: GameState, worldId: string): void {
  for (;;) {
    const candidates = CONTENT.perks.filter((p) => p.world === worldId && perkAvailable(state, CONTENT, p));
    if (candidates.length === 0) return;
    const byCost = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
      perkCost(a, perkLevel(state, CONTENT, a.id)).sub(perkCost(b, perkLevel(state, CONTENT, b.id))).toNumber();
    const priority = candidates.filter((p) => PERK_LOCAL_PRIORITY.some((local) => p.id.endsWith('.' + local)));
    const pool = priority.length > 0 ? priority : candidates;
    const pick = [...pool].sort(byCost)[0]!;
    const cost = perkCost(pick, perkLevel(state, CONTENT, pick.id));
    if (cost.gt(state.worlds[worldId]!.plumas)) {
      if (pool === priority) {
        const cheapestOverall = [...candidates].sort(byCost)[0]!;
        if (!buyPerk(state, CONTENT, cheapestOverall.id)) return;
        continue;
      }
      return;
    }
    if (!buyPerk(state, CONTENT, pick.id)) return;
  }
}

const FIRST_MIN = 10;
const LONG_ROUND_HOURS = 20;
const LONG_ROUND_MIN_GAIN = 0.2;
const coreBestRate = new Map<string, { t: number; gain: number }>();

function coreMaybeAscend(state: GameState, worldId: string): boolean {
  const worldState = state.worlds[worldId]!;
  const gain = plumasPending(state, CONTENT, worldId);
  if (gain < 1) return false;
  const plumasTotal = worldState.plumasTotal.toNumber();

  const snap = coreBestRate.get(worldId);
  if (!snap || state.time - snap.t >= 3600) {
    const stalledNow = snap !== undefined && gain < snap.gain * 1.05;
    coreBestRate.set(worldId, { t: state.time, gain });
    if (stalledNow && plumasTotal > 0 && gain >= LONG_ROUND_MIN_GAIN * plumasTotal) {
      ascend(state, CONTENT, worldId, 0);
      coreBestRate.delete(worldId);
      return true;
    }
  }
  if (gain >= Math.max(FIRST_MIN, plumasTotal) || (worldState.runSeconds > LONG_ROUND_HOURS * 3600 && gain >= LONG_ROUND_MIN_GAIN * plumasTotal) || worldState.runSeconds > 2 * 86400) {
    ascend(state, CONTENT, worldId, 0);
    coreBestRate.delete(worldId);
    return true;
  }
  return false;
}

function corePlayerAct(state: GameState, worldId: string): void {
  coreBuyPerks(state, worldId);
  if (coreMaybeAscend(state, worldId)) coreBuyPerks(state, worldId);
  greedyBuy(state, CONTENT, worldId, true, true);
}

describe('paridad core/tools-sim con ventajas y ascensión (Valle, 24 h)', () => {
  it('las plumas totales coinciden con error relativo < 1e-6 tras 24 h', () => {
    const STEP = 600; // 10 min
    const TOTAL = 24 * 3600;

    const coreState = createInitialState(CONTENT, 0);
    coreBestRate.clear();
    for (let t = 0; t < TOTAL; t += STEP) {
      advance(coreState, CONTENT, STEP);
      corePlayerAct(coreState, WORLD_ID);
    }
    const corePlumasTotal = coreState.worlds[WORLD_ID]!.plumasTotal.toNumber();
    const coreAscensions = coreState.worlds[WORLD_ID]!.ascensions;

    strategy.resetStrategyMemory();
    const simState = sim.newSimState();
    for (let t = 0; t < TOTAL; t += STEP) {
      sim.produce(simState, STEP);
      sim.updateCollectionAndUnlocks(simState); // core lo hace dentro de advance() (hito 6)
      strategy.playerAct(simState, WORLD_ID);
    }
    const simPlumasTotal = simState.worlds[WORLD_ID]!.plumasTotal;
    const simAscensions = simState.worlds[WORLD_ID]!.ascensions;

    expect(simPlumasTotal).toBeGreaterThan(0);
    expect(coreAscensions).toBeGreaterThan(0);
    expect(coreAscensions).toBe(simAscensions); // misma secuencia de eventos
    const relError = Math.abs(corePlumasTotal - simPlumasTotal) / simPlumasTotal;
    expect(relError).toBeLessThan(1e-6);
  });
});

describe('paridad core/tools-sim con los 4 mundos a la vez (24 h)', () => {
  it('plumas totales y ascensiones coinciden en cada mundo (error relativo < 1e-6)', () => {
    const STEP = 600;
    const TOTAL = 24 * 3600;

    const coreState = createInitialState(CONTENT, 0);
    for (const world of CONTENT.worlds) {
      const ws = coreState.worlds[world.id]!;
      ws.unlocked = true;
      ws.currency = D(world.startCurrency);
    }
    coreBestRate.clear();
    for (let t = 0; t < TOTAL; t += STEP) {
      advance(coreState, CONTENT, STEP);
      for (const world of CONTENT.worlds) corePlayerAct(coreState, world.id);
    }

    strategy.resetStrategyMemory();
    const simState = sim.newSimState();
    for (const world of CONTENT.worlds) {
      const ws = simState.worlds[world.id]!;
      ws.unlocked = true;
      ws.currency = SIM_WORLD_BY_ID[world.id]!.startCurrency;
    }
    for (let t = 0; t < TOTAL; t += STEP) {
      sim.produce(simState, STEP);
      sim.updateCollectionAndUnlocks(simState);
      for (const world of CONTENT.worlds) strategy.playerAct(simState, world.id);
    }

    for (const world of CONTENT.worlds) {
      const c = coreState.worlds[world.id]!;
      const sm = simState.worlds[world.id]!;
      expect(c.ascensions, `${world.id}: ascensiones`).toBe(sm.ascensions);
      const sp = sm.plumasTotal;
      if (sp > 0) expect(Math.abs(c.plumasTotal.toNumber() - sp) / sp, `${world.id}: plumas`).toBeLessThan(1e-6);
    }
    expect(simState.worlds['valle']!.plumasTotal).toBeGreaterThan(0);
  });
});
