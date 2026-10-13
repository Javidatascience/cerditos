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
  currentIncomePerSecond,
  getPerk,
  globalUpgradeCost,
  globalUpgradeUnlocked,
  synergyCost,
  synergyUnlocked,
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
import { armoryCost, armoryLevel, bossStats, coinEmbers, monstersAt, monsterStats, soulLevel, soulsMult, soulsPending, soulUpgradeCost, startEmbers } from './cave.ts';
import { settleGarden, cellMature, cellMatureAt, cellShiny, durationFactor, flowerAvailable, gardenRows, gardenUnlocked, mutationChance, neighbors8, rand01 } from './garden.ts';
import { basketAcornHours, basketAcornsReady, creatureOf, hatchLeftMs, nestSlotCount, nestUnlocked } from './nest.ts';
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

/** Compra una sinergia (desbloqueada con las unidades de las dos herramientas). */
export function buySynergy(state: GameState, content: Content, id: string): boolean {
  const def = content.synergies.find((s) => s.id === id);
  if (!def || state.synergies[id] || !synergyUnlocked(state, def)) return false;
  const cost = synergyCost(state, content, def);
  if (state.coins.lt(cost)) return false;
  state.coins = state.coins.sub(cost);
  state.synergies[id] = true;
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
export function buyPerk(state: GameState, content: Content, perkId: PerkId, now: number = gameClockMs(state)): boolean {
  const perk = getPerk(content, perkId);
  if (!perkAvailable(state, perk)) return false;
  const level = state.perks[perkId] ?? 0;
  const cost = perkCost(perk, level);
  if (state.plumas.lt(cost)) return false;
  state.plumas = state.plumas.sub(cost);
  settleGarden(state, content, now); // Tierra buena cambia la velocidad: se anota lo crecido antes
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
  state.synergies = {};
  state.momentum = 0;
  state.coins = startCoins(state, content);
  updateReveals(state, content);

  addEntry(state, `Subes a la superficie con ${pending} esmeralda${pending === 1 ? '' : 's'}. El cerdito vuelve a empezar, con más ganas.`, now);
  return pending;
}

// ---------------------------------------------------------------------------
// Cesta y visitante
// ---------------------------------------------------------------------------

/** Recoge la cesta (lo ganado mientras no estabas): suma su valor a las monedas y la vacía. Devuelve lo recogido. */
export function collectBasket(state: GameState, content: Content, now: number = gameClockMs(state)): Decimal {
  const amount = basketValue(state);
  gain(state, content, amount);
  state.basket = state.basket.sub(amount);
  // Bellotas que ha ido dejando el topo (Topo excavador): se cobran y se conserva lo que sobre de la última.
  const acorns = basketAcornsReady(state, content, now);
  const hours = basketAcornHours(state, content);
  if (acorns > 0 && hours !== null) {
    state.acorns += acorns;
    state.basketAcornsAt = acorns >= content.nest.basketAcornCap ? now : state.basketAcornsAt + acorns * hours * 3600_000;
  }
  return amount;
}

export type VisitorKind = 'injection' | 'boost' | 'golden';

/** Segundos de ingresos que da la inyección de un visitante. */
export const VISITOR_INJECTION_SECONDS = 30;
/** Multiplicador y duración del impulso de un visitante. */
export const VISITOR_BOOST = { mult: 3, seconds: 20 };
/** El cerdito viajero dorado (raro): ingresos de golpe, un impulso mayor y 6 bellotas. */
export const VISITOR_GOLDEN = { injectionSeconds: 300, mult: 6, seconds: 30, acorns: 6 };
/** Bellotas que da siempre el cerdito viajero normal. */
export const VISITOR_ACORNS = 2;

/**
 * Recompensa de un cerdito viajero: `injection` = unos segundos de ingresos de golpe; `boost` = producción y
 * picos multiplicados un rato; `golden` = las dos cosas, más grandes. Las monedas se calculan con los ingresos
 * "de ahora": incluyen la inercia y cualquier impulso activo. Además da siempre bellotas (cosméticos y mejoras).
 */
export function claimVisitor(state: GameState, content: Content, kind: VisitorKind): void {
  state.acorns += kind === 'golden' ? VISITOR_GOLDEN.acorns : VISITOR_ACORNS;
  state.stats.visitors += 1;
  if (kind === 'golden') {
    gain(state, content, currentIncomePerSecond(state, content).mul(VISITOR_GOLDEN.injectionSeconds)); // antes del impulso nuevo
    state.buff = { mult: VISITOR_GOLDEN.mult, until: state.time + VISITOR_GOLDEN.seconds };
    return;
  }
  if (kind === 'boost') {
    state.buff = { mult: VISITOR_BOOST.mult, until: state.time + VISITOR_BOOST.seconds };
    return;
  }
  gain(state, content, currentIncomePerSecond(state, content).mul(VISITOR_INJECTION_SECONDS));
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
// ---------------------------------------------------------------------------
// Nido (tiempo real: `now` en epoch ms)
// ---------------------------------------------------------------------------

/** Compra un huevo con bellotas y lo pone a incubar en una casilla libre (de las disponibles). */
export function buyEgg(state: GameState, content: Content, creatureId: string, slot: number, now: number): boolean {
  const creature = creatureOf(content, creatureId);
  if (!creature || !nestUnlocked(state, content) || slot < 0 || slot >= nestSlotCount(state, content) || state.nest.slots[slot] || state.acorns < creature.eggCost) return false;
  if (creature.requiresDragonStage !== undefined && state.cave.dragonStage < creature.requiresDragonStage) return false;
  state.acorns -= creature.eggCost;
  state.nest.slots[slot] = { creature: creatureId, stage: 0, since: now };
  return true;
}

/** El huevo, cuando ya ha pasado su tiempo de incubación, eclosiona y sale la cría. */
export function hatchEgg(state: GameState, content: Content, slot: number, now: number): boolean {
  const s = state.nest.slots[slot];
  if (!s || s.stage !== 0 || hatchLeftMs(content, s, now) > 0) return false;
  s.stage = 1;
  addEntry(state, `Ha eclosionado un huevo: ${creatureOf(content, s.creature)?.stages[1]?.name.toLowerCase()}.`, gameClockMs(state));
  return true;
}

/** Alimenta con bellotas a una cría o a una joven para que evolucione. Al llegar a adulta queda anotada (logro y reliquia). */
export function feedCreature(state: GameState, content: Content, slot: number): boolean {
  const s = state.nest.slots[slot];
  const creature = s ? creatureOf(content, s.creature) : undefined;
  if (!s || !creature || s.stage < 1 || s.stage > 2) return false;
  const cost = creature.feedCosts[s.stage - 1]!;
  if (state.acorns < cost) return false;
  state.acorns -= cost;
  s.stage += 1;
  if (s.stage === 3) {
    state.nest.adults[creature.id] = true;
    addEntry(state, `${creature.stages[3]!.name}: la criatura ha crecido del todo.`, gameClockMs(state));
  }
  return true;
}

/** Ofrenda: da bellotas a una criatura adulta y activa su bono un rato (si ya estaba activo, se encadena detrás). */
export function boostCreature(state: GameState, content: Content, slot: number): boolean {
  const s = state.nest.slots[slot];
  const creature = s ? creatureOf(content, s.creature) : undefined;
  if (!s || !creature || s.stage !== 3 || state.acorns < creature.boost.cost) return false;
  state.acorns -= creature.boost.cost;
  state.nest.boosts[creature.id] = Math.max(state.nest.boosts[creature.id] ?? 0, state.time) + creature.boost.seconds;
  return true;
}

/** Retira una criatura adulta del nido para dejar la casilla libre (queda anotada para siempre). */
export function removeCreature(state: GameState, content: Content, slot: number): boolean {
  const s = state.nest.slots[slot];
  if (!s || s.stage !== 3) return false;
  state.nest.slots[slot] = null;
  return true;
}

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
export function upgradeCompanion(state: GameState, content: Content, id: string, now: number = gameClockMs(state)): boolean {
  const companion = content.companions.find((c) => c.id === id);
  if (!companion || !companionOwned(state, companion)) return false;
  const level = companionLevel(state, id);
  const next = companion.upgrades[level];
  if (!next || state.acorns < next.cost) return false;
  state.acorns -= next.cost;
  settleGarden(state, content, now);
  state.companionLevels[id] = level + 1;
  if (id === 'topo' && level + 1 >= content.nest.topoLevel && state.basketAcornsAt <= 0) state.basketAcornsAt = now; // el topo empieza a cavar ahora
  return true;
}

export const MAX_ACTIVE_COMPANIONS = 2;

/** Compañeros que se pueden llevar a la vez: 2 de base más los que dé Un amigo más. */
export function maxActiveCompanions(state: GameState, content: Content): number {
  return MAX_ACTIVE_COMPANIONS + Math.round(perkSumOf(state, content, 'companionSlots'));
}

/** Pone o quita un compañero que ya se tiene de la escena (si hay demasiados, sale el más antiguo). */
export function toggleCompanion(state: GameState, content: Content, id: string, now: number = gameClockMs(state)): boolean {
  const companion = content.companions.find((c) => c.id === id);
  if (!companion || !companionOwned(state, companion)) return false;
  settleGarden(state, content, now); // el pato cambia la velocidad del jardín: se anota lo crecido antes
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
  if (index < 0 || index >= state.revealed || toolOwned(state, toolId) <= 0) return false; // solo herramientas que ya tienes
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

function addEmbers(state: GameState, amount: Decimal): void {
  state.cave.embers = state.cave.embers.add(amount);
  state.cave.runEmbers = state.cave.runEmbers.add(amount);
}

function addSouls(state: GameState, souls: number): void {
  state.cave.souls += souls;
  state.cave.soulsTotal += souls;
}

/** Da la semilla de la flor de un monstruo (si aún no se tenía). Devuelve el id de la flor o null. */
function giveSeed(state: GameState, content: Content, monsterId: string): string | null {
  const flower = content.garden.flowers.find((f) => f.seed === monsterId);
  if (!flower || state.garden.seeds[flower.id] || state.garden.found[flower.id]) return null;
  state.garden.seeds[flower.id] = true;
  addEntry(state, `Un monstruo de la cueva ha soltado una semilla: ya puedes plantar ${flower.name.toLowerCase()} en el jardín.`, gameClockMs(state));
  return flower.id;
}

/**
 * La carrera avanza `meters` metros y el cerdito ha recogido `coins` brasas del suelo (lo manda la UI cada
 * poco; `rage` = con la furia activa). Devuelve las brasas ganadas.
 */
export function caveRun(state: GameState, content: Content, meters: number, coins: number, rage = false): Decimal {
  if (!caveOpen(state, content) || !(meters >= 0) || !(coins >= 0)) return D(0);
  const gained = coinEmbers(state, content, state.cave.meters, rage).mul(Math.floor(coins));
  addEmbers(state, gained);
  state.cave.meters += meters;
  state.cave.bestMeters = Math.max(state.cave.bestMeters, state.cave.meters);
  return gained;
}

/**
 * El cerdito ha chocado con un monstruo (cae al momento): brasas, almas y, a veces (`roll` < probabilidad),
 * la semilla de su flor. `roll` es un número al azar en [0,1) que pone la UI.
 */
export function caveDefeat(state: GameState, content: Content, monsterId: string, roll: number, rage = false): { embers: Decimal; souls: number; seed: string | null } {
  const monster = content.cave.monsters.find((m) => m.id === monsterId);
  if (!monster || !caveOpen(state, content)) return { embers: D(0), souls: 0, seed: null };
  const { embers, souls } = monsterStats(state, content, monster, state.cave.meters, rage);
  addEmbers(state, embers);
  addSouls(state, souls);
  state.cave.monsters += 1;
  const seed = roll < content.cave.seedChance ? giveSeed(state, content, monster.id) : null;
  return { embers, souls, seed };
}

/** Un cofre del camino: brasas (mucho), almas o la semilla de una flor de la cueva. `roll` en [0,1) lo pone la UI. */
export function caveChest(state: GameState, content: Content, roll: number): { kind: 'embers' | 'souls' | 'seed'; embers: Decimal; souls: number; seed: string | null } {
  const none = { kind: 'embers' as const, embers: D(0), souls: 0, seed: null };
  if (!caveOpen(state, content)) return none;
  if (roll < 0.15) {
    const options = monstersAt(content, state.cave.bestMeters).map((m) => m.id).filter((id) => content.garden.flowers.some((f) => f.seed === id && !state.garden.seeds[f.id] && !state.garden.found[f.id]));
    const pick = options[Math.floor((roll / 0.15) * options.length)];
    const seed = pick ? giveSeed(state, content, pick) : null;
    if (seed) return { kind: 'seed', embers: D(0), souls: 0, seed };
  }
  if (roll < 0.4) {
    const souls = Math.max(3, Math.round(5 * (1 + state.cave.bosses) * soulsMult(state, content)));
    addSouls(state, souls);
    return { kind: 'souls', embers: D(0), souls, seed: null };
  }
  const embers = coinEmbers(state, content, state.cave.meters).mul(40);
  addEmbers(state, embers);
  return { kind: 'embers', embers, souls: 0, seed: null };
}

/** Jefe derrotado: brasas y almas, el dragón crece (si es la primera vez que se llega a esa etapa) y el siguiente sale más adelante. */
export function caveBossWin(state: GameState, content: Content): Decimal {
  if (!caveOpen(state, content)) return D(0);
  const boss = bossStats(state, content);
  addEmbers(state, boss.embers);
  addSouls(state, boss.souls);
  state.cave.bosses += 1;
  state.cave.nextBossAt = Math.max(state.cave.meters, state.cave.nextBossAt) + content.cave.bossEvery;
  if (boss.stage > state.cave.dragonStage) {
    state.cave.dragonStage = boss.stage;
    const egg = content.nest.creatures.find((c) => c.requiresDragonStage !== undefined && c.requiresDragonStage === boss.stage);
    addEntry(state, `Has vencido al dragón en la cueva: ahora es ${content.cave.dragon[boss.stage]!.name.toLowerCase()} y te acompaña.${egg ? ` Te ha dejado un ${egg.stages[0]!.name.toLowerCase()} para el nido.` : ''}`, gameClockMs(state));
  }
  return boss.embers;
}

/** Se acabó el tiempo contra el jefe: se va y vuelve un poco más adelante. */
export function caveBossLeave(state: GameState, content: Content): void {
  state.cave.nextBossAt = state.cave.meters + content.cave.bossEvery / 2;
}

/** Compra un nivel de un objeto de la armería. */
export function buyArmory(state: GameState, content: Content, id: string): boolean {
  const item = content.cave.armory.find((x) => x.id === id);
  if (!item || !caveOpen(state, content)) return false;
  if (item.maxLevel !== null && armoryLevel(state, id) >= item.maxLevel) return false;
  const cost = armoryCost(state, content, item);
  if (state.cave.embers.lt(cost)) return false;
  state.cave.embers = state.cave.embers.sub(cost);
  state.cave.armory[id] = armoryLevel(state, id) + 1;
  return true;
}

/** Compra un nivel de una mejora de almas (permanente). */
export function buySoulUpgrade(state: GameState, content: Content, id: string): boolean {
  const up = content.cave.soulUpgrades.find((x) => x.id === id);
  if (!up || !caveOpen(state, content)) return false;
  if (up.maxLevel !== null && soulLevel(state, id) >= up.maxLevel) return false;
  const cost = soulUpgradeCost(state, up);
  if (state.cave.souls < cost) return false;
  state.cave.souls -= cost;
  state.cave.soulUpgrades[id] = soulLevel(state, id) + 1;
  return true;
}

/** Renacer: la carrera vuelve a empezar (brasas, armería, metros y jefes) a cambio de almas. Devuelve las almas ganadas. */
export function caveRebirth(state: GameState, content: Content): number {
  const souls = soulsPending(state, content);
  if (souls <= 0) return 0;
  addSouls(state, souls);
  state.cave.embers = D(0);
  state.cave.runEmbers = D(0);
  state.cave.armory = {};
  state.cave.meters = 0;
  state.cave.bosses = 0;
  state.cave.nextBossAt = content.cave.bossEvery;
  state.cave.embers = startEmbers(state, content);
  addEntry(state, `El cerdito renace en la cueva con ${souls} alma${souls === 1 ? '' : 's'} de dragón más.`, gameClockMs(state));
  return souls;
}

// ---------------------------------------------------------------------------
// Jardín (tiempo real: `now` en epoch ms; `roll` es un número al azar en [0,1) que pone la UI)
// ---------------------------------------------------------------------------

/** Planta una flor en una casilla vacía (es gratis). */
export function plantFlower(state: GameState, content: Content, cell: number, flowerId: string, now: number): boolean {
  const index = content.garden.flowers.findIndex((f) => f.id === flowerId);
  if (index < 0 || cell < 0 || cell >= state.garden.cells.length || state.garden.cells[cell] || !gardenUnlocked(state, content) || !flowerAvailable(state, content, index)) return false;
  state.garden.cells[cell] = { flower: flowerId, plantedAt: now, grown: 0, since: now, crossed: false };
  return true;
}

/** Recoge una flor crecida. Devuelve null si no está lista; si no, si ha salido brillante (se sabe desde que se planta) y si es nueva. */
export function harvestFlower(state: GameState, content: Content, cell: number, now: number): { shiny: boolean; isNew: boolean } | null {
  const planted = state.garden.cells[cell];
  const flower = planted ? content.garden.flowers.find((f) => f.id === planted.flower) : undefined;
  if (!planted || !flower || !cellMature(state, content, cell, now)) return null;
  const before = state.garden.found[flower.id];
  const shiny = cellShiny(state, content, cell);
  state.garden.found[flower.id] = { count: (before?.count ?? 0) + 1, shiny: before?.shiny === true || shiny, shinyCount: (before?.shinyCount ?? 0) + (shiny ? 1 : 0) };
  state.garden.cells[cell] = null;
  state.garden.harvests += 1;
  const seconds = flower.effect.seconds * (shiny ? 2 : 1) * durationFactor(state, content); // la brillante dura (o da) el doble
  if (flower.effect.kind === 'coins') gain(state, content, baseIncomePerSecond(state, content).mul(seconds));
  else if (flower.effect.kind === 'acorns') state.acorns += flower.effect.value * (shiny ? 2 : 1);
  else if (flower.effect.kind === 'embers') addEmbers(state, coinEmbers(state, content, state.cave.bestMeters).mul(flower.effect.value * (shiny ? 2 : 1)));
  else state.garden.buffs[flower.id] = Math.max(state.garden.buffs[flower.id] ?? 0, state.time) + seconds; // si ya hay una igual activa, la nueva empieza cuando acabe la anterior
  if (before === undefined) addEntry(state, `Has descubierto la flor ${flower.name}.`, gameClockMs(state));
  else if (shiny && !before.shiny) addEntry(state, `¡Ha salido una ${flower.name} brillante!`, gameClockMs(state));
  return { shiny, isNew: before === undefined };
}

/**
 * Cruce al madurar (a lo Cookie Clicker): la flor de `cell` acaba de madurar en `at`. Por cada receta en la que
 * entra, si la otra flor está madura en una casilla de alrededor, se tira el dado (probabilidad de la receta +
 * bonos); si sale, brota la flor nueva en una casilla vacía contigua a la que ha madurado. Si no hay cruce,
 * a veces brota una silvestre. Si no hay casilla vacía alrededor, no brota nada.
 */
function crossAt(state: GameState, content: Content, cell: number, at: number): void {
  const g = content.garden;
  const cells = state.garden.cells;
  const self = cells[cell];
  if (!self) return;
  const around = neighbors8(cell, g.cols, gardenRows(state, content));
  const empty = around.filter((n) => !cells[n]);
  if (empty.length === 0) return;
  const mature = around.filter((n) => cells[n] && cellMature(state, content, n, at)).map((n) => cells[n]!.flower);
  const seed = Math.floor(self.plantedAt / 1000);
  const spawn = (flower: string, salt: number) => {
    const target = empty[Math.floor(rand01(state.createdAt, seed + salt, cell * 131) * empty.length)]!;
    cells[target] = { flower, plantedAt: at, grown: 0, since: at, crossed: false };
  };
  const bonus = mutationChance(state, content);
  let k = 0;
  for (const f of g.flowers) {
    if (!f.recipe) continue;
    const [p, q] = f.recipe;
    const partner = p === self.flower ? q : q === self.flower ? p : null;
    if (partner === null || !mature.includes(partner)) continue;
    k += 1;
    if (rand01(state.createdAt, seed + k * 7919, cell * 97 + k) < (f.chance ?? 0) + bonus) {
      spawn(f.id, k);
      return;
    }
  }
  const wild = g.flowers.find((f) => f.wild === true);
  if (wild && rand01(state.createdAt, seed + 104729, cell * 53) < g.wildChance) spawn(wild.id, 999);
}

/**
 * Pone al día el jardín hasta `now`: cada flor que haya madurado y aún no haya tirado su dado de cruce lo tira,
 * en el orden en que maduraron (así funciona igual con el juego cerrado y las que brotan pueden madurar y cruzarse a su vez).
 */
export function gardenTick(state: GameState, content: Content, now: number): void {
  if (!gardenUnlocked(state, content)) return;
  const cells = state.garden.cells;
  for (let guard = 0; guard < 300; guard++) {
    let next = -1;
    let nextAt = Infinity;
    cells.forEach((c, i) => {
      if (!c || c.crossed) return;
      const at = cellMatureAt(state, content, i);
      if (at <= now && at < nextAt) {
        next = i;
        nextAt = at;
      }
    });
    if (next < 0) return;
    cells[next]!.crossed = true;
    crossAt(state, content, next, nextAt);
  }
}
