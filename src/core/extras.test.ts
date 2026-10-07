import { describe, expect, it } from 'vitest';
import { CONTENT } from '../content/index.ts';
import { updateAchievements } from './achievements.ts';
import { buyPerk, gardenTick, harvestFlower, plantFlower, upgradeCompanion, VISITOR_ACORNS, VISITOR_GOLDEN, ascend, buyCaveNode, buyCompanion, buyFurnace, caveBlow, rabbitWaitSeconds, useRabbit, companionTick, buyGlobalUpgrade, buySkin, claimVisitor, equipSkin, MAX_ACTIVE_COMPANIONS, tap, toggleCompanion } from './actions.ts';
import { visitorModifiers, baseIncomePerSecond, globalMultiplier, incomePerSecond, momentumMaxMult, momentumMult, prodMultiplier, relicOwned } from './formulas.ts';
import { D } from './num.ts';
import { caveCostFactor, embersPerSecond } from './cave.ts';
import { growMs, mutationChance } from './garden.ts';
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
    expect(buySkin(state, CONTENT, 'manchado')).toBe(false);
    expect(equipSkin(state, CONTENT, 'manchado')).toBe(false);
    state.acorns = 4;
    expect(buySkin(state, CONTENT, 'manchado')).toBe(true);
    expect(state.acorns).toBe(1);
    expect(equipSkin(state, CONTENT, 'manchado')).toBe(true);
    expect(state.activeSkin).toBe('manchado');
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
    expect(useRabbit(state, CONTENT, PICO.id, t0)).toBe(true);
    expect(state.tools[PICO.id]).toBe(21);
    expect(state.coins.toNumber()).toBe(0);
    expect(rabbitWaitSeconds(state, CONTENT, t0 + 3600_000)).toBeCloseTo(5 * 3600, 6);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 3600_000)).toBe(false);
    expect(useRabbit(state, CONTENT, PICO.id, t0 + 6 * 3600_000)).toBe(true);
  });
});

describe('cueva del dragón', () => {
  function withDragon(): GameState {
    const state = fresh();
    state.plumasTotal = D(10);
    return state;
  }

  it('está cerrada sin plumas', () => {
    const state = fresh();
    expect(caveBlow(state, CONTENT).toNumber()).toBe(0);
    state.cave.embers = D(1e6);
    expect(buyFurnace(state, CONTENT, 'brasero')).toBe(false);
  });

  it('soplar da brasas con enfriamiento, los hornos producen y el tiempo las acumula', () => {
    const state = withDragon();
    expect(caveBlow(state, CONTENT).toNumber()).toBe(1);
    expect(caveBlow(state, CONTENT).toNumber()).toBe(0);
    state.cave.embers = D(100);
    expect(buyFurnace(state, CONTENT, 'brasero')).toBe(true);
    expect(state.cave.embers.toNumber()).toBe(85);
    advance(state, CONTENT, 10);
    expect(state.cave.embers.toNumber()).toBeCloseTo(85 + 2, 6);
  });

  it('las ventajas piden la anterior y suben la producción del juego principal', () => {
    const state = withDragon();
    state.cave.embers = D(1e6);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-plata')).toBe(false);
    const before = prodMultiplier(state, CONTENT);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-bronce')).toBe(true);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    expect(buyCaveNode(state, CONTENT, 'escamas-de-bronce')).toBe(false);
    buyCaveNode(state, CONTENT, 'cesta-honda');
    buyCaveNode(state, CONTENT, 'ojo-de-dragon');
    expect(visitorModifiers(state, CONTENT).stayBonus).toBe(5);
  });

  it('el aliento cálido sube el tope de la inercia y ascender no borra la cueva', () => {
    const state = withDragon();
    state.cave.embers = D(1e6);
    const before = momentumMaxMult(state, CONTENT);
    buyCaveNode(state, CONTENT, 'fuego-interior');
    buyCaveNode(state, CONTENT, 'aliento-frecuente');
    expect(momentumMaxMult(state, CONTENT)).toBeCloseTo(before + 0.1, 9);
    state.lifetime = D(1e9);
    state.maxOwned[CONTENT.tools[G.ascendTool]!.id] = 1;
    ascend(state, CONTENT, 0);
    expect(state.cave.nodes['fuego-interior']).toBe(true);
    expect(state.cave.embers.toNumber()).toBeGreaterThan(0);
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
    expect(harvestFlower(state, CONTENT, 0, 1000 + 59_000, 0.5)).toBeNull();
    expect(harvestFlower(state, CONTENT, 0, 1000 + 60_000, 0.5)).toEqual({ shiny: false, isNew: true });
    expect(state.garden.harvests).toBe(1);
    expect(state.garden.cells[0]).toBeNull();
  });

  it('la flor da un bono temporal y la brillante dura el doble', () => {
    const state = garden();
    const before = prodMultiplier(state, CONTENT);
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    harvestFlower(state, CONTENT, 0, 60_000, 0.5);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    advance(state, CONTENT, 29);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9);
    advance(state, CONTENT, 2);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1, 9);
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    expect(harvestFlower(state, CONTENT, 0, 60_000, 0.05)?.shiny).toBe(true);
    advance(state, CONTENT, 50);
    expect(prodMultiplier(state, CONTENT) / before).toBeCloseTo(1.1, 9); // dura 60 s
  });

  it('dos margaritas maduras vecinas pueden cruzarse en una casilla vacía y dar un girasol', () => {
    const state = garden();
    plantFlower(state, CONTENT, 0, 'margarita', 0);
    plantFlower(state, CONTENT, 2, 'margarita', 0);
    // la casilla 1 está entre las dos: se comprueban cruces durante mucho tiempo
    gardenTick(state, CONTENT, 10 * 60_000);
    expect(state.garden.cells[1]?.flower).toBe('girasol');
    // determinista: el mismo estado da el mismo resultado
    const other = garden();
    plantFlower(other, CONTENT, 0, 'margarita', 0);
    plantFlower(other, CONTENT, 2, 'margarita', 0);
    gardenTick(other, CONTENT, 10 * 60_000);
    expect(other.garden.cells).toEqual(state.garden.cells);
  });

  it('el hibisco da ingresos de golpe, no un bono', () => {
    const state = garden();
    state.garden.found['rosa'] = { count: 1, shiny: false };
    state.garden.found['lavanda'] = { count: 1, shiny: false };
    state.garden.found['hibisco'] = { count: 1, shiny: false };
    plantFlower(state, CONTENT, 0, 'hibisco', 0);
    const base = baseIncomePerSecond(state, CONTENT).toNumber();
    const coins = state.coins.toNumber();
    harvestFlower(state, CONTENT, 0, 2 * 3600_000, 0.5);
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
    expect(mutationChance(state, CONTENT)).toBeCloseTo(CONTENT.garden.mutationChance + 0.05, 9);
    state.garden.found['margarita'] = { count: 1, shiny: false };
    const flower = CONTENT.garden.flowers[0]!;
    expect(growMs(state, CONTENT, flower)).toBeCloseTo(flower.growSeconds * 1000 * 0.9, 6);
    buyPerk(state, CONTENT, 'brasas');
    expect(embersPerSecond(state, CONTENT).toNumber()).toBe(0);
    state.cave.furnaces['brasero'] = 1;
    expect(embersPerSecond(state, CONTENT).toNumber()).toBeCloseTo(0.2 * 1.25, 9);
    buyPerk(state, CONTENT, 'soplido');
    buyPerk(state, CONTENT, 'hornos-baratos');
    expect(caveCostFactor(state, CONTENT)).toBeCloseTo(0.92, 9);
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
});
