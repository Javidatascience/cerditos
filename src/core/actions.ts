// Únicas funciones (junto con tick.ts y offline.ts) que mutan el GameState.
// Ver CLAUDE.md "Reglas de código" y docs/06-mina.md.

import type { AccessorySlot, Content } from '../content/types.ts';
import { basketValue } from './basket.ts';
import {
  accessoryOwned,
  ascendUnlocked,
  baseIncomePerSecond,
  companionAbility,
  companionLevel,
  companionOwned,
  getPerk,
  globalUpgradeCost,
  globalUpgradeUnlocked,
  skinOwned,
  nextUpgradeCost,
  nextUpgradeUnlocked,
  getTool,
  perkAvailable,
  perkCost,
  plumasPending,
  startCoins,
  tapGain,
  toolBulkCost,
  toolMaxAffordable,
  toolOwned,
} from './formulas.ts';
import { blowGain, blowReady, caveCostFactor, furnaceCost } from './cave.ts';
import { durationFactor, flowerAvailable, gardenRows, gardenUnlocked, growMs, mutationChance, neighbors, rand01, shinyChance } from './garden.ts';
import { perkSumOf } from './perkEffects.ts';
import { addEntry, gameClockMs } from './journal.ts';
import { D, Decimal } from './num.ts';
import { updateReveals } from './reveal.ts';
import type { GameState, PerkId, Settings, ToolId } from './state.ts';

export type BuyAmount = 1 | 10 | 'max';

function gain(state: GameState, content: Content, amount: Decimal): void {
  state.coins = state.coins.add(amount);
  state.lifetime = state.lifetime.add(amount);
  updateReveals(state, content);
}

/** Pica: da `tapGain` monedas (1 s de producción, mínimo 1, con Manos de acero y el impulso del visitante). Devuelve lo ganado. */
export function tap(state: GameState, content: Content): Decimal {
  const amount = tapGain(state, content);
  gain(state, content, amount);
  state.taps += 1;
  state.momentum = Math.min(1, state.momentum + content.game.momentumPerTap); // cada pico sube la inercia
  companionTap(state, content);
  return amount;
}

/**
 * Compra `amount` unidades de la herramienta (1, 10 "todo o nada", o "máx" = las que se puedan
 * pagar). Devuelve las unidades compradas (0 si ninguna). Nunca deja la moneda negativa.
 */
export function buyTool(state: GameState, content: Content, toolId: ToolId, amount: BuyAmount = 1): number {
  const tool = getTool(content, toolId);
  const owned = toolOwned(state, toolId);
  const count = amount === 'max' ? toolMaxAffordable(state, content, tool, owned, state.coins) : amount;
  if (count <= 0) return 0;
  const cost = toolBulkCost(state, content, tool, owned, count);
  if (state.coins.lt(cost)) return 0;
  state.coins = state.coins.sub(cost);
  state.tools[toolId] = owned + count;
  state.maxOwned[toolId] = Math.max(state.maxOwned[toolId] ?? 0, owned + count);
  updateReveals(state, content);
  return count;
}

/**
 * Compra la siguiente mejora de la herramienta (×2 de su producción) si ya se tienen las unidades
 * que la desbloquean y hay monedas. Se compran en orden. Devuelve `true` si se compró.
 */
export function buyUpgrade(state: GameState, content: Content, toolId: ToolId): boolean {
  const tool = getTool(content, toolId);
  if (!nextUpgradeUnlocked(state, content, toolId)) return false;
  const cost = nextUpgradeCost(state, content, tool);
  if (cost === null || state.coins.lt(cost)) return false;
  state.coins = state.coins.sub(cost);
  state.upgrades[toolId] = (state.upgrades[toolId] ?? 0) + 1;
  updateReveals(state, content);
  return true;
}

/** Compra una mejora global (×1,5 a toda la producción) si ya está desbloqueada y hay monedas. Devuelve `true` si se compró. */
export function buyGlobalUpgrade(state: GameState, content: Content, id: string): boolean {
  const def = content.globalUpgrades.find((u) => u.id === id);
  if (!def || state.globalUpgrades[id] || !globalUpgradeUnlocked(state, def)) return false;
  const cost = globalUpgradeCost(state, content, def);
  if (state.coins.lt(cost)) return false;
  state.coins = state.coins.sub(cost);
  state.globalUpgrades[id] = true;
  return true;
}

/** Cambia la cantidad por defecto de los botones de compra (×1 / ×10 / máx). */
export function setBuyAmount(state: GameState, amount: BuyAmount): void {
  state.settings.buyAmount = amount;
}

export function setNotation(state: GameState, notation: Settings['notation']): void {
  state.settings.notation = notation;
}

export function setEffects(state: GameState, enabled: boolean): void {
  state.settings.effects = enabled;
}

/** Compra un nivel de una ventaja permanente con plumas. Devuelve `true` si se compró. */
export function buyPerk(state: GameState, content: Content, perkId: PerkId): boolean {
  const perk = getPerk(content, perkId);
  if (!perkAvailable(state, perk)) return false;
  const level = state.perks[perkId] ?? 0;
  const cost = perkCost(perk, level);
  if (state.plumas.lt(cost)) return false;
  state.plumas = state.plumas.sub(cost);
  state.perks[perkId] = level + 1;
  syncGardenCells(state, content); // Más tierra añade filas de casillas
  return true;
}

/** Ajusta el número de casillas del jardín a las filas actuales (solo crece: añade casillas vacías). */
function syncGardenCells(state: GameState, content: Content): void {
  const wanted = content.garden.cols * gardenRows(state, content);
  while (state.garden.cells.length < wanted) state.garden.cells.push(null);
}

/**
 * Asciende: cobra las plumas pendientes (por lo ganado en la vida) y reinicia la ronda (monedas y
 * herramientas), conservando plumas, ventajas, logros y récords. Solo si ya se llegó a la herramienta
 * que lo permite. Devuelve las plumas ganadas (0 si no se pudo o no había ninguna). `now`: epoch ms.
 */
export function ascend(state: GameState, content: Content, now: number): number {
  if (!ascendUnlocked(state, content)) return 0;
  const pending = plumasPending(state, content);
  if (pending <= 0) return 0;

  state.plumas = state.plumas.add(pending);
  state.plumasTotal = state.plumasTotal.add(pending);
  state.ascensions += 1;
  state.tools = {};
  state.upgrades = {};
  state.globalUpgrades = {};
  state.momentum = 0;
  state.coins = startCoins(state, content);
  state.basketSince = state.time;
  updateReveals(state, content);

  addEntry(state, `Subes a la superficie con ${pending} esmeralda${pending === 1 ? '' : 's'}. El cerdito vuelve a empezar, con más ganas.`, now);
  return pending;
}

// ---------------------------------------------------------------------------
// Cesta y visitante
// ---------------------------------------------------------------------------

/** Recoge la cesta: suma su valor a las monedas y la vacía. Devuelve lo recogido. */
export function collectBasket(state: GameState, content: Content): Decimal {
  const amount = basketValue(state, content);
  gain(state, content, amount);
  state.basketSince = state.time;
  return amount;
}

export type VisitorKind = 'injection' | 'boost' | 'golden';

/** Segundos de ingresos que da la inyección de un visitante. */
export const VISITOR_INJECTION_SECONDS = 30;
/** Multiplicador y duración del impulso de un visitante. */
export const VISITOR_BOOST = { mult: 3, seconds: 15 };
/** El cerdito viajero dorado (raro): ingresos de golpe, un impulso mayor y 3 bellotas. */
export const VISITOR_GOLDEN = { injectionSeconds: 180, mult: 5, seconds: 25, acorns: 6 };
/** Bellotas que da siempre el cerdito viajero normal. */
export const VISITOR_ACORNS = 2;

/**
 * Recompensa de un cerdito viajero: `injection` = 10 min de ingresos de golpe; `boost` = ×5 de producción
 * y picos durante 60 s. Además siempre da 1 bellota (la segunda moneda, para cosméticos).
 */
export function claimVisitor(state: GameState, content: Content, kind: VisitorKind): void {
  state.acorns += kind === 'golden' ? VISITOR_GOLDEN.acorns : VISITOR_ACORNS;
  state.stats.visitors += 1;
  if (kind === 'golden') {
    state.buff = { mult: VISITOR_GOLDEN.mult, until: state.time + VISITOR_GOLDEN.seconds };
    gain(state, content, baseIncomePerSecond(state, content).mul(VISITOR_GOLDEN.injectionSeconds));
    return;
  }
  if (kind === 'boost') {
    state.buff = { mult: VISITOR_BOOST.mult, until: state.time + VISITOR_BOOST.seconds };
    return;
  }
  gain(state, content, baseIncomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS));
}

export { D };

// ---------------------------------------------------------------------------
// Cosméticos: pieles y compañeros (se pagan con bellotas)
// ---------------------------------------------------------------------------

/** Compra una piel con bellotas (las de logro no se compran: se tienen al conseguir el logro). */
export function buySkin(state: GameState, content: Content, id: string): boolean {
  const skin = content.skins.find((s) => s.id === id);
  if (!skin || skin.cost === null || skinOwned(state, skin) || state.acorns < skin.cost) return false;
  state.acorns -= skin.cost;
  state.skins[id] = true;
  return true;
}

/** Se pone una piel que ya se tiene. */
export function equipSkin(state: GameState, content: Content, id: string): boolean {
  const skin = content.skins.find((s) => s.id === id);
  if (!skin || !skinOwned(state, skin)) return false;
  state.activeSkin = id;
  return true;
}

/** Compra un compañero con bellotas. */
export function buyCompanion(state: GameState, content: Content, id: string): boolean {
  const companion = content.companions.find((c) => c.id === id);
  if (!companion || companion.cost === null || companionOwned(state, companion) || state.acorns < companion.cost) return false;
  state.acorns -= companion.cost;
  state.companions[id] = true;
  return true;
}

/** Máximo de compañeros a la vez en la escena. */
/** Compra una prenda con bellotas (las de logro no se compran: se tienen al conseguir el logro). */
export function buyAccessory(state: GameState, content: Content, id: string): boolean {
  const accessory = content.accessories.find((a) => a.id === id);
  if (!accessory || accessory.cost === null || accessoryOwned(state, accessory) || state.acorns < accessory.cost) return false;
  state.acorns -= accessory.cost;
  state.wardrobe.owned[id] = true;
  return true;
}

/** Pone una prenda (o la quita con `null`) en su hueco: gorro, ropa o cola. Solo si es de ese hueco y se tiene. */
export function wearAccessory(state: GameState, content: Content, slot: AccessorySlot, id: string | null): boolean {
  if (id === null) {
    state.wardrobe.worn[slot] = null;
    return true;
  }
  const accessory = content.accessories.find((a) => a.id === id);
  if (!accessory || accessory.slot !== slot || !accessoryOwned(state, accessory)) return false;
  state.wardrobe.worn[slot] = id;
  return true;
}

/** Mejora un compañero con bellotas (un nivel). */
export function upgradeCompanion(state: GameState, content: Content, id: string): boolean {
  const companion = content.companions.find((c) => c.id === id);
  if (!companion || !companionOwned(state, companion)) return false;
  const level = companionLevel(state, id);
  const next = companion.upgrades[level];
  if (!next || state.acorns < next.cost) return false;
  state.acorns -= next.cost;
  state.companionLevels[id] = level + 1;
  return true;
}

export const MAX_ACTIVE_COMPANIONS = 2;

/** Compañeros que se pueden llevar a la vez: 2 de base más los que dé Un amigo más. */
export function maxActiveCompanions(state: GameState, content: Content): number {
  return MAX_ACTIVE_COMPANIONS + Math.round(perkSumOf(state, content, 'companionSlots'));
}

/** Pone o quita un compañero que ya se tiene de la escena (si hay demasiados, sale el más antiguo). */
export function toggleCompanion(state: GameState, content: Content, id: string): boolean {
  const companion = content.companions.find((c) => c.id === id);
  if (!companion || !companionOwned(state, companion)) return false;
  if (state.activeCompanions.includes(id)) {
    state.activeCompanions = state.activeCompanions.filter((c) => c !== id);
  } else {
    state.activeCompanions = [...state.activeCompanions, id].slice(-maxActiveCompanions(state, content));
  }
  return true;
}

// ---------------------------------------------------------------------------
// Habilidades de los compañeros (solo con el juego abierto: no cuentan offline)
// ---------------------------------------------------------------------------

function activeCompanionDefs(state: GameState, content: Content) {
  return content.companions.filter((c) => state.activeCompanions.includes(c.id));
}

/** Cada pico avanza al compañero que cuenta picos (el topo). */
function companionTap(state: GameState, content: Content): void {
  for (const c of activeCompanionDefs(state, content)) {
    const ability = companionAbility(state, c);
    if (ability.kind !== 'tapAcorn') continue;
    const progress = (state.companionProgress[c.id] ?? 0) + 1;
    if (progress >= ability.every) {
      state.companionProgress[c.id] = 0;
      state.acorns += 1;
    } else {
      state.companionProgress[c.id] = progress;
    }
  }
}

/** Avanza `dt` segundos de juego abierto las habilidades por tiempo (el gato y el dragón). */
export function companionTick(state: GameState, content: Content, dt: number): void {
  for (const c of activeCompanionDefs(state, content)) {
    const ability = companionAbility(state, c);
    if (ability.kind !== 'coinGift') continue;
    const every = ability.everySeconds;
    const progress = (state.companionProgress[c.id] ?? 0) + dt;
    if (progress < every) {
      state.companionProgress[c.id] = progress;
      continue;
    }
    state.companionProgress[c.id] = 0;
    gain(state, content, baseIncomePerSecond(state, content).mul(ability.incomeSeconds));
    addEntry(state, `${c.name} te ha traído un regalo de monedas.`, gameClockMs(state));
  }
}

// ---------------------------------------------------------------------------
// Conejo: una herramienta gratis cada 6 horas (tiempo real)
// ---------------------------------------------------------------------------

/** Segundos de espera que quedan hasta poder usar al conejo (0 = listo). `now` en epoch ms. */
export function rabbitWaitSeconds(state: GameState, content: Content, now: number): number {
  const rabbit = content.companions.find((c) => c.ability.kind === 'freeTool');
  if (!rabbit) return 0;
  const ability = companionAbility(state, rabbit);
  const last = state.companionProgress[rabbit.id];
  if (last === undefined || ability.kind !== 'freeTool') return 0;
  return Math.max(0, (last + ability.cooldownHours * 3600_000 - now) / 1000);
}

/** Compra gratis 1 unidad de una herramienta ya descubierta, con el conejo puesto y sin espera. */
export function useRabbit(state: GameState, content: Content, toolId: ToolId, now: number): boolean {
  const rabbit = content.companions.find((c) => c.ability.kind === 'freeTool');
  if (!rabbit || !state.activeCompanions.includes(rabbit.id) || rabbitWaitSeconds(state, content, now) > 0) return false;
  const index = content.tools.findIndex((t) => t.id === toolId);
  if (index < 0 || index >= state.revealed) return false;
  state.tools[toolId] = toolOwned(state, toolId) + 1;
  state.maxOwned[toolId] = Math.max(state.maxOwned[toolId] ?? 0, state.tools[toolId] ?? 0);
  state.companionProgress[rabbit.id] = now;
  addEntry(state, `${rabbit.name} te ha conseguido una herramienta gratis.`, gameClockMs(state));
  updateReveals(state, content);
  return true;
}

// ---------------------------------------------------------------------------
// Cueva del Dragón
// ---------------------------------------------------------------------------

function caveOpen(state: GameState, content: Content): boolean {
  return state.plumasTotal.gte(content.cave.unlockPlumas);
}

/** Sopla sobre las brasas: da brasas con un breve enfriamiento. Devuelve lo ganado (0 si no se pudo). */
export function caveBlow(state: GameState, content: Content): Decimal {
  if (!caveOpen(state, content) || !blowReady(state, content)) return D(0);
  const amount = blowGain(state, content);
  state.cave.embers = state.cave.embers.add(amount);
  state.cave.blowAt = state.time;
  return amount;
}

/** Alimenta al dragón con brasas para que pase a la siguiente etapa (huevo → cría → joven → adulto → anciano). */
export function feedDragon(state: GameState, content: Content): boolean {
  const next = content.cave.dragon[state.cave.dragonStage + 1];
  if (!next || !caveOpen(state, content) || state.cave.embers.lt(next.cost)) return false;
  state.cave.embers = state.cave.embers.sub(next.cost);
  state.cave.dragonStage += 1;
  addEntry(state, `El dragón ha crecido: ahora es ${next.name.toLowerCase()}.`, gameClockMs(state));
  return true;
}

export function buyFurnace(state: GameState, content: Content, id: string): boolean {
  const furnace = content.cave.furnaces.find((f) => f.id === id);
  if (!furnace || !caveOpen(state, content)) return false;
  const cost = furnaceCost(content.cave, furnace, state.cave.furnaces[id] ?? 0, caveCostFactor(state, content));
  if (state.cave.embers.lt(cost)) return false;
  state.cave.embers = state.cave.embers.sub(cost);
  state.cave.furnaces[id] = (state.cave.furnaces[id] ?? 0) + 1;
  return true;
}

export function buyCaveNode(state: GameState, content: Content, id: string): boolean {
  const node = content.cave.nodes.find((x) => x.id === id);
  if (!node || !caveOpen(state, content) || state.cave.nodes[id] || state.cave.embers.lt(node.cost)) return false;
  if (node.requires !== null && !state.cave.nodes[node.requires]) return false;
  state.cave.embers = state.cave.embers.sub(node.cost);
  state.cave.nodes[id] = true;
  return true;
}

// ---------------------------------------------------------------------------
// Jardín (tiempo real: `now` en epoch ms; `roll` es un número al azar en [0,1) que pone la UI)
// ---------------------------------------------------------------------------

/** Planta una flor en una casilla vacía (es gratis). */
export function plantFlower(state: GameState, content: Content, cell: number, flowerId: string, now: number): boolean {
  const index = content.garden.flowers.findIndex((f) => f.id === flowerId);
  if (index < 0 || cell < 0 || cell >= state.garden.cells.length || state.garden.cells[cell] || !gardenUnlocked(state, content) || !flowerAvailable(state, content, index)) return false;
  if (!state.garden.cells.some((c) => c)) state.garden.mutateAt = now; // los cruces empiezan a contar desde la primera flor
  state.garden.cells[cell] = { flower: flowerId, plantedAt: now };
  return true;
}

/** Recoge una flor crecida. Devuelve null si no está lista; si no, si ha salido brillante y si es nueva. */
export function harvestFlower(state: GameState, content: Content, cell: number, now: number, roll: number): { shiny: boolean; isNew: boolean } | null {
  const planted = state.garden.cells[cell];
  const flower = planted ? content.garden.flowers.find((f) => f.id === planted.flower) : undefined;
  if (!planted || !flower || now - planted.plantedAt < growMs(state, content, flower)) return null;
  const before = state.garden.found[flower.id];
  const shiny = roll < shinyChance(state, content);
  state.garden.found[flower.id] = { count: (before?.count ?? 0) + 1, shiny: before?.shiny === true || shiny };
  state.garden.cells[cell] = null;
  state.garden.harvests += 1;
  const seconds = flower.effect.seconds * (shiny ? 2 : 1) * durationFactor(state, content); // la brillante dura (o da) el doble
  if (flower.effect.kind === 'coins') gain(state, content, baseIncomePerSecond(state, content).mul(seconds));
  else state.garden.buffs[flower.id] = Math.max(state.garden.buffs[flower.id] ?? 0, state.time + seconds);
  if (before === undefined) addEntry(state, `Has descubierto la flor ${flower.name}.`, gameClockMs(state));
  else if (shiny && !before.shiny) addEntry(state, `¡Ha salido una ${flower.name} brillante!`, gameClockMs(state));
  return { shiny, isNew: before === undefined };
}

/** Un cruce: cada casilla vacía con las dos flores de una receta maduras a su lado puede dar la flor nueva. */
function mutateOnce(state: GameState, content: Content, at: number, interval: number): void {
  const g = content.garden;
  const cells = state.garden.cells;
  const matureAround = (i: number): string[] =>
    neighbors(i, g.cols, gardenRows(state, content)).flatMap((n) => {
      const c = cells[n];
      const def = c ? g.flowers.find((f) => f.id === c.flower) : undefined;
      return c && def && at - c.plantedAt >= growMs(state, content, def) ? [c.flower] : [];
    });
  const spawned: [number, string][] = [];
  cells.forEach((cell, i) => {
    if (cell) return;
    const around = matureAround(i);
    if (around.length < 2) return;
    for (const f of g.flowers) {
      if (!f.recipe) continue;
      const [p, q] = f.recipe;
      const ok = p === q ? around.filter((x) => x === p).length >= 2 : around.includes(p) && around.includes(q);
      if (!ok) continue;
      if (rand01(state.createdAt, interval, i) < mutationChance(state, content)) spawned.push([i, f.id]);
      break;
    }
  });
  for (const [i, flower] of spawned) cells[i] = { flower, plantedAt: at };
}

/** Pone al día los cruces del jardín hasta `now` (como mucho 1 h de intervalos de golpe). */
export function gardenTick(state: GameState, content: Content, now: number): void {
  if (!gardenUnlocked(state, content)) return;
  const step = content.garden.mutationSeconds * 1000;
  const g = state.garden;
  if (!g.cells.some((c) => c)) {
    g.mutateAt = now;
    return;
  }
  let done = 0;
  while (g.mutateAt + step <= now && done < 120) {
    g.mutateAt += step;
    done += 1;
    mutateOnce(state, content, g.mutateAt, Math.floor(g.mutateAt / step));
  }
  if (g.mutateAt + step <= now) g.mutateAt = now;
}
