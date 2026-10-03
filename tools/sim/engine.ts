// Motor económico del simulador. Sin UI, sin azar, sin reloj real.
// Usa number (double). El juego usará break_infinity.js; aquí vigilamos que nada pase de 1e300.
//
// Las aserciones `!` de este fichero (acceso a s.worlds[id], WORLD_BY_ID[id], arrays por
// índice) son seguras por construcción: los ids de mundo siempre vienen de `WORLDS` (con la
// que se construyen tanto `s.worlds` como `WORLD_BY_ID`), y los índices de array siempre
// recorren `0..length-1` del propio array que se indexa. `noUncheckedIndexedAccess` (hito 2-3,
// ver docs/04-plan-implementacion.md "Desviaciones") no puede ver esas invariantes solo.

import {
  PERKS, SETS, VARIETIES, WORLDS, WORLD_BY_ID,
  type Bonus, type PerkDef, type Requirement, type WorldDef, type WorldId,
} from './content.ts';

export interface WorldState {
  unlocked: boolean;
  currency: number;
  runEarned: number;
  lifetimeEarned: number;
  /** Unidades poseídas (en chain pueden ser fraccionarias: incluyen las producidas). */
  owned: number[];
  /** Unidades compradas (base del coste). */
  bought: number[];
  upgrades: Set<string>;
  plumas: number; // sin gastar
  plumasTotal: number; // ganadas en total (histórico)
  perks: Record<string, number>;
  ascensions: number;
  runTime: number;
  calm: number;
  calmPenaltyUntil: number;
  // Estadísticas permanentes para la colección
  maxBought: number[];
  maxHarmony: number;
}

export interface SimEvent {
  t: number;
  kind: 'ascension' | 'unlock' | 'perk' | 'variety' | 'newTier';
  world?: WorldId;
  text: string;
}

export interface SimState {
  time: number;
  worlds: Record<WorldId, WorldState>;
  varieties: Set<string>;
  events: SimEvent[];
}

const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export function newWorldState(def: WorldDef, unlocked: boolean): WorldState {
  const n = def.generators.length;
  return {
    unlocked,
    currency: unlocked ? def.startCurrency : 0,
    runEarned: 0,
    lifetimeEarned: 0,
    owned: new Array(n).fill(0),
    bought: new Array(n).fill(0),
    upgrades: new Set(),
    plumas: 0,
    plumasTotal: 0,
    perks: {},
    ascensions: 0,
    runTime: 0,
    calm: 1,
    calmPenaltyUntil: -1,
    maxBought: new Array(n).fill(0),
    maxHarmony: 0,
  };
}

export function newSimState(): SimState {
  const worlds = {} as Record<WorldId, WorldState>;
  for (const def of WORLDS) worlds[def.id] = newWorldState(def, def.unlock === null);
  return { time: 0, worlds, varieties: new Set(), events: [] };
}

function world(s: SimState, id: WorldId): WorldState {
  return s.worlds[id]!;
}

function def(id: WorldId): WorldDef {
  return WORLD_BY_ID[id]!;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function perkLevel(s: SimState, perkId: string): number {
  const p = PERK_BY_ID[perkId]!;
  return world(s, p.world).perks[perkId] ?? 0;
}

function perksOfKind(s: SimState, w: WorldId, kind: string): { perk: PerkDef; level: number }[] {
  const out: { perk: PerkDef; level: number }[] = [];
  for (const p of PERKS) {
    if (p.world !== w || p.effect.kind !== kind) continue;
    const level = world(s, w).perks[p.id] ?? 0;
    if (level > 0) out.push({ perk: p, level });
  }
  return out;
}


function bonusApplies(b: Bonus, w: WorldId, kind: Bonus['kind']): boolean {
  return b.kind === kind && (b.world === 'all' || b.world === w);
}

function collectionMult(s: SimState, w: WorldId, kind: Bonus['kind']): number {
  let m = 1;
  for (const v of VARIETIES) if (s.varieties.has(v.id) && bonusApplies(v.bonus, w, kind)) m *= v.bonus.mult;
  for (const set of SETS) {
    if (!bonusApplies(set.bonus, w, kind)) continue;
    const complete = VARIETIES.filter((v) => v.set === set.id).every((v) => s.varieties.has(v.id));
    if (complete) m *= set.bonus.mult;
  }
  return m;
}

/** Multiplicador global de producción del mundo (todo menos mejoras por generador y calma). */
export function globalMult(s: SimState, w: WorldId): number {
  const d = def(w);
  const ws = world(s, w);
  let m = 1;
  for (const u of d.globalUpgrades) if (ws.upgrades.has(u.id)) m *= u.mult;
  m *= 1 + (d.prestige.perPluma + perkSum(s, w, 'perPlumaBonus')) * ws.plumasTotal;
  for (const { perk, level } of perksOfKind(s, w, 'prodMult')) m *= (perk.effect as { perLevel: number }).perLevel ** level;
  for (const other of WORLDS) {
    if (other.id === w) continue;
    for (const { perk, level } of perksOfKind(s, other.id, 'crossProd')) m *= 1 + (perk.effect as { perLevel: number }).perLevel * level;
  }
  m *= collectionMult(s, w, 'prod');
  if (d.mechanic === 'harmony') m *= harmonyMult(d, ws);
  return m;
}

export function harmonyMult(d: WorldDef, w: WorldState): number {
  const h = harmony(w);
  const cfg = d.harmony!;
  const steps = cfg.thresholds.filter((t) => h >= t).length;
  return (1 + cfg.perLevel * h) * cfg.mult ** steps;
}

export function harmony(w: WorldState): number {
  return Math.min(...w.owned);
}

export function calmMult(d: WorldDef, w: WorldState): number {
  return d.mechanic === 'calm' ? 1 + d.calm!.maxBonus * w.calm : 1;
}

export function genUpgradeId(gen: number, k: number): string {
  return `g${gen}-u${k}`;
}

export function genMult(d: WorldDef, w: WorldState, gen: number): number {
  let m = 1;
  for (let k = 0; k < d.genUpgradeCounts.length; k++) if (w.upgrades.has(genUpgradeId(gen, k))) m *= d.genUpgradeMult;
  return m;
}

/** Moneda por segundo (sin calma). En chain solo cuenta el nivel 0. */
export function income(s: SimState, w: WorldId): number {
  const d = def(w);
  const ws = world(s, w);
  const g = globalMult(s, w);
  if (d.mechanic === 'chain') return ws.owned[0]! * d.generators[0]!.baseProd * genMult(d, ws, 0) * g;
  let total = 0;
  for (let i = 0; i < d.generators.length; i++) total += ws.owned[i]! * d.generators[i]!.baseProd * genMult(d, ws, i);
  return total * g;
}

/**
 * Valor de la granja para decidir compras: moneda/s equivalente en un horizonte H.
 * En chain, una unidad del nivel k aporta prod_k·…·prod_0 · H^k / k! de moneda en H segundos.
 */
export function valueRate(s: SimState, w: WorldId, horizon: number): number {
  const d = def(w);
  if (d.mechanic !== 'chain') return income(s, w);
  const ws = world(s, w);
  const g = globalMult(s, w);
  let total = 0;
  let chainRate = 1;
  let fact = 1;
  for (let k = 0; k < d.generators.length; k++) {
    chainRate *= d.generators[k]!.baseProd * genMult(d, ws, k) * (k === 0 ? g : 1);
    if (k > 0) fact *= k + 1;
    total += (ws.owned[k]! * chainRate * horizon ** (k + 1)) / fact;
  }
  return total / horizon;
}

export function costMult(s: SimState, w: WorldId): number {
  let m = collectionMult(s, w, 'cost');
  for (const { perk, level } of perksOfKind(s, w, 'costMult')) m *= (perk.effect as { perLevel: number }).perLevel ** level;
  return m;
}

function perkSum(s: SimState, w: WorldId, kind: string): number {
  let total = 0;
  for (const { perk, level } of perksOfKind(s, w, kind)) total += (perk.effect as { perLevel: number }).perLevel * level;
  return total;
}

export function growthOf(d: WorldDef, gen: number, s?: SimState): number {
  const base = d.generators[gen]!.costGrowth ?? d.costGrowth;
  return s ? base - perkSum(s, d.id, 'costGrowthDelta') : base;
}

export function genCost(s: SimState, w: WorldId, gen: number): number {
  const d = def(w);
  return d.generators[gen]!.baseCost * growthOf(d, gen, s) ** world(s, w).bought[gen]! * costMult(s, w);
}

export interface UpgradeOffer { id: string; cost: number; gen: number | null }

export function availableUpgrades(s: SimState, w: WorldId): UpgradeOffer[] {
  const d = def(w);
  const ws = world(s, w);
  let upMult = 1;
  for (const { perk, level } of perksOfKind(s, w, 'upgradeCostMult')) upMult *= (perk.effect as { perLevel: number }).perLevel ** level;
  const out: UpgradeOffer[] = [];
  for (let i = 0; i < d.generators.length; i++) {
    for (let k = 0; k < d.genUpgradeCounts.length; k++) {
      const id = genUpgradeId(i, k);
      const need = d.genUpgradeCounts[k]!;
      if (ws.upgrades.has(id) || ws.bought[i]! < need) continue;
      out.push({ id, gen: i, cost: d.genUpgradeCostFactor * d.generators[i]!.baseCost * growthOf(d, i, s) ** need * upMult });
    }
  }
  for (const u of d.globalUpgrades) {
    if (ws.upgrades.has(u.id) || ws.runEarned < u.cost * 0.25) continue;
    out.push({ id: u.id, gen: null, cost: u.cost * upMult });
  }
  return out;
}

export function plumaMult(s: SimState, w: WorldId): number {
  let m = 1;
  for (const { perk, level } of perksOfKind(s, w, 'plumaMult')) m += (perk.effect as { perLevel: number }).perLevel * level;
  return m;
}

export function plumasPending(s: SimState, w: WorldId): number {
  const d = def(w);
  const ws = world(s, w);
  const total = Math.floor((ws.lifetimeEarned / d.prestige.e0) ** d.prestige.exponent * plumaMult(s, w));
  return Math.max(0, total - ws.plumasTotal);
}

export function perkCost(s: SimState, perk: PerkDef): number {
  const level = perkLevel(s, perk.id);
  return Math.ceil(perk.baseCost * perk.costGrowth ** level);
}

export function perkAvailable(s: SimState, perk: PerkDef): boolean {
  const level = perkLevel(s, perk.id);
  if (perk.maxLevel !== null && level >= perk.maxLevel) return false;
  return perk.requires.every((r) => perkLevel(s, r) > 0);
}

// ---------------------------------------------------------------------------
// Acciones (mutan el estado)
// ---------------------------------------------------------------------------

function touchCalm(s: SimState, w: WorldId): void {
  const d = def(w);
  if (d.mechanic !== 'calm') return;
  const ws = world(s, w);
  if (s.time >= ws.calmPenaltyUntil) {
    ws.calm *= d.calm!.penalty;
    ws.calmPenaltyUntil = s.time + d.calm!.windowSeconds;
  }
}

export function buyGenerator(s: SimState, w: WorldId, gen: number): boolean {
  const ws = world(s, w);
  const cost = genCost(s, w, gen);
  if (cost > ws.currency) return false;
  ws.currency -= cost;
  if (ws.bought[gen] === 0 && ws.maxBought[gen] === 0) {
    s.events.push({ t: s.time, kind: 'newTier', world: w, text: `${w}: primer ${def(w).generators[gen]!.name}` });
  }
  ws.bought[gen]! += 1;
  ws.owned[gen]! += 1;
  ws.maxBought[gen] = Math.max(ws.maxBought[gen]!, ws.bought[gen]!);
  ws.maxHarmony = Math.max(ws.maxHarmony, harmony(ws));
  touchCalm(s, w);
  return true;
}

export function buyUpgrade(s: SimState, w: WorldId, offer: UpgradeOffer): boolean {
  const ws = world(s, w);
  if (offer.cost > ws.currency) return false;
  ws.currency -= offer.cost;
  ws.upgrades.add(offer.id);
  touchCalm(s, w);
  return true;
}

export function buyPerk(s: SimState, perk: PerkDef): boolean {
  if (!perkAvailable(s, perk)) return false;
  const ws = world(s, perk.world);
  const cost = perkCost(s, perk);
  if (cost > ws.plumas) return false;
  ws.plumas -= cost;
  ws.perks[perk.id] = (ws.perks[perk.id] ?? 0) + 1;
  s.events.push({ t: s.time, kind: 'perk', world: perk.world, text: `${perk.world}: ${perk.name} → ${ws.perks[perk.id]}` });
  return true;
}

export function startCurrency(s: SimState, w: WorldId): number {
  const d = def(w);
  let c = d.startCurrency;
  for (const { perk, level } of perksOfKind(s, w, 'startCurrency')) c *= (perk.effect as { perLevel: number }).perLevel ** level;
  return c;
}

export function ascend(s: SimState, w: WorldId): number {
  const ws = world(s, w);
  const gain = plumasPending(s, w);
  if (gain <= 0) return 0;
  ws.plumas += gain;
  ws.plumasTotal += gain;
  ws.ascensions += 1;
  s.events.push({ t: s.time, kind: 'ascension', world: w, text: `${w}: ascensión #${ws.ascensions} (+${gain}, total ${ws.plumasTotal}, ronda ${(ws.runTime / 3600).toFixed(2)} h)` });
  ws.currency = startCurrency(s, w);
  ws.runEarned = 0;
  ws.owned.fill(0);
  ws.bought.fill(0);
  ws.upgrades.clear();
  ws.runTime = 0;
  ws.calm = 1; // cada ronda empieza con la calma llena
  ws.calmPenaltyUntil = -1;
  return gain;
}

// ---------------------------------------------------------------------------
// Tiempo
// ---------------------------------------------------------------------------

/** Avanza dt segundos la producción de todos los mundos desbloqueados (sin compras). */
export function produce(s: SimState, dt: number): void {
  for (const d of WORLDS) {
    const ws = world(s, d.id);
    if (!ws.unlocked) continue;
    let gained: number;
    if (d.mechanic === 'chain') {
      gained = advanceChainExact(d, ws, globalMult(s, d.id), dt);
    } else if (d.mechanic === 'calm') {
      // Integral exacta de 1 + maxBonus·calm(t) con calm creciendo linealmente hasta 1.
      const c0 = ws.calm;
      const ramp = d.calm!.rampSeconds;
      const tFull = Math.max(0, (1 - c0) * ramp);
      const t1 = Math.min(dt, tFull);
      const c1 = c0 + t1 / ramp;
      const avgCalm = (t1 * (c0 + c1) / 2 + (dt - t1) * 1) / dt;
      ws.calm = Math.min(1, c1);
      gained = income(s, d.id) * (1 + d.calm!.maxBonus * avgCalm) * dt;
    } else {
      gained = income(s, d.id) * dt;
    }
    ws.currency += gained;
    ws.runEarned += gained;
    ws.lifetimeEarned += gained;
    ws.runTime += dt;
    if (!(ws.lifetimeEarned < 1e300)) throw new Error(`${d.id}: desbordamiento numérico`);
  }
  s.time += dt;
}

/**
 * Cadena del Bosque: el nivel k produce unidades del nivel k-1 a ritmo r_k por unidad,
 * y el nivel 0 produce moneda a ritmo r_0. Es un sistema lineal nilpotente, así que la
 * solución exacta para cualquier dt es un polinomio finito (sin error de integración):
 *   owned_j(dt) = Σ_{k≥j} owned_k · (r_{j+1}·…·r_k) · dt^(k−j) / (k−j)!
 *   moneda(dt)  = r_0 · Σ_{k≥0} owned_k · (r_1·…·r_k) · dt^(k+1) / (k+1)!
 */
export function advanceChainExact(d: WorldDef, w: WorldState, g: number, dt: number): number {
  const n = d.generators.length;
  const r = d.generators.map((gen, k) => gen.baseProd * genMult(d, w, k) * (k === 0 ? g : 1));
  const before = w.owned.slice();
  for (let j = 0; j < n; j++) {
    let sum = 0;
    let coef = 1; // producto de ritmos · dt^(k−j) / (k−j)!
    for (let k = j; k < n; k++) {
      if (k > j) coef *= (r[k]! * dt) / (k - j);
      sum += before[k]! * coef;
    }
    w.owned[j] = sum;
  }
  let gained = 0;
  let coef = r[0]! * dt; // r_0 · (r_1…r_k) · dt^(k+1) / (k+1)!
  for (let k = 0; k < n; k++) {
    if (k > 0) coef *= (r[k]! * dt) / (k + 1);
    gained += before[k]! * coef;
  }
  return gained;
}

// ---------------------------------------------------------------------------
// Colección y desbloqueos
// ---------------------------------------------------------------------------

function requirementMet(s: SimState, r: Requirement): boolean {
  switch (r.kind) {
    case 'genCount': return world(s, r.world).maxBought[r.gen]! >= r.count;
    case 'ascensions': return world(s, r.world).ascensions >= r.count;
    case 'plumasTotal': return world(s, r.world).plumasTotal >= r.count;
    case 'lifetime': return world(s, r.world).lifetimeEarned >= r.amount;
    case 'harmony': return world(s, 'huerta').maxHarmony >= r.count;
    case 'varieties': return r.ids.every((id) => s.varieties.has(id));
  }
}

export function updateCollectionAndUnlocks(s: SimState): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of VARIETIES) {
      if (s.varieties.has(v.id) || !v.requires.every((r) => requirementMet(s, r))) continue;
      s.varieties.add(v.id);
      s.events.push({ t: s.time, kind: 'variety', text: `colección: ${v.name} (${s.varieties.size}/${VARIETIES.length})` });
      changed = true;
    }
  }
  for (const d of WORLDS) {
    const ws = world(s, d.id);
    if (ws.unlocked || !d.unlock) continue;
    const fromDef = WORLD_BY_ID[d.unlock.world]!;
    const genIndex = fromDef.generators.findIndex((g) => g.id === d.unlock!.gen);
    if (world(s, d.unlock.world).maxBought[genIndex]! >= d.unlock.count) {
      ws.unlocked = true;
      ws.currency = startCurrency(s, d.id);
      s.events.push({ t: s.time, kind: 'unlock', world: d.id, text: `desbloqueado ${d.name}` });
    }
  }
}
