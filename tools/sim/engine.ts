// Motor económico del simulador. Sin UI, sin azar, sin reloj real.
// Usa number (double). El juego usará break_infinity.js; aquí vigilamos que nada pase de 1e300.

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

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function perkLevel(s: SimState, perkId: string): number {
  const p = PERK_BY_ID[perkId];
  return s.worlds[p.world].perks[perkId] ?? 0;
}

function perksOfKind(s: SimState, world: WorldId, kind: string): { perk: PerkDef; level: number }[] {
  const out: { perk: PerkDef; level: number }[] = [];
  for (const p of PERKS) {
    if (p.world !== world || p.effect.kind !== kind) continue;
    const level = s.worlds[world].perks[p.id] ?? 0;
    if (level > 0) out.push({ perk: p, level });
  }
  return out;
}

function hasPerkKind(s: SimState, world: WorldId, kind: string): boolean {
  return perksOfKind(s, world, kind).length > 0;
}

export const hasAutobuyGenerators = (s: SimState, w: WorldId) => hasPerkKind(s, w, 'autobuyGenerators');
export const hasAutobuyUpgrades = (s: SimState, w: WorldId) => hasPerkKind(s, w, 'autobuyUpgrades');

function bonusApplies(b: Bonus, world: WorldId, kind: Bonus['kind']): boolean {
  return b.kind === kind && (b.world === 'all' || b.world === world);
}

function collectionMult(s: SimState, world: WorldId, kind: Bonus['kind']): number {
  let m = 1;
  for (const v of VARIETIES) if (s.varieties.has(v.id) && bonusApplies(v.bonus, world, kind)) m *= v.bonus.mult;
  for (const set of SETS) {
    if (!bonusApplies(set.bonus, world, kind)) continue;
    const complete = VARIETIES.filter((v) => v.set === set.id).every((v) => s.varieties.has(v.id));
    if (complete) m *= set.bonus.mult;
  }
  return m;
}

/** Multiplicador global de producción del mundo (todo menos mejoras por generador y calma). */
export function globalMult(s: SimState, world: WorldId): number {
  const def = WORLD_BY_ID[world];
  const w = s.worlds[world];
  let m = 1;
  for (const u of def.globalUpgrades) if (w.upgrades.has(u.id)) m *= u.mult;
  m *= 1 + (def.prestige.perPluma + perkSum(s, world, 'perPlumaBonus')) * w.plumasTotal;
  for (const { perk, level } of perksOfKind(s, world, 'prodMult')) m *= (perk.effect as { perLevel: number }).perLevel ** level;
  for (const other of WORLDS) {
    if (other.id === world) continue;
    for (const { perk, level } of perksOfKind(s, other.id, 'crossProd')) m *= 1 + (perk.effect as { perLevel: number }).perLevel * level;
  }
  m *= collectionMult(s, world, 'prod');
  if (def.mechanic === 'harmony') m *= harmonyMult(def, w);
  return m;
}

export function harmonyMult(def: WorldDef, w: WorldState): number {
  const h = harmony(w);
  const cfg = def.harmony!;
  const steps = cfg.thresholds.filter((t) => h >= t).length;
  return (1 + cfg.perLevel * h) * cfg.mult ** steps;
}

export function harmony(w: WorldState): number {
  return Math.min(...w.owned);
}

export function calmMult(def: WorldDef, w: WorldState): number {
  return def.mechanic === 'calm' ? 1 + def.calm!.maxBonus * w.calm : 1;
}

export function genUpgradeId(gen: number, k: number): string {
  return `g${gen}-u${k}`;
}

export function genMult(def: WorldDef, w: WorldState, gen: number): number {
  let m = 1;
  for (let k = 0; k < def.genUpgradeCounts.length; k++) if (w.upgrades.has(genUpgradeId(gen, k))) m *= def.genUpgradeMult;
  return m;
}

/** Moneda por segundo (sin calma). En chain solo cuenta el nivel 0. */
export function income(s: SimState, world: WorldId): number {
  const def = WORLD_BY_ID[world];
  const w = s.worlds[world];
  const g = globalMult(s, world);
  if (def.mechanic === 'chain') return w.owned[0] * def.generators[0].baseProd * genMult(def, w, 0) * g;
  let total = 0;
  for (let i = 0; i < def.generators.length; i++) total += w.owned[i] * def.generators[i].baseProd * genMult(def, w, i);
  return total * g;
}

/**
 * Valor de la granja para decidir compras: moneda/s equivalente en un horizonte H.
 * En chain, una unidad del nivel k aporta prod_k·…·prod_0 · H^k / k! de moneda en H segundos.
 */
export function valueRate(s: SimState, world: WorldId, horizon: number): number {
  const def = WORLD_BY_ID[world];
  if (def.mechanic !== 'chain') return income(s, world);
  const w = s.worlds[world];
  const g = globalMult(s, world);
  let total = 0;
  let chainRate = 1;
  let fact = 1;
  for (let k = 0; k < def.generators.length; k++) {
    chainRate *= def.generators[k].baseProd * genMult(def, w, k) * (k === 0 ? g : 1);
    if (k > 0) fact *= k + 1;
    total += (w.owned[k] * chainRate * horizon ** (k + 1)) / fact;
  }
  return total / horizon;
}

export function costMult(s: SimState, world: WorldId): number {
  let m = collectionMult(s, world, 'cost');
  for (const { perk, level } of perksOfKind(s, world, 'costMult')) m *= (perk.effect as { perLevel: number }).perLevel ** level;
  return m;
}

function perkSum(s: SimState, world: WorldId, kind: string): number {
  let total = 0;
  for (const { perk, level } of perksOfKind(s, world, kind)) total += (perk.effect as { perLevel: number }).perLevel * level;
  return total;
}

export function growthOf(def: WorldDef, gen: number, s?: SimState): number {
  const base = def.generators[gen].costGrowth ?? def.costGrowth;
  return s ? base - perkSum(s, def.id, 'costGrowthDelta') : base;
}

export function genCost(s: SimState, world: WorldId, gen: number): number {
  const def = WORLD_BY_ID[world];
  return def.generators[gen].baseCost * growthOf(def, gen, s) ** s.worlds[world].bought[gen] * costMult(s, world);
}

export interface UpgradeOffer { id: string; cost: number; gen: number | null }

export function availableUpgrades(s: SimState, world: WorldId): UpgradeOffer[] {
  const def = WORLD_BY_ID[world];
  const w = s.worlds[world];
  let upMult = 1;
  for (const { perk, level } of perksOfKind(s, world, 'upgradeCostMult')) upMult *= (perk.effect as { perLevel: number }).perLevel ** level;
  const out: UpgradeOffer[] = [];
  for (let i = 0; i < def.generators.length; i++) {
    for (let k = 0; k < def.genUpgradeCounts.length; k++) {
      const id = genUpgradeId(i, k);
      const need = def.genUpgradeCounts[k];
      if (w.upgrades.has(id) || w.bought[i] < need) continue;
      out.push({ id, gen: i, cost: def.genUpgradeCostFactor * def.generators[i].baseCost * growthOf(def, i, s) ** need * upMult });
    }
  }
  for (const u of def.globalUpgrades) {
    if (w.upgrades.has(u.id) || w.runEarned < u.cost * 0.25) continue;
    out.push({ id: u.id, gen: null, cost: u.cost * upMult });
  }
  return out;
}

export function plumaMult(s: SimState, world: WorldId): number {
  let m = 1;
  for (const { perk, level } of perksOfKind(s, world, 'plumaMult')) m += (perk.effect as { perLevel: number }).perLevel * level;
  return m;
}

export function plumasPending(s: SimState, world: WorldId): number {
  const def = WORLD_BY_ID[world];
  const w = s.worlds[world];
  const total = Math.floor((w.lifetimeEarned / def.prestige.e0) ** def.prestige.exponent * plumaMult(s, world));
  return Math.max(0, total - w.plumasTotal);
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

function touchCalm(s: SimState, world: WorldId): void {
  const def = WORLD_BY_ID[world];
  if (def.mechanic !== 'calm') return;
  const w = s.worlds[world];
  if (s.time >= w.calmPenaltyUntil) {
    w.calm *= def.calm!.penalty;
    w.calmPenaltyUntil = s.time + def.calm!.windowSeconds;
  }
}

export function buyGenerator(s: SimState, world: WorldId, gen: number): boolean {
  const w = s.worlds[world];
  const cost = genCost(s, world, gen);
  if (cost > w.currency) return false;
  w.currency -= cost;
  if (w.bought[gen] === 0 && w.maxBought[gen] === 0) {
    s.events.push({ t: s.time, kind: 'newTier', world, text: `${world}: primer ${WORLD_BY_ID[world].generators[gen].name}` });
  }
  w.bought[gen] += 1;
  w.owned[gen] += 1;
  w.maxBought[gen] = Math.max(w.maxBought[gen], w.bought[gen]);
  w.maxHarmony = Math.max(w.maxHarmony, harmony(w));
  touchCalm(s, world);
  return true;
}

export function buyUpgrade(s: SimState, world: WorldId, offer: UpgradeOffer): boolean {
  const w = s.worlds[world];
  if (offer.cost > w.currency) return false;
  w.currency -= offer.cost;
  w.upgrades.add(offer.id);
  touchCalm(s, world);
  return true;
}

export function buyPerk(s: SimState, perk: PerkDef): boolean {
  if (!perkAvailable(s, perk)) return false;
  const w = s.worlds[perk.world];
  const cost = perkCost(s, perk);
  if (cost > w.plumas) return false;
  w.plumas -= cost;
  w.perks[perk.id] = (w.perks[perk.id] ?? 0) + 1;
  s.events.push({ t: s.time, kind: 'perk', world: perk.world, text: `${perk.world}: ${perk.name} → ${w.perks[perk.id]}` });
  return true;
}

export function startCurrency(s: SimState, world: WorldId): number {
  const def = WORLD_BY_ID[world];
  let c = def.startCurrency;
  for (const { perk, level } of perksOfKind(s, world, 'startCurrency')) c *= (perk.effect as { perLevel: number }).perLevel ** level;
  return c;
}

export function ascend(s: SimState, world: WorldId): number {
  const w = s.worlds[world];
  const gain = plumasPending(s, world);
  if (gain <= 0) return 0;
  w.plumas += gain;
  w.plumasTotal += gain;
  w.ascensions += 1;
  s.events.push({ t: s.time, kind: 'ascension', world, text: `${world}: ascensión #${w.ascensions} (+${gain}, total ${w.plumasTotal}, ronda ${(w.runTime / 3600).toFixed(2)} h)` });
  w.currency = startCurrency(s, world);
  w.runEarned = 0;
  w.owned.fill(0);
  w.bought.fill(0);
  w.upgrades.clear();
  w.runTime = 0;
  w.calm = 1; // cada ronda empieza con la calma llena
  w.calmPenaltyUntil = -1;
  return gain;
}

// ---------------------------------------------------------------------------
// Tiempo
// ---------------------------------------------------------------------------

/** Avanza dt segundos la producción de todos los mundos desbloqueados (sin compras). */
export function produce(s: SimState, dt: number): void {
  for (const def of WORLDS) {
    const w = s.worlds[def.id];
    if (!w.unlocked) continue;
    let gained: number;
    if (def.mechanic === 'chain') {
      gained = advanceChainExact(def, w, globalMult(s, def.id), dt);
    } else if (def.mechanic === 'calm') {
      // Integral exacta de 1 + maxBonus·calm(t) con calm creciendo linealmente hasta 1.
      const c0 = w.calm;
      const ramp = def.calm!.rampSeconds;
      const tFull = Math.max(0, (1 - c0) * ramp);
      const t1 = Math.min(dt, tFull);
      const c1 = c0 + t1 / ramp;
      const avgCalm = (t1 * (c0 + c1) / 2 + (dt - t1) * 1) / dt;
      w.calm = Math.min(1, c1);
      gained = income(s, def.id) * (1 + def.calm!.maxBonus * avgCalm) * dt;
    } else {
      gained = income(s, def.id) * dt;
    }
    w.currency += gained;
    w.runEarned += gained;
    w.lifetimeEarned += gained;
    w.runTime += dt;
    if (!(w.lifetimeEarned < 1e300)) throw new Error(`${def.id}: desbordamiento numérico`);
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
export function advanceChainExact(def: WorldDef, w: WorldState, g: number, dt: number): number {
  const n = def.generators.length;
  const r = def.generators.map((gen, k) => gen.baseProd * genMult(def, w, k) * (k === 0 ? g : 1));
  const before = w.owned.slice();
  for (let j = 0; j < n; j++) {
    let sum = 0;
    let coef = 1; // producto de ritmos · dt^(k−j) / (k−j)!
    for (let k = j; k < n; k++) {
      if (k > j) coef *= (r[k] * dt) / (k - j);
      sum += before[k] * coef;
    }
    w.owned[j] = sum;
  }
  let gained = 0;
  let coef = r[0] * dt; // r_0 · (r_1…r_k) · dt^(k+1) / (k+1)!
  for (let k = 0; k < n; k++) {
    if (k > 0) coef *= (r[k] * dt) / (k + 1);
    gained += before[k] * coef;
  }
  return gained;
}

// ---------------------------------------------------------------------------
// Colección y desbloqueos
// ---------------------------------------------------------------------------

function requirementMet(s: SimState, r: Requirement): boolean {
  switch (r.kind) {
    case 'genCount': return s.worlds[r.world].maxBought[r.gen] >= r.count;
    case 'ascensions': return s.worlds[r.world].ascensions >= r.count;
    case 'plumasTotal': return s.worlds[r.world].plumasTotal >= r.count;
    case 'lifetime': return s.worlds[r.world].lifetimeEarned >= r.amount;
    case 'harmony': return s.worlds.huerta.maxHarmony >= r.count;
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
  for (const def of WORLDS) {
    const w = s.worlds[def.id];
    if (w.unlocked || !def.unlock) continue;
    if (s.worlds[def.unlock.world].plumasTotal >= def.unlock.plumasTotal) {
      w.unlocked = true;
      w.currency = startCurrency(s, def.id);
      s.events.push({ t: s.time, kind: 'unlock', world: def.id, text: `desbloqueado ${def.name}` });
    }
  }
}
