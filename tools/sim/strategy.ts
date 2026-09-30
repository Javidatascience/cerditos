// Estrategia "simple y razonable" de un jugador y del autocomprador.
// No es óptima a propósito: representa a alguien que compra lo que mejor rinde
// y asciende cuando la ronda deja de cundir.

import { PERKS, WORLD_BY_ID, type WorldId } from './content.ts';
import {
  ascend, availableUpgrades, buyGenerator, buyPerk, buyUpgrade, genCost, harmony, hasAutobuyGenerators,
  hasAutobuyUpgrades, income, perkAvailable, perkCost, plumasPending, valueRate,
  type SimState, type UpgradeOffer,
} from './engine.ts';

const CHAIN_HORIZON = 1800; // s: horizonte con el que se valora un nivel superior en la cadena del Bosque
const MAX_BUYS_PER_STEP = 400;

type Candidate =
  | { kind: 'gen'; gen: number; cost: number; delta: number }
  | { kind: 'bundle'; gens: number[]; cost: number; delta: number }
  | { kind: 'upgrade'; offer: UpgradeOffer; cost: number; delta: number };

function deltaValue(s: SimState, world: WorldId, apply: () => void, revert: () => void, base: number): number {
  apply();
  const v = valueRate(s, world, CHAIN_HORIZON);
  revert();
  return v - base;
}

function candidates(s: SimState, world: WorldId, gens: boolean, upgrades: boolean): Candidate[] {
  const def = WORLD_BY_ID[world];
  const w = s.worlds[world];
  const base = valueRate(s, world, CHAIN_HORIZON);
  const out: Candidate[] = [];
  if (gens) {
    for (let i = 0; i < def.generators.length; i++) {
      const delta = deltaValue(s, world, () => { w.owned[i] += 1; }, () => { w.owned[i] -= 1; }, base);
      out.push({ kind: 'gen', gen: i, cost: genCost(s, world, i), delta });
    }
    if (def.mechanic === 'harmony') {
      const h = harmony(w);
      const lows = w.owned.map((n, i) => (n === h ? i : -1)).filter((i) => i >= 0);
      const cost = lows.reduce((sum, i) => sum + genCost(s, world, i), 0);
      const delta = deltaValue(s, world, () => lows.forEach((i) => (w.owned[i] += 1)), () => lows.forEach((i) => (w.owned[i] -= 1)), base);
      out.push({ kind: 'bundle', gens: lows, cost, delta });
    }
  }
  if (upgrades) {
    for (const offer of availableUpgrades(s, world)) {
      const delta = deltaValue(s, world, () => w.upgrades.add(offer.id), () => w.upgrades.delete(offer.id), base);
      out.push({ kind: 'upgrade', offer, cost: offer.cost, delta });
    }
  }
  return out;
}

/** Tiempo hasta poder pagarlo + tiempo en amortizarlo. Menor es mejor. */
function score(c: Candidate, currency: number, inc: number): number {
  if (c.delta <= 0) return Infinity;
  const wait = Math.max(0, c.cost - currency) / Math.max(inc, 1e-9);
  return wait + c.cost / c.delta;
}

function execute(s: SimState, world: WorldId, c: Candidate): boolean {
  switch (c.kind) {
    case 'gen': return buyGenerator(s, world, c.gen);
    case 'upgrade': return buyUpgrade(s, world, c.offer);
    case 'bundle': {
      const w = s.worlds[world];
      if (c.cost > w.currency) return false;
      for (const g of c.gens) buyGenerator(s, world, g);
      return true;
    }
  }
}

/** En el Balneario solo se compra con la calma casi llena o dentro de la ventana ya penalizada. */
function calmAllowsBuying(s: SimState, world: WorldId): boolean {
  const def = WORLD_BY_ID[world];
  if (def.mechanic !== 'calm') return true;
  const w = s.worlds[world];
  return w.calm >= 0.95 || s.time < w.calmPenaltyUntil;
}

/** Compra repetidamente el mejor candidato mientras sea asequible. */
export function greedyBuy(s: SimState, world: WorldId, gens: boolean, upgrades: boolean): number {
  let bought = 0;
  while (bought < MAX_BUYS_PER_STEP && calmAllowsBuying(s, world)) {
    const w = s.worlds[world];
    const inc = income(s, world);
    const list = candidates(s, world, gens, upgrades);
    if (list.length === 0) break;
    let best = list[0];
    let bestScore = score(best, w.currency, inc);
    for (const c of list) {
      const sc = score(c, w.currency, inc);
      if (sc < bestScore) { best = c; bestScore = sc; }
    }
    if (!isFinite(bestScore) || best.cost > w.currency) break;
    if (!execute(s, world, best)) break;
    bought++;
  }
  return bought;
}

/** Lo que hace el autocomprador (ventajas Capataz / Encargada) cuando el jugador no está. */
export function autobuy(s: SimState, world: WorldId): void {
  const g = hasAutobuyGenerators(s, world);
  const u = hasAutobuyUpgrades(s, world);
  if (g || u) greedyBuy(s, world, g, u);
}

const PERK_PRIORITY = ['capataz', 'encargada'];

export function buyPerks(s: SimState, world: WorldId): void {
  for (;;) {
    const avail = PERKS.filter((p) => p.world === world && perkAvailable(s, p));
    if (avail.length === 0) return;
    const prio = avail.filter((p) => PERK_PRIORITY.some((id) => p.id.endsWith('.' + id)));
    const pool = prio.length > 0 ? prio : avail;
    pool.sort((a, b) => perkCost(s, a) - perkCost(s, b));
    const pick = pool[0];
    if (perkCost(s, pick) > s.worlds[world].plumas) {
      // Si la prioritaria no llega, probamos la más barata de todas.
      if (pool === prio) {
        const cheapest = avail.sort((a, b) => perkCost(s, a) - perkCost(s, b))[0];
        if (!buyPerk(s, cheapest)) return;
        continue;
      }
      return;
    }
    if (!buyPerk(s, pick)) return;
  }
}

// Regla de ascensión de un jugador razonable:
//  a) la ascensión al menos duplica las plumas (y la primera da al menos FIRST_MIN), o
//  b) la ronda se ha estancado: las plumas pendientes crecieron < 5 % en la última hora
//     y la ascensión aporta al menos un 20 % más de plumas, o
//  c) la ronda dura más de 20 h y la ascensión aporta al menos un 20 % (ritmo "una al día"), o
//  d) la ronda dura más de 2 días y hay algo que ganar.
const FIRST_MIN = 10;
const LONG_ROUND_HOURS = Number(process.env.SIM_LONG_ROUND_HOURS ?? 20);
const LONG_ROUND_MIN_GAIN = Number(process.env.SIM_LONG_ROUND_MIN_GAIN ?? 0.2);
const snapshots = new Map<WorldId, { t: number; gain: number }>();

export function maybeAscend(s: SimState, world: WorldId): boolean {
  const w = s.worlds[world];
  const gain = plumasPending(s, world);
  if (gain < 1) return false;
  const snap = snapshots.get(world);
  if (!snap || s.time - snap.t >= 3600) {
    const stalledNow = snap !== undefined && gain < snap.gain * 1.05;
    snapshots.set(world, { t: s.time, gain });
    if (stalledNow && w.plumasTotal > 0 && gain >= 0.2 * w.plumasTotal) return doAscend(s, world);
  }
  if (gain >= Math.max(FIRST_MIN, w.plumasTotal)) return doAscend(s, world);
  if (w.runTime > LONG_ROUND_HOURS * 3600 && gain >= LONG_ROUND_MIN_GAIN * w.plumasTotal) return doAscend(s, world);
  if (w.runTime > 2 * 86400) return doAscend(s, world);
  return false;
}

function doAscend(s: SimState, world: WorldId): boolean {
  ascend(s, world);
  snapshots.delete(world);
  return true;
}

export function resetStrategyMemory(): void {
  snapshots.clear();
}

/** Turno del jugador conectado en un mundo: ventajas, ascensión y compras. */
export function playerAct(s: SimState, world: WorldId): void {
  buyPerks(s, world);
  if (maybeAscend(s, world)) buyPerks(s, world);
  greedyBuy(s, world, true, true);
}
