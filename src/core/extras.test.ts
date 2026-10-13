import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { updateAchievements } from './achievements.ts';
import { basketAcornsReady } from './nest.ts';
import { cellShiny } from './garden.ts';
import { buySynergy, boostCreature, buyEgg, collectBasket, feedCreature, hatchEgg, removeCreature, buyAccessory, buyPerk, wearAccessory, gardenTick, harvestFlower, plantFlower, upgradeCompanion, VISITOR_ACORNS, VISITOR_GOLDEN, ascend, buyCompanion, caveRun, caveDefeat, caveChest, caveBossWin, caveBossLeave, buyArmory, buySoulUpgrade, caveRebirth, rabbitWaitSeconds, useRabbit, companionTick, buyGlobalUpgrade, buySkin, claimVisitor, equipSkin, MAX_ACTIVE_COMPANIONS, tap, toggleCompanion } from './actions.ts';
import { synergyMult, synergyUnlocked, tapGain, unitProduction, lifetimeForNextPluma, plumasEntitled, visitorModifiers, baseIncomePerSecond, globalMultiplier, incomePerSecond, momentumMaxMult, momentumMult, prodMultiplier, relicOwned } from './formulas.ts';
import { D } from './num.ts';
import { armoryCost, bossStats, caveDamage, caveSpeed, coinEmbers, embersMult, monsterStats } from './cave.ts';
import { growMs, mutationChance, shinyChance } from './garden.ts';
import { cosmeticViews, globalUpgradeViews, headerView, statsView, toolViews } from './selectors.ts';
import { createInitialState, type GameState } from './state.ts';
import { advance } from './tick.ts';

const G = CONTENT.game;
const PICO = CONTENT.tools[0]!;

function fresh(): GameState {
  const state = createInitialState(CONTENT, 0);
  state.tools[PICO.id] = 20;
  state.acorns = 0; // las pruebas cuentan bellotas desde cero
  return state;
}

describe('inercia', () => {
  it('cada pico sube la barra, que tiene tope; el multiplicador va de ×1 a ×5', () => {
    const state = fresh();
    expect(momentumMult(state, CONTENT)).toBe(1);
    for (let i = 0; i < 10; i++) tap(state, CONTENT);
    expect(state.momentum).toBeCloseTo(10 * G.momentumPerTap, 9);
    state.momentum = 1;
    expect(momentumMult(state, CONTENT)).toBe(G.momentumMax);
    expect(incomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(baseIncomePerSecond(state, CONTENT).toNumber() * G.momentumMax, 9);
    for (let i = 0; i < 100; i++) tap(state, CONTENT);
    expect(state.momentum).toBe(1);
  });

  it('baja linealmente con el tiempo y produce la media exacta mientras baja', () => {
    const state = fresh();
    state.momentum = 0.5;
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    advance(state, CONTENT, 5);
    expect(state.momentum).toBeCloseTo(0.5 - 5 * G.momentumDecay, 9);
    const average = 0.5 - (5 * G.momentumDecay) / 2;
    expect(state.coins.toNumber()).toBeCloseTo(base * 5 * (1 + (G.momentumMax - 1) * average), 9);
  });

  it('si se agota a mitad del avance, solo cuenta hasta que llega a 0 y el resto va a ×1', () => {
    const state = fresh();
    state.momentum = 0.1;
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    advance(state, CONTENT, 10);
    expect(state.momentum).toBe(0);
    const tZero = 0.1 / G.momentumDecay;
    expect(state.coins.toNumber()).toBeCloseTo(base * (tZero * (1 + (G.momentumMax - 1) * 0.05) + (10 - tZero)), 9);
  });

  it('un paso grande equivale a muchos pequeños, también con el impulso del visitante', () => {
    const a = fresh();
    const b = fresh();
    for (const s of [a, b]) {
      s.momentum = 0.7;
      claimVisitor(s, CONTENT, 'boost');
    }
    advance(a, CONTENT, 100);
    for (let i = 0; i < 1000; i++) advance(b, CONTENT, 0.1);
    expect(a.coins.toNumber()).toBeCloseTo(b.coins.toNumber(), 4);
    expect(a.momentum).toBeCloseTo(b.momentum, 9);
  });

  it('la reliquia Muelle mágico sube el tope y ascender reinicia la barra', () => {
    const state = fresh();
    state.achievements['grua-perforadora-25'] = { at: 0 };
    expect(momentumMaxMult(state, CONTENT)).toBe(G.momentumMax + 0.25);
    state.momentum = 0.8;
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.momentum).toBe(0);
  });
});

describe('mejoras globales', () => {
  it('se desbloquean al ganar una cantidad, se compran una vez y multiplican ×1,5 toda la producción', () => {
    const state = fresh();
    expect(globalUpgradeViews(state, CONTENT).available).toEqual([]);
    expect(globalUpgradeViews(state, CONTENT).nextUnlockAt).toBe(1e4);
    state.coins = D(1e9);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(false);
    state.lifetime = D(2e5);
    expect(globalUpgradeViews(state, CONTENT).available.map((u) => u.id)).toEqual(['comedero-grande', 'cuerda-de-saltar']);
    const base = prodMultiplier(state, CONTENT);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(true);
    expect(state.coins.toNumber()).toBeCloseTo(1e9 - 1e6, 3);
    expect(globalMultiplier(state, CONTENT)).toBe(1.5);
    expect(prodMultiplier(state, CONTENT) / base).toBeCloseTo(1.5, 9);
    expect(buyGlobalUpgrade(state, CONTENT, 'comedero-grande')).toBe(false);
  });

  it('se pierden al ascender', () => {
    const state = fresh();
    state.globalUpgrades['comedero-grande'] = true;
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.globalUpgrades).toEqual({});
  });
});

describe('bellotas, pieles, compañeros y reliquias', () => {
  it('el cerdito viajero da siempre 2 bellotas, sea cual sea la recompensa', () => {
    const state = fresh();
    claimVisitor(state, CONTENT, 'injection');
    claimVisitor(state, CONTENT, 'boost');
    expect(state.acorns).toBe(2 * VISITOR_ACORNS);
    expect(state.stats.visitors).toBe(2);
    expect(headerView(state, CONTENT).bellotas).toBe(4);
  });

  it('las pieles se compran con bellotas, se equipan y las de logro se tienen al conseguirlo', () => {
    const state = fresh();
    expect(state.activeSkin).toBe('rosa');
    expect(buySkin(state, CONTENT, 'azulado')).toBe(false);
    expect(equipSkin(state, CONTENT, 'azulado')).toBe(false);
    state.acorns = 7;
    expect(buySkin(state, CONTENT, 'azulado')).toBe(true);
    expect(state.acorns).toBe(2);
    expect(equipSkin(state, CONTENT, 'azulado')).toBe(true);
    expect(state.activeSkin).toBe('azulado');
    expect(buySkin(state, CONTENT, 'manchado')).toBe(false); // las demás pieles son de logro
    expect(buySkin(state, CONTENT, 'dorado')).toBe(false);
    state.achievements['monedas-1000000000'] = { at: 0 };
    expect(equipSkin(state, CONTENT, 'dorado')).toBe(true);
    expect(cosmeticViews(state, CONTENT).skins.find((s) => s.id === 'dorado')!.owned).toBe(true);
  });

  it('los compañeros se compran, se llevan (máximo 2) y el sobrante quita el más antiguo', () => {
    const state = fresh();
    state.acorns = 100;
    for (const id of ['topo', 'gato', 'perro']) expect(buyCompanion(state, CONTENT, id)).toBe(true);
    expect(toggleCompanion(state, CONTENT, 'conejo')).toBe(false); // sin comprar
    toggleCompanion(state, CONTENT, 'topo');
    toggleCompanion(state, CONTENT, 'gato');
    toggleCompanion(state, CONTENT, 'perro');
    expect(state.activeCompanions).toEqual(['gato', 'perro']);
    expect(state.activeCompanions.length).toBeLessThanOrEqual(MAX_ACTIVE_COMPANIONS);
    toggleCompanion(state, CONTENT, 'gato');
    expect(state.activeCompanions).toEqual(['perro']);
  });

  it('las reliquias se consiguen con su logro y dan su bono', () => {
    const state = fresh();
    const relic = CONTENT.relics.find((r) => r.id === 'pico-ancestral')!;
    expect(relicOwned(state, relic)).toBe(false);
    const before = prodMultiplier(state, CONTENT);
    state.maxOwned['pico-de-madera'] = 100;
    updateAchievements(state, CONTENT, 0);
    expect(relicOwned(state, relic)).toBe(true);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    expect(cosmeticViews(state, CONTENT).relics.find((r) => r.id === 'pico-ancestral')!.owned).toBe(true);
  });
});

describe('habilidades de los compañeros', () => {
  it('el topo da una bellota cada 40 picos, solo mientras se lleva', () => {
    const state = fresh();
    for (let i = 0; i < 40; i++) tap(state, CONTENT);
    expect(state.acorns).toBe(0);
    state.acorns = 10;
    state.activeCompanions = ['topo'];
    for (let i = 0; i < 39; i++) tap(state, CONTENT);
    expect(state.acorns).toBe(10);
    tap(state, CONTENT);
    expect(state.acorns).toBe(11);
    expect(state.companionProgress['topo']).toBe(0);
  });

  it('el gato trae monedas cada 120 s y lo anota en el diario', () => {
    const state = fresh();
    state.activeCompanions = ['gato'];
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    companionTick(state, CONTENT, 119);
    expect(state.coins.toNumber()).toBe(0);
    companionTick(state, CONTENT, 1);
    expect(state.coins.toNumber()).toBeCloseTo(base * 30, 6);
    expect(state.journal.at(-1)?.text).toContain('Gato');
  });

});

describe('perro, pájaro y conejo', () => {
  it('el perro hace rendir ×1,1 solo a la mejor herramienta', () => {
    const state = fresh();
    const before = baseIncomePerSecond(state, CONTENT).toNumber();
    state.activeCompanions = ['perro'];
    expect(baseIncomePerSecond(state, CONTENT).toNumber()).toBeCloseTo(before * 1.1, 9);
  });

  it('el pájaro acelera al visitante', () => {
    const state = fresh();
    expect(visitorModifiers(state, CONTENT).speed).toBe(1);
    state.activeCompanions = ['pajaro'];
    expect(visitorModifiers(state, CONTENT).speed).toBeGreaterThan(1.3);
  });

  it('el conejo da una herramienta gratis y luego espera 6 horas reales', () => {
    const state = fresh();
    const t0 = 1_000_000;
    expect(useRabbit(state, CONTENT, PICO.id, t0)).toBe(false); // sin llevarlo
    state.activeCompanions = ['conejo'];
    expect(useRabbit(state, CONTENT, CONTENT.tools[5]!.id, t0)).toBe(false); // no descubierta
    state.revealed = 3;
    expect(useRabbit(state, CONTENT, CONTENT.tools[1]!.id, t0)).toBe(false); // descubierta pero sin ninguna unidad: solo vale lo que ya tienes
    expect(useRabbit(state, CONTENT, PICO.id, t0)).toBe(true);
    expect(state.tools[PICO.id]).toBe(21);
    expect(state.coins.toNumber()).toBe(0);
    expect(rabbitWaitSeconds(state, CONTENT, t0 + 3600_000)).toBeCloseTo(5 * 3600, 6);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 3600_000)).toBe(false);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 6 * 3600_000)).toBe(true);
  });
});

describe('cueva del dragón (carrera)', () => {
  function cave(): GameState {
    const state = fresh();
    state.plumasTotal = D(10);
    return state;
  }

  it('está cerrada sin esmeraldas', () => {
    const state = fresh();
    expect(caveRun(state, CONTENT, 10, 5).toNumber()).toBe(0);
    expect(state.cave.meters).toBe(0);
  });

  it('correr suma metros y las brasas del suelo; el récord se guarda; la furia las multiplica', () => {
    const state = cave();
    const got = caveRun(state, CONTENT, 50, 3).toNumber();
    expect(got).toBeCloseTo(3 * CONTENT.cave.coinEmbers, 9);
    expect(state.cave.meters).toBe(50);
    expect(state.cave.bestMeters).toBe(50);
    expect(caveRun(state, CONTENT, 0, 1, true).toNumber()).toBeCloseTo(CONTENT.cave.coinEmbers * CONTENT.cave.rageMult, 9);
    caveRun(state, CONTENT, 100, 0);
    expect(coinEmbers(state, CONTENT, state.cave.meters).toNumber()).toBeCloseTo(CONTENT.cave.coinEmbers * CONTENT.cave.rewardGrowth, 9); // 150 m: un tramo más
  });

  it('los monstruos caen al chocar y dan brasas y almas; a veces sueltan la semilla de su flor', () => {
    const state = cave();
    const babosa = CONTENT.cave.monsters[0]!;
    const res = caveDefeat(state, CONTENT, babosa.id, 0.99);
    expect(res.embers.toNumber()).toBeCloseTo(babosa.embers, 9);
    expect(res.souls).toBe(babosa.souls);
    expect(res.seed).toBeNull();
    expect(state.cave.monsters).toBe(1);
    expect(state.cave.souls).toBe(babosa.souls);
    expect(plantFlower(state, CONTENT, 0, babosa.flower, 0)).toBe(false); // sin semilla
    expect(caveDefeat(state, CONTENT, babosa.id, 0).seed).toBe(babosa.flower);
    expect(state.garden.seeds[babosa.flower]).toBe(true);
    expect(plantFlower(state, CONTENT, 0, babosa.flower, 0)).toBe(true);
    const embersBefore = state.cave.embers.toNumber();
    harvestFlower(state, CONTENT, 0, 24 * 3600_000);
    expect(state.cave.embers.toNumber()).toBeGreaterThan(embersBefore); // la flor de la cueva da brasas
  });

  it('las almas compran mejoras permanentes y evolucionan monstruos (más brasas y almas)', () => {
    const state = cave();
    expect(buySoulUpgrade(state, CONTENT, 'evolucion-babosa')).toBe(false);
    state.cave.souls = 1000;
    const before = monsterStats(state, CONTENT, CONTENT.cave.monsters[0]!, 0);
    expect(buySoulUpgrade(state, CONTENT, 'evolucion-babosa')).toBe(true);
    expect(buySoulUpgrade(state, CONTENT, 'evolucion-babosa')).toBe(false); // un solo nivel
    const after = monsterStats(state, CONTENT, CONTENT.cave.monsters[0]!, 0);
    expect(after.evolved).toBe(true);
    expect(after.embers.toNumber() / before.embers.toNumber()).toBeCloseTo(CONTENT.cave.evolveEmbers, 9);
    expect(after.souls).toBe(before.souls * CONTENT.cave.evolveSouls);
    const mult = embersMult(state, CONTENT);
    buySoulUpgrade(state, CONTENT, 'almas-brasas');
    expect(embersMult(state, CONTENT) / mult).toBeCloseTo(1.25, 9);
  });

  it('los cofres dan brasas, almas o una semilla', () => {
    const state = cave();
    expect(caveChest(state, CONTENT, 0.9).kind).toBe('embers');
    expect(caveChest(state, CONTENT, 0.3).kind).toBe('souls');
    expect(caveChest(state, CONTENT, 0).kind).toBe('seed');
  });

  it('la armería sube el daño y la velocidad y tiene tope donde toca', () => {
    const state = cave();
    expect(buyArmory(state, CONTENT, 'espada')).toBe(false); // sin brasas
    state.cave.embers = D(1e9);
    expect(caveDamage(state, CONTENT)).toBe(1);
    expect(buyArmory(state, CONTENT, 'espada')).toBe(true);
    expect(caveDamage(state, CONTENT)).toBeCloseTo(1.5, 9);
    buyArmory(state, CONTENT, 'botas');
    expect(caveSpeed(state, CONTENT)).toBeCloseTo(CONTENT.cave.speed * 1.12, 9);
    expect(buyArmory(state, CONTENT, 'alas')).toBe(true);
    expect(buyArmory(state, CONTENT, 'alas')).toBe(true);
    expect(buyArmory(state, CONTENT, 'alas')).toBe(false); // dos niveles
  });

  it('vencer al jefe da brasas y almas, hace crecer al dragón (que sube la producción) y aleja al siguiente', () => {
    const state = cave();
    const before = prodMultiplier(state, CONTENT);
    const boss = bossStats(state, CONTENT);
    expect(caveBossWin(state, CONTENT).toNumber()).toBeCloseTo(boss.embers.toNumber(), 6);
    expect(state.cave.dragonStage).toBe(1);
    expect(state.cave.souls).toBe(boss.souls);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(CONTENT.cave.dragon[1]!.prodMult * (1 + boss.souls * CONTENT.cave.soulProd), 9);
    expect(state.cave.nextBossAt).toBe(CONTENT.cave.bossEvery * 2);
    expect(bossStats(state, CONTENT).hp).toBeCloseTo(boss.hp * CONTENT.cave.bossHpGrowth, 9);
    caveRun(state, CONTENT, 900, 0);
    caveBossLeave(state, CONTENT);
    expect(state.cave.nextBossAt).toBe(900 + CONTENT.cave.bossEvery / 2);
  });

  it('el dragón adulto deja un huevo de dragón para el nido', () => {
    const state = cave();
    state.plumasTotal = D(10);
    expect(buyEgg(state, CONTENT, 'dragon', 0, 0)).toBe(false);
    state.cave.dragonStage = 3;
    expect(buyEgg(state, CONTENT, 'dragon', 0, 0)).toBe(true);
  });

  it('renacer cambia la carrera por almas (que se pueden gastar sin perder el bono); ascender no toca la cueva', () => {
    const state = cave();
    expect(caveRebirth(state, CONTENT)).toBe(0); // sin brasas, sin almas
    caveRun(state, CONTENT, 1234, 0);
    state.cave.runEmbers = D(CONTENT.cave.soulsDivisor * 9);
    state.cave.embers = D(500);
    state.cave.armory['espada'] = 3;
    expect(caveRebirth(state, CONTENT)).toBe(3);
    expect(state.cave.souls).toBe(3);
    expect(state.cave.soulsTotal).toBe(3);
    expect(state.cave.embers.toNumber()).toBe(0);
    expect(state.cave.armory).toEqual({});
    expect(state.cave.meters).toBe(0);
    expect(state.cave.bestMeters).toBe(1234);
    const prod = prodMultiplier(state, CONTENT);
    buySoulUpgrade(state, CONTENT, 'almas-brasas'); // cuesta 10: no llega
    state.cave.souls = 10;
    expect(buySoulUpgrade(state, CONTENT, 'almas-brasas')).toBe(true);
    expect(prodMultiplier(state, CONTENT)).toBeCloseTo(prod, 9); // gastar almas no quita el bono
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.cave.soulsTotal).toBe(3);
  });
});

describe('mejoras de compañeros', () => {
  it('se mejoran con bellotas por niveles y cambian la habilidad', () => {
    const state = fresh();
    state.acorns = 100;
    expect(upgradeCompanion(state, CONTENT, 'perro')).toBe(false); // no lo tengo
    buyCompanion(state, CONTENT, 'perro');
    state.activeCompanions = ['perro'];
    const before = baseIncomePerSecond(state, CONTENT).toNumber();
    expect(upgradeCompanion(state, CONTENT, 'perro')).toBe(true);
    expect(baseIncomePerSecond(state, CONTENT).toNumber()).toBeCloseTo((before / 1.1) * 1.15, 9);
    upgradeCompanion(state, CONTENT, 'perro');
    upgradeCompanion(state, CONTENT, 'perro');
    expect(upgradeCompanion(state, CONTENT, 'perro')).toBe(false); // nivel máximo
    expect(state.companionLevels['perro']).toBe(3);
  });

  it('el topo mejorado da bellotas antes', () => {
    const state = fresh();
    state.acorns = 50;
    buyCompanion(state, CONTENT, 'topo');
    state.activeCompanions = ['topo'];
    upgradeCompanion(state, CONTENT, 'topo');
    const acorns = state.acorns;
    for (let i = 0; i < 30; i++) tap(state, CONTENT);
    expect(state.acorns).toBe(acorns + 1);
  });
});

describe('nido y bellotas de la cesta', () => {
  const HOUR = 3600_000;

  it('se abre con 5 esmeraldas, hay 1 nido y las ventajas dan hasta 3', () => {
    const state = fresh();
    state.acorns = 500;
    state.plumas = D(1e6);
    expect(buyEgg(state, CONTENT, 'fenix', 0, 0)).toBe(false); // cerrado
    state.plumasTotal = D(5);
    expect(buyEgg(state, CONTENT, 'fenix', 1, 0)).toBe(false); // solo hay un nido
    expect(buyEgg(state, CONTENT, 'fenix', 0, 0)).toBe(true);
    expect(buyEgg(state, CONTENT, 'tiburon', 0, 0)).toBe(false); // ocupado
    expect(buyPerk(state, CONTENT, 'nidos')).toBe(true);
    expect(buyEgg(state, CONTENT, 'tiburon', 1, 0)).toBe(true);
    expect(buyPerk(state, CONTENT, 'nidos')).toBe(true);
    expect(buyPerk(state, CONTENT, 'nidos')).toBe(false); // tope de 3 nidos
    expect(buyEgg(state, CONTENT, 'ornitorrinco', 2, 0)).toBe(true);
  });

  it('el huevo eclosiona con el tiempo, las crías evolucionan con bellotas y la adulta da logro y reliquia', () => {
    const state = fresh();
    state.plumasTotal = D(5);
    state.acorns = 100;
    buyEgg(state, CONTENT, 'fenix', 0, 1000);
    expect(state.acorns).toBe(90);
    expect(hatchEgg(state, CONTENT, 0, 1000 + HOUR - 1)).toBe(false);
    expect(feedCreature(state, CONTENT, 0)).toBe(false); // un huevo no come
    expect(hatchEgg(state, CONTENT, 0, 1000 + HOUR)).toBe(true);
    expect(state.nest.slots[0]?.stage).toBe(1);
    expect(feedCreature(state, CONTENT, 0)).toBe(true);
    expect(state.acorns).toBe(75);
    expect(removeCreature(state, CONTENT, 0)).toBe(false); // aún no es adulta
    expect(feedCreature(state, CONTENT, 0)).toBe(true);
    expect(state.nest.slots[0]?.stage).toBe(3);
    expect(state.nest.adults['fenix']).toBe(true);
    advance(state, CONTENT, 1);
    expect(state.achievements['fenix-adulto']).toBeDefined();
    const relic = CONTENT.relics.find((r) => r.id === 'pluma-de-fenix')!;
    expect(relicOwned(state, relic)).toBe(true);
    expect(removeCreature(state, CONTENT, 0)).toBe(true);
    expect(state.nest.slots[0]).toBeNull();
    expect(state.nest.adults['fenix']).toBe(true); // queda anotada
  });

  it('el topo al nivel 3 deja una bellota en la cesta cada 6 h (con tope) y la cesta las recoge', () => {
    const state = fresh();
    state.acorns = 500;
    expect(basketAcornsReady(state, CONTENT, 100 * HOUR)).toBe(0); // sin el nivel 3
    expect(buyCompanion(state, CONTENT, 'topo')).toBe(true);
    expect(upgradeCompanion(state, CONTENT, 'topo', 1)).toBe(true);
    expect(upgradeCompanion(state, CONTENT, 'topo', 1)).toBe(true);
    expect(basketAcornsReady(state, CONTENT, 100 * HOUR)).toBe(0);
    expect(upgradeCompanion(state, CONTENT, 'topo', 1)).toBe(true); // nivel 3: empieza a cavar en el instante 1 (0 = "sin empezar")
    expect(basketAcornsReady(state, CONTENT, 5 * HOUR)).toBe(0);
    expect(basketAcornsReady(state, CONTENT, 13 * HOUR)).toBe(2);
    expect(basketAcornsReady(state, CONTENT, 1000 * HOUR)).toBe(CONTENT.nest.basketAcornCap);
    const before = state.acorns;
    collectBasket(state, CONTENT, 13 * HOUR);
    expect(state.acorns).toBe(before + 2);
    expect(basketAcornsReady(state, CONTENT, 13 * HOUR)).toBe(0);
    expect(basketAcornsReady(state, CONTENT, 18 * HOUR)).toBe(0);
    expect(basketAcornsReady(state, CONTENT, 19 * HOUR)).toBe(1); // conserva lo que sobraba
  });

  it('la ofrenda a una criatura adulta da su bono un rato y se encadena si se repite', () => {
    const state = fresh();
    state.plumasTotal = D(5);
    state.acorns = 1000;
    buyEgg(state, CONTENT, 'ornitorrinco', 0, 0);
    hatchEgg(state, CONTENT, 0, 10 * HOUR);
    feedCreature(state, CONTENT, 0);
    expect(boostCreature(state, CONTENT, 0)).toBe(false); // aún no es adulta
    feedCreature(state, CONTENT, 0);
    advance(state, CONTENT, 1); // se anota el logro y llega la reliquia
    const base = prodMultiplier(state, CONTENT);
    expect(boostCreature(state, CONTENT, 0)).toBe(true);
    expect(prodMultiplier(state, CONTENT) / base).toBeCloseTo(1.5, 9);
    boostCreature(state, CONTENT, 0);
    expect(state.nest.boosts['ornitorrinco']).toBe(state.time + 2 * 2 * 3600);
    advance(state, CONTENT, 4 * 3600 + 1);
    expect(prodMultiplier(state, CONTENT) / base).toBeCloseTo(1, 9);
  });
});

describe('monedas que faltan para la siguiente esmeralda', () => {
  it('coincide con el momento en que te corresponde una esmeralda más', () => {
    const state = fresh();
    for (const lifetime of [0, 3e8, 5e9, 2e12]) {
      state.lifetime = D(lifetime);
      const entitled = plumasEntitled(state, CONTENT);
      const needed = lifetimeForNextPluma(state, CONTENT);
      expect(needed.toNumber()).toBeGreaterThan(lifetime);
      state.lifetime = needed.mul(0.9999);
      expect(plumasEntitled(state, CONTENT)).toBe(entitled);
      state.lifetime = needed.mul(1.0001);
      expect(plumasEntitled(state, CONTENT)).toBe(entitled + 1);
    }
  });
});

describe('recompensas de monedas del cerdito viajero', () => {
  it('incluyen la inercia y el impulso activo', () => {
    const plain = fresh();
    const loaded = fresh();
    loaded.momentum = 1;
    loaded.buff = { mult: 4, until: 1000 };
    claimVisitor(plain, CONTENT, 'injection');
    claimVisitor(loaded, CONTENT, 'injection');
    expect(loaded.coins.toNumber() / plain.coins.toNumber()).toBeCloseTo(CONTENT.game.momentumMax * 4, 9);
  });
});

describe('cerdito viajero dorado', () => {
  it('da ingresos grandes, un impulso mayor y el doble de bellotas', () => {
    const state = fresh();
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    claimVisitor(state, CONTENT, 'golden');
    expect(state.acorns).toBe(VISITOR_GOLDEN.acorns);
    expect(state.coins.toNumber()).toBeCloseTo(base * VISITOR_GOLDEN.injectionSeconds, 6);
    expect(state.buff?.mult).toBe(VISITOR_GOLDEN.mult);
  });
});

describe('jardín', () => {
  function garden(): GameState {
    const state = fresh();
    state.plumasTotal = D(5);
    return state;
  }

  it('el pato acelera el tiempo de las flores y quitarlo no las hace retroceder', () => {
    const state = garden();
    state.acorns = 100;
    buyCompanion(state, CONTENT, 'pato');
    plantFlower(state, CONTENT, 0, 'margarita', 0); // 60 s de base
    toggleCompanion(state, CONTENT, 'pato', 30_000); // a los 30 s lo llevo: va más deprisa (×1/0,85)
    expect(harvestFlower(state, CONTENT, 0, 55_000)).toBeNull();
    toggleCompanion(state, CONTENT, 'pato', 40_000); // a los 40 s lo quito: lo crecido se conserva
    expect(state.garden.cells[0]!.grown).toBeCloseTo(30_000 + 10_000 / 0.85, 3);
    expect(harvestFlower(state, CONTENT, 0, 58_000)).toBeNull();
    expect(harvestFlower(state, CONTENT, 0, 58_500)).not.toBeNull();
  });

  it('está cerrado hasta tener las plumas indicadas', () => {
    const state = fresh();
    expect(plantFlower(state, CONTENT, 0, 'margarita', 0)).toBe(false);
  });

  it('plantar es gratis, crece con el tiempo real y se recoge; las flores de cruce no se pueden plantar sin descubrirlas', () => {
    const state = garden();
    expect(plantFlower(state, CONTENT, 0, 'girasol', 0)).toBe(false);
    expect(plantFlower(state, CONTENT, 0, 'margarita', 1000)).toBe(true);
    expect(state.coins.toNumber()).toBe(0);
    expect(plantFlower(state, CONTENT, 0, 'margarita', 1000)).toBe(false);
    expect(harvestFlower(state, CONTENT, 0, 1000 + 59_000)).toBeNull();
    expect(harvestFlower(state, CONTENT, 0, 1000 + 60_000)).toMatchObject({ isNew: true });
    expect(state.garden.harvests).toBe(1);
    expect(state.garden.cells[0]).toBeNull();
  });

  it('dos flores iguales recogidas seguidas encadenan sus bonos: la segunda empieza cuando acaba la primera', () => {
    const state = garden();
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    plantFlower(state, CONTENT, 1, 'margarita', 0);
    const shinyBefore = (state.garden.cells[0] && cellShiny(state, CONTENT, 0) ? 2 : 1) + (cellShiny(state, CONTENT, 1) ? 2 : 1);
    harvestFlower(state, CONTENT, 0, 60_000);
    harvestFlower(state, CONTENT, 1, 60_000);
    expect(state.garden.buffs['margarita']).toBe(state.time + 30 * shinyBefore);
  });

  it('la flor da un bono temporal y la brillante dura el doble', () => {
    const state = garden();
    const before = prodMultiplier(state, CONTENT);
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    harvestFlower(state, CONTENT, 0, 60_000);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    advance(state, CONTENT, 29);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    advance(state, CONTENT, 2);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1, 9);
    let at = 0;
    while (true) {
      plantFlower(state, CONTENT, 0, 'margarita', at);
      if (cellShiny(state, CONTENT, 0)) break;
      state.garden.cells[0] = null;
      at += 1000;
    }
    expect(harvestFlower(state, CONTENT, 0, at + 60_000)?.shiny).toBe(true);
    expect(state.garden.found['margarita']?.shinyCount).toBe(1);
    advance(state, CONTENT, 50);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9); // dura 60 s
  });

  it('al madurar una margarita con otra madura al lado, a veces brota un girasol en una casilla vacía contigua (determinista)', () => {
    let found: { at: number; cells: GameState['garden']['cells'] } | null = null;
    for (let at = 0; at < 300_000 && !found; at += 1000) {
      const state = garden();
      plantFlower(state, CONTENT, 6, 'margarita', at);
      plantFlower(state, CONTENT, 7, 'margarita', at);
      gardenTick(state, CONTENT, at + 60_000);
      if (state.garden.cells.some((c) => c?.flower === 'girasol')) found = { at, cells: state.garden.cells };
    }
    expect(found).not.toBeNull();
    const index = found!.cells.findIndex((c) => c?.flower === 'girasol');
    expect([0, 1, 2, 3, 5, 8, 10, 11, 12, 13]).toContain(index); // alrededor de la 6 o de la 7
    expect(found!.cells[index]!.crossed).toBe(false); // el girasol aún tiene que madurar
    const again = garden();
    plantFlower(again, CONTENT, 6, 'margarita', found!.at);
    plantFlower(again, CONTENT, 7, 'margarita', found!.at);
    gardenTick(again, CONTENT, found!.at + 60_000);
    expect(again.garden.cells).toEqual(found!.cells);
  });

  it('cada flor tira el dado del cruce una sola vez, al madurar', () => {
    const state = garden();
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    gardenTick(state, CONTENT, 30_000);
    expect(state.garden.cells[0]!.crossed).toBe(false);
    gardenTick(state, CONTENT, 60_000);
    expect(state.garden.cells[0]!.crossed).toBe(true);
    const snapshot = JSON.stringify(state.garden.cells);
    gardenTick(state, CONTENT, 10 * 60_000);
    expect(JSON.stringify(state.garden.cells.map((c, i) => (i === 0 ? c : null)))).toBe(JSON.stringify(JSON.parse(snapshot).map((c: unknown, i: number) => (i === 0 ? c : null))));
  });

  it('el trébol da bellotas al recogerlo y el hierbajo no se puede plantar hasta encontrarlo', () => {
    const state = garden();
    expect(plantFlower(state, CONTENT, 0, 'hierbajo', 0)).toBe(false);
    state.garden.found['hierbajo'] = { count: 1, shiny: false, shinyCount: 0 };
    expect(plantFlower(state, CONTENT, 0, 'hierbajo', 0)).toBe(true);
    state.garden.found['trebol'] = { count: 1, shiny: false, shinyCount: 0 };
    plantFlower(state, CONTENT, 1, 'trebol', 0);
    const before = state.acorns;
    const res = harvestFlower(state, CONTENT, 1, 3 * 60_000);
    expect(state.acorns - before).toBe(res?.shiny ? 2 : 1);
  });

  it('el hibisco da ingresos de golpe, no un bono', () => {
    const state = garden();
    state.garden.found['rosa'] = { count: 1, shiny: false, shinyCount: 0 };
    state.garden.found['lavanda'] = { count: 1, shiny: false, shinyCount: 0 };
    state.garden.found['hibisco'] = { count: 1, shiny: false, shinyCount: 0 };
    plantFlower(state, CONTENT, 0, 'hibisco', 0);
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    const coins = state.coins.toNumber();
    harvestFlower(state, CONTENT, 0, 2 * 3600_000);
    expect(state.coins.toNumber() - coins).toBeCloseTo(base * 300, 4);
  });
});

describe('árbol de ventajas', () => {
  it('cada nivel de Abono abre una rama y todas las ventajas tienen un tope de 5 niveles', () => {
    const state = fresh();
    state.plumas = D(1e6);
    for (const perk of CONTENT.perks) expect(perk.maxLevel).toBeLessThanOrEqual(5);
    expect(buyPerk(state, CONTENT, 'manos')).toBe(false); // pide Abono nivel 2
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(false); // pide Abono nivel 1
    expect(buyPerk(state, CONTENT, 'abono')).toBe(true);
    expect(buyPerk(state, CONTENT, 'comienzo')).toBe(true);
    expect(buyPerk(state, CONTENT, 'manos')).toBe(false);
    buyPerk(state, CONTENT, 'abono');
    expect(buyPerk(state, CONTENT, 'manos')).toBe(true);
    for (let i = 0; i < 10; i++) buyPerk(state, CONTENT, 'abono');
    expect(state.perks['abono']).toBe(5);
  });

  it('Un amigo más permite llevar 3 compañeros a la vez (y pide Abono al nivel 5)', () => {
    const state = fresh();
    state.plumas = D(1e6);
    state.acorns = 100;
    for (const id of ['topo', 'gato', 'perro']) buyCompanion(state, CONTENT, id);
    for (const id of ['topo', 'gato', 'perro']) toggleCompanion(state, CONTENT, id);
    expect(state.activeCompanions).toEqual(['gato', 'perro']);
    expect(buyPerk(state, CONTENT, 'compania')).toBe(false);
    for (let i = 0; i < 5; i++) buyPerk(state, CONTENT, 'abono');
    expect(buyPerk(state, CONTENT, 'compania')).toBe(true);
    toggleCompanion(state, CONTENT, 'topo');
    expect(state.activeCompanions).toEqual(['gato', 'perro', 'topo']);
  });

  it('las ramas del jardín y la cueva piden esmeraldas en total, y sus efectos se aplican', () => {
    const state = fresh();
    state.plumas = D(1e6);
    expect(buyPerk(state, CONTENT, 'parcelas')).toBe(false); // pide 5 esmeraldas en total
    state.plumasTotal = D(10);
    expect(buyPerk(state, CONTENT, 'parcelas')).toBe(true);
    expect(state.garden.cells.length).toBe(CONTENT.garden.cols * (CONTENT.garden.rows + 1));
    expect(buyPerk(state, CONTENT, 'polen')).toBe(false); // antes Tierra buena
    buyPerk(state, CONTENT, 'abonado');
    buyPerk(state, CONTENT, 'polen');
    expect(mutationChance(state, CONTENT)).toBeCloseTo(0.05, 9);
    state.garden.found['margarita'] = { count: 1, shiny: false, shinyCount: 0 };
    const flower = CONTENT.garden.flowers[0]!;
    expect(growMs(state, CONTENT, flower)).toBeCloseTo(flower.growSeconds * 1000 * 0.9, 6);
    const multBefore = embersMult(state, CONTENT);
    buyPerk(state, CONTENT, 'brasas');
    expect(embersMult(state, CONTENT) / multBefore).toBeCloseTo(1.25, 9);
    buyPerk(state, CONTENT, 'soplido');
    expect(caveDamage(state, CONTENT)).toBeCloseTo(1.5, 9);
    const espada = CONTENT.cave.armory.find((x) => x.id === 'espada')!;
    const cost = armoryCost(state, CONTENT, espada).toNumber();
    buyPerk(state, CONTENT, 'hornos-baratos');
    expect(armoryCost(state, CONTENT, espada).toNumber()).toBe(Math.ceil(espada.baseCost * 0.92));
    expect(cost).toBe(espada.baseCost);
  });
});

describe('pato, mariposa y lagarto', () => {
  it('el pato acelera las flores, la mariposa sube cruces y brillantes y el lagarto multiplica las brasas', () => {
    const state = fresh();
    state.plumasTotal = D(10);
    const flower = CONTENT.garden.flowers[0]!;
    const growBase = growMs(state, CONTENT, flower);
    const mutBase = mutationChance(state, CONTENT);
    const shinyBase = shinyChance(state, CONTENT);
    const embersBase = embersMult(state, CONTENT);
    state.activeCompanions = ['pato', 'mariposa'];
    expect(growMs(state, CONTENT, flower)).toBeCloseTo(growBase * 0.85, 6);
    expect(mutationChance(state, CONTENT)).toBeCloseTo(mutBase + 0.05, 9);
    expect(shinyChance(state, CONTENT)).toBeCloseTo(shinyBase + 0.02, 9);
    state.activeCompanions = ['lagarto'];
    expect(embersMult(state, CONTENT)).toBeCloseTo(embersBase * 1.25, 9);
    state.acorns = 100;
    buyCompanion(state, CONTENT, 'lagarto');
    upgradeCompanion(state, CONTENT, 'lagarto');
    expect(embersMult(state, CONTENT)).toBeCloseTo(embersBase * 1.4, 9);
  });
});

describe('guardarropa', () => {
  it('las prendas se compran con bellotas, se llevan una por hueco y se quitan; las de logro se tienen al conseguirlo', () => {
    const state = fresh();
    state.acorns = 20;
    expect(wearAccessory(state, CONTENT, 'head', 'hechicero')).toBe(false); // sin comprar
    expect(buyAccessory(state, CONTENT, 'hechicero')).toBe(true);
    expect(state.acorns).toBe(14);
    expect(buyAccessory(state, CONTENT, 'hechicero')).toBe(false); // ya la tengo
    expect(wearAccessory(state, CONTENT, 'body', 'hechicero')).toBe(false); // hueco equivocado
    expect(wearAccessory(state, CONTENT, 'head', 'hechicero')).toBe(true);
    expect(state.wardrobe.worn.head).toBe('hechicero');
    expect(buyAccessory(state, CONTENT, 'corona')).toBe(false); // solo por logro
    state.achievements['ascender-5'] = { at: 0 };
    expect(wearAccessory(state, CONTENT, 'head', 'corona')).toBe(true);
    expect(state.wardrobe.worn.head).toBe('corona');
    expect(wearAccessory(state, CONTENT, 'head', null)).toBe(true);
    expect(state.wardrobe.worn.head).toBeNull();
  });
});

describe('estadísticas y herramienta siguiente', () => {
  it('recogen lo jugado, incluido el mejor ingreso', () => {
    const state = fresh();
    state.momentum = 1;
    advance(state, CONTENT, 1);
    const stats = statsView(state, CONTENT);
    expect(stats.toolsOwned).toBe(20);
    expect(stats.bestIncome.toNumber()).toBeGreaterThan(0);
    expect(stats.playSeconds).toBe(1);
    expect(stats.achievements.total).toBe(CONTENT.achievements.length);
  });

  it('la siguiente herramienta por desbloquear se ve con su coste y lo que falta', () => {
    const state = createInitialState(CONTENT, 0);
    state.tools[PICO.id] = 1;
    state.coins = D(40);
    const teaser = toolViews(state, CONTENT).find((t) => t.reveal === 'teaser')!;
    expect(teaser.name).toBe('Cubo y pala');
    expect(teaser.nextCost.toNumber()).toBeGreaterThanOrEqual(100);
    expect(teaser.missing.toNumber()).toBeCloseTo(teaser.nextCost.toNumber() - 40, 9);
  });

  it('las sinergias se ven al tener las unidades de las dos herramientas, suben la producción de ambas y se pierden al ascender', () => {
    const state = fresh();
    const syn = CONTENT.synergies[0]!;
    expect(synergyUnlocked(state, syn)).toBe(false);
    state.tools[syn.a] = syn.need;
    state.tools[syn.b] = syn.need;
    expect(synergyUnlocked(state, syn)).toBe(true);
    expect(buySynergy(state, CONTENT, syn.id)).toBe(false); // sin monedas
    state.coins = D(1e30);
    const unitA = unitProduction(state, CONTENT, CONTENT.tools.find((t) => t.id === syn.a)!).toNumber();
    expect(buySynergy(state, CONTENT, syn.id)).toBe(true);
    expect(buySynergy(state, CONTENT, syn.id)).toBe(false); // ya comprada
    const after = unitProduction(state, CONTENT, CONTENT.tools.find((t) => t.id === syn.a)!).toNumber();
    expect(after / unitA).toBeCloseTo(1 + syn.aPerB * syn.need, 9);
    expect(synergyMult(state, CONTENT, syn.b)).toBeCloseTo(1 + syn.bPerA * syn.need, 9);
  });

  it('las mejoras del pico también suben lo que da cada toque cuando aún no hay ingresos', () => {
    const state = fresh();
    state.tools = {};
    const base = tapGain(state, CONTENT).toNumber();
    state.upgrades[PICO.id] = 2;
    expect(tapGain(state, CONTENT).toNumber()).toBeCloseTo(base * 4, 9);
  });
});

describe('criaturas adultas en su nido', () => {
  function adult(id: string): GameState {
    const state = fresh();
    state.plumasTotal = D(10);
    state.nest.slots[0] = { creature: id, stage: 3, since: 0 };
    return state;
  }

  it('el fénix da brasas, el tiburón sube la producción y el ornitorrinco trae bellotas', () => {
    const fenix = adult('fenix');
    advance(fenix, CONTENT, 100);
    expect(fenix.cave.embers.toNumber()).toBeCloseTo(0.5 * 100 * CONTENT.cave.coinEmbers, 6);

    const plain = fresh();
    plain.plumasTotal = D(10);
    const tiburon = adult('tiburon');
    expect(prodMultiplier(tiburon, CONTENT) / prodMultiplier(plain, CONTENT)).toBeCloseTo(1.15, 9);

    const orni = adult('ornitorrinco');
    const acorns = orni.acorns;
    advance(orni, CONTENT, 4 * 3600 + 10);
    expect(orni.acorns - acorns).toBe(1);
    // solo cuentan las adultas en el nido: un huevo no da nada
    const egg = fresh();
    egg.nest.slots[0] = { creature: 'fenix', stage: 0, since: 0 };
    advance(egg, CONTENT, 100);
    expect(egg.cave.embers.toNumber()).toBe(0);
  });
});
