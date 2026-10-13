// Fórmulas de la Cueva del Dragón (el corredor): brasas, almas, monstruos (y sus evoluciones), jefes,
// cofres, furia y renacer. Solo lectura: la carrera la dibuja la UI (ui/views/caveRunner.ts) y las
// recompensas se aplican en actions.ts, siempre con estos números. Ver docs/06-mina.md.

import type { ArmoryItemDef, CaveMonsterDef, Content, SoulUpgradeDef } from '../content/types.ts';
import { nestBoost } from './nest.ts';
import { D, Decimal } from './num.ts';
import { activeAbilities, perkProductOf, perkSumOf } from './perkEffects.ts';
import type { GameState } from './state.ts';

/** Bonos acumulados de las etapas del dragón alcanzadas (la del huevo no da nada). */
export function dragonBonus(state: GameState, content: Content): { prod: number; embers: number } {
  let prod = 1;
  let embers = 1;
  for (let i = 1; i <= state.cave.dragonStage; i++) {
    const stage = content.cave.dragon[i];
    if (!stage) break;
    prod *= stage.prodMult;
    embers *= stage.embersMult;
  }
  return { prod, embers };
}

export function armoryLevel(state: GameState, id: string): number {
  return state.cave.armory[id] ?? 0;
}

/** Coste del siguiente nivel de un objeto de la armería (con *Herrero amigo* del árbol). */
export function armoryCost(state: GameState, content: Content, item: ArmoryItemDef): Decimal {
  return D(item.baseCost).mul(Decimal.pow(item.costGrowth, armoryLevel(state, item.id))).mul(perkProductOf(state, content, 'caveCost')).ceil();
}

function armorySum(state: GameState, content: Content, kind: ArmoryItemDef['effect']['kind']): number {
  let total = 0;
  for (const item of content.cave.armory) if (item.effect.kind === kind) total += item.effect.perLevel * armoryLevel(state, item.id);
  return total;
}

export function soulLevel(state: GameState, id: string): number {
  return state.cave.soulUpgrades[id] ?? 0;
}

/** Almas que cuesta el siguiente nivel de una mejora de almas. */
export function soulUpgradeCost(state: GameState, upgrade: SoulUpgradeDef): number {
  return Math.ceil(upgrade.baseCost * upgrade.costGrowth ** soulLevel(state, upgrade.id));
}

function soulSum(state: GameState, content: Content, kind: 'embers' | 'souls' | 'rageSeconds' | 'bossSeconds' | 'chests' | 'startEmbers'): number {
  let total = 0;
  for (const u of content.cave.soulUpgrades) if (u.effect.kind === kind) total += u.effect.perLevel * soulLevel(state, u.id);
  return total;
}

/** ¿Está evolucionado este monstruo? */
export function monsterEvolved(state: GameState, content: Content, monsterId: string): boolean {
  return content.cave.soulUpgrades.some((u) => u.effect.kind === 'evolve' && u.effect.monster === monsterId && soulLevel(state, u.id) > 0);
}

/** Multiplicador de todas las brasas: árbol y reliquias, lagarto, ofrenda, dragón, almas, mochila y mejoras de almas. */
export function embersMult(state: GameState, content: Content): number {
  let lizard = 1;
  for (const a of activeAbilities(state, content)) if (a.kind === 'embersMult') lizard *= a.mult; // Lagarto de fuego
  return (
    (1 + perkSumOf(state, content, 'caveEmbers')) *
    lizard *
    nestBoost(state, content, 'embersMult') *
    dragonBonus(state, content).embers *
    (1 + state.cave.soulsTotal * content.cave.soulEmbers) *
    (1 + armorySum(state, content, 'embers')) *
    (1 + soulSum(state, content, 'embers'))
  );
}

/** Multiplicador de las almas (Coleccionista de almas). */
export function soulsMult(state: GameState, content: Content): number {
  return 1 + soulSum(state, content, 'souls');
}

/** Daño de un golpe del cerdito (contra el jefe). */
export function caveDamage(state: GameState, content: Content): number {
  let mult = 1;
  for (const item of content.cave.armory) if (item.effect.kind === 'damage') mult *= item.effect.perLevel ** armoryLevel(state, item.id);
  return mult * (1 + perkSumOf(state, content, 'caveBlow'));
}

/** Metros por segundo. */
export function caveSpeed(state: GameState, content: Content): number {
  return content.cave.speed * (1 + armorySum(state, content, 'speed'));
}

/** Lo que necesita la carrera: saltos extra, imán, furia, cofres y tiempo del jefe. */
export function caveAbilities(state: GameState, content: Content): { extraJumps: number; magnet: number; rageSeconds: number; chestEvery: number; bossSeconds: number } {
  return {
    extraJumps: Math.round(armorySum(state, content, 'jumps')),
    magnet: armorySum(state, content, 'magnet'),
    rageSeconds: content.cave.rageSeconds + soulSum(state, content, 'rageSeconds'),
    chestEvery: content.cave.chestEvery / (1 + soulSum(state, content, 'chests')),
    bossSeconds: content.cave.bossSeconds + soulSum(state, content, 'bossSeconds'),
  };
}

function tier(meters: number): number {
  return Math.floor(Math.max(0, meters) / 100);
}

/** Monstruos que pueden salir a esos metros. */
export function monstersAt(content: Content, meters: number): CaveMonsterDef[] {
  return content.cave.monsters.filter((m) => m.fromMeters <= meters);
}

/** Brasas y almas de un monstruo a esos metros (con evolución; `rage` = con la furia activa). */
export function monsterStats(state: GameState, content: Content, monster: CaveMonsterDef, meters: number, rage = false): { embers: Decimal; souls: number; evolved: boolean } {
  const c = content.cave;
  const evolved = monsterEvolved(state, content, monster.id);
  const rageMult = rage ? c.rageMult : 1;
  return {
    embers: D(monster.embers).mul(Decimal.pow(c.rewardGrowth, tier(meters))).mul(embersMult(state, content)).mul((evolved ? c.evolveEmbers : 1) * rageMult),
    souls: Math.max(1, Math.round(monster.souls * soulsMult(state, content) * (evolved ? c.evolveSouls : 1) * rageMult)),
    evolved,
  };
}

/** Brasas de cada brasa del suelo a esos metros. */
export function coinEmbers(state: GameState, content: Content, meters: number, rage = false): Decimal {
  return D(content.cave.coinEmbers).mul(Decimal.pow(content.cave.rewardGrowth, tier(meters))).mul(embersMult(state, content)).mul(rage ? content.cave.rageMult : 1);
}

/** El próximo jefe: vida, brasas y almas que da y qué etapa del dragón es (para el dibujo). */
export function bossStats(state: GameState, content: Content): { hp: number; embers: Decimal; souls: number; stage: number } {
  const c = content.cave;
  const hp = c.bossHp * c.bossHpGrowth ** state.cave.bosses;
  return {
    hp,
    embers: D(hp * c.bossReward).mul(embersMult(state, content)),
    souls: Math.round(c.bossSouls * (state.cave.bosses + 1) * soulsMult(state, content)),
    stage: Math.min(c.dragon.length - 1, state.cave.bosses + 1),
  };
}

/** Almas que darías al renacer ahora. */
export function soulsPending(state: GameState, content: Content): number {
  return Math.floor(Math.sqrt(state.cave.runEmbers.div(content.cave.soulsDivisor).toNumber()) * soulsMult(state, content));
}

/** Brasas con las que se empieza al renacer (Bolsillo de brasas). */
export function startEmbers(state: GameState, content: Content): Decimal {
  const mult = soulSum(state, content, 'startEmbers');
  return mult > 0 ? coinEmbers(state, content, 0).mul(25 * mult) : D(0);
}

/** Lo que la cueva multiplica la producción de la mina: dragón y almas conseguidas. */
export function caveProdMult(state: GameState, content: Content): number {
  return dragonBonus(state, content).prod * (1 + state.cave.soulsTotal * content.cave.soulProd);
}
