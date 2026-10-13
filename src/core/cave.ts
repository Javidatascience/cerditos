// Fórmulas de la Cueva del Dragón (el corredor): daño, velocidad, monstruos, jefes, brasas y almas.
// Solo lectura: la carrera la dibuja la UI (ui/views/caveRunner.ts) y las recompensas se aplican en
// actions.ts, siempre con estos números. Ver docs/06-mina.md.

import type { ArmoryItemDef, CaveMonsterDef, Content } from '../content/types.ts';
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

/** Multiplicador de todas las brasas: árbol, lagarto, ofrenda del fénix, dragón, almas y mochila. */
export function embersMult(state: GameState, content: Content): number {
  let lizard = 1;
  for (const a of activeAbilities(state, content)) if (a.kind === 'embersMult') lizard *= a.mult; // Lagarto de fuego
  return (
    (1 + perkSumOf(state, content, 'caveEmbers')) *
    lizard *
    nestBoost(state, content, 'embersMult') *
    dragonBonus(state, content).embers *
    (1 + state.cave.souls * content.cave.soulEmbers) *
    (1 + armorySum(state, content, 'embers'))
  );
}

/** Daño de un golpe del cerdito. */
export function caveDamage(state: GameState, content: Content): number {
  let mult = 1;
  for (const item of content.cave.armory) if (item.effect.kind === 'damage') mult *= item.effect.perLevel ** armoryLevel(state, item.id);
  return mult * (1 + perkSumOf(state, content, 'caveBlow'));
}

/** Metros por segundo. */
export function caveSpeed(state: GameState, content: Content): number {
  return content.cave.speed * (1 + armorySum(state, content, 'speed'));
}

/** Saltos extra en el aire, radio del imán (px) y si salta solo. */
export function caveAbilities(state: GameState, content: Content): { extraJumps: number; magnet: number; auto: boolean } {
  return { extraJumps: Math.round(armorySum(state, content, 'jumps')), magnet: armorySum(state, content, 'magnet'), auto: armorySum(state, content, 'auto') > 0 };
}

function tier(meters: number): number {
  return Math.floor(Math.max(0, meters) / 100);
}

/** Monstruos que pueden salir a esos metros. */
export function monstersAt(content: Content, meters: number): CaveMonsterDef[] {
  return content.cave.monsters.filter((m) => m.fromMeters <= meters);
}

/** Vida y brasas de un monstruo a esos metros. */
export function monsterStats(state: GameState, content: Content, monster: CaveMonsterDef, meters: number): { hp: number; embers: Decimal } {
  const t = tier(meters);
  return { hp: monster.hp * content.cave.hpGrowth ** t, embers: D(monster.embers).mul(Decimal.pow(content.cave.rewardGrowth, t)).mul(embersMult(state, content)) };
}

/** Brasas de cada brasa del suelo a esos metros. */
export function coinEmbers(state: GameState, content: Content, meters: number): Decimal {
  return D(content.cave.coinEmbers).mul(Decimal.pow(content.cave.rewardGrowth, tier(meters))).mul(embersMult(state, content));
}

/** El próximo jefe: vida, brasas que da y qué etapa del dragón es (para el dibujo). */
export function bossStats(state: GameState, content: Content): { hp: number; embers: Decimal; stage: number } {
  const c = content.cave;
  const hp = c.bossHp * c.bossHpGrowth ** state.cave.bosses;
  return { hp, embers: D(hp * c.bossReward).mul(embersMult(state, content)), stage: Math.min(c.dragon.length - 1, state.cave.bosses + 1) };
}

/** Almas que darías al renacer ahora. */
export function soulsPending(state: GameState, content: Content): number {
  return Math.floor(Math.sqrt(state.cave.runEmbers.div(content.cave.soulsDivisor).toNumber()));
}

/** Lo que la cueva multiplica la producción de la mina: dragón y almas. */
export function caveProdMult(state: GameState, content: Content): number {
  return dragonBonus(state, content).prod * (1 + state.cave.souls * content.cave.soulProd);
}
