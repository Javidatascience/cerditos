// Contenido del juego usado por el simulador.
// Es la FUENTE DE VERDAD de las constantes económicas hasta el hito 2 del plan,
// cuando se portará a src/content/ y el simulador pasará a importar desde allí.
// Todo son datos: el motor (engine.ts) no conoce nombres de razas ni de mundos.

export type WorldId = 'valle' | 'bosque' | 'huerta' | 'balneario';
export type Mechanic = 'classic' | 'chain' | 'harmony' | 'calm';

export interface GeneratorDef {
  id: string;
  name: string;
  baseCost: number;
  /** classic/harmony/calm: moneda por segundo por unidad. chain: unidades del nivel inferior por segundo (nivel 0: moneda). */
  baseProd: number;
  /** Crecimiento de coste propio; si falta, se usa el del mundo. */
  costGrowth?: number;
}

export interface GlobalUpgradeDef {
  id: string;
  name: string;
  cost: number;
  mult: number;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  currency: string;
  mechanic: Mechanic;
  costGrowth: number;
  startCurrency: number;
  generators: GeneratorDef[];
  /** Mejoras por generador: se desbloquean al tener N comprados. Vacío = no hay (Huerta). */
  genUpgradeCounts: number[];
  genUpgradeMult: number;
  /** coste mejora = factor × precio de la unidad nº N de ese generador (sin descuentos). */
  genUpgradeCostFactor: number;
  globalUpgrades: GlobalUpgradeDef[];
  prestige: {
    /** plumas totales = floor((ganado en la vida del mundo / e0) ^ exponent × multPlumas) */
    e0: number;
    exponent: number;
    /** +x producción por cada pluma ganada (total histórico, no se pierde al gastar). */
    perPluma: number;
  };
  /** Mundo previo y plumas totales que hay que tener allí. null = abierto desde el inicio. */
  unlock: { world: WorldId; plumasTotal: number } | null;
  /** Armonía = mínimo de unidades entre todos los generadores. Multiplica todo: (1 + perLevel·armonía) × mult^(umbrales alcanzados). */
  harmony?: { perLevel: number; thresholds: number[]; mult: number };
  calm?: { maxBonus: number; rampSeconds: number; penalty: number; windowSeconds: number };
  /** Escala de coste de las ventajas de este mundo (en sus plumas). */
  perkCostScale: number;
  /** Coste base de las ventajas de segunda fila (Establo, Raíces). */
  latePerkBase: number;
}

// ---------------------------------------------------------------------------
// Helpers de datos (solo generan tablas; no hay lógica de juego aquí)
// ---------------------------------------------------------------------------

function tiers(names: string[], cost0: number, costRatio: number, prod0: number, prodRatio: number): GeneratorDef[] {
  return names.map((name, i) => ({
    id: slug(name),
    name,
    baseCost: round3(cost0 * costRatio ** i),
    baseProd: round3(prod0 * prodRatio ** i),
  }));
}

function globalUps(names: string[], cost0: number, costRatio: number, mult: number): GlobalUpgradeDef[] {
  return names.map((name, i) => ({ id: slug(name), name, cost: round3(cost0 * costRatio ** i), mult }));
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Redondea a 3 cifras significativas para que las tablas sean legibles. */
function round3(x: number): number {
  if (x === 0) return 0;
  const p = 10 ** (Math.floor(Math.log10(Math.abs(x))) - 2);
  return Math.round(x / p) * p;
}

// ---------------------------------------------------------------------------
// Mundos
// ---------------------------------------------------------------------------

export const WORLDS: WorldDef[] = [
  {
    id: 'valle',
    name: 'El Valle',
    currency: 'Bellotas',
    mechanic: 'classic',
    costGrowth: 1.15,
    startCurrency: 15,
    generators: tiers(
      ['Lechón', 'Cerdita rosa', 'Duroc', 'Pietrain', 'Berkshire', 'Mangalica', 'Ibérico', 'Gran Blanco'],
      10, 11, 0.5, 5.5,
    ),
    genUpgradeCounts: [10, 25, 50, 100, 150, 200, 300, 400],
    genUpgradeMult: 2,
    genUpgradeCostFactor: 5,
    globalUpgrades: globalUps(
      ['Paja fresca', 'Charca de barro', 'Rascador de roble', 'Acordeón del abuelo', 'Huerto de manzanos', 'Siesta a la sombra', 'Fiesta de San Antón', 'Pocilga con vistas'],
      5e3, 150, 1.5,
    ),
    prestige: { e0: 2e5, exponent: 1 / 3, perPluma: 0.05 },
    unlock: null,
    perkCostScale: 10,
    latePerkBase: 2e5,
  },
  {
    id: 'bosque',
    name: 'El Bosque',
    currency: 'Trufas',
    mechanic: 'chain',
    costGrowth: 1.2,
    startCurrency: 60,
    generators: [
      { id: 'buscadora', name: 'Buscadora', baseCost: 50, baseProd: 1, costGrowth: 1.15 },
      { id: 'madre-trufera', name: 'Madre trufera', baseCost: 5e3, baseProd: 0.01, costGrowth: 1.25 },
      { id: 'abuela-sabia', name: 'Abuela sabia', baseCost: 5e5, baseProd: 0.005, costGrowth: 1.35 },
      { id: 'clan-del-roble', name: 'Clan del roble', baseCost: 5e7, baseProd: 0.0025, costGrowth: 1.45 },
      { id: 'espiritu-del-bosque', name: 'Espíritu del bosque', baseCost: 5e9, baseProd: 0.00125, costGrowth: 1.55 },
    ],
    genUpgradeCounts: [10, 25, 50, 75, 100, 150],
    genUpgradeMult: 2,
    genUpgradeCostFactor: 5,
    globalUpgrades: globalUps(
      ['Hocico entrenado', 'Mapa de robles', 'Cesta de mimbre', 'Linterna de luciérnagas', 'Canción del bosque', 'Musgo mullido'],
      1e4, 1e3, 1.5,
    ),
    prestige: { e0: 1e8, exponent: 0.25, perPluma: 0.05 },
    unlock: { world: 'valle', plumasTotal: 6e4 },
    perkCostScale: 10,
    latePerkBase: 2e5,
  },
  {
    id: 'huerta',
    name: 'La Huerta',
    currency: 'Calabazas',
    mechanic: 'harmony',
    costGrowth: 1.14,
    startCurrency: 100,
    generators: tiers(
      ['Hortelana', 'Regador', 'Escardadora', 'Cuidador de tomates', 'Pastora de gallinas', 'Apicultor', 'Jardinera jefa', 'Abuelo del huerto'],
      100, 3.5, 1, 2.9,
    ),
    genUpgradeCounts: [],
    genUpgradeMult: 1,
    genUpgradeCostFactor: 0,
    globalUpgrades: globalUps(
      ['Semillas antiguas', 'Compost casero', 'Espantapájaros amable', 'Riego por goteo', 'Invernadero', 'Calendario lunar', 'Abejas amigas', 'Fiesta de la cosecha'],
      2e4, 100, 1.5,
    ),
    prestige: { e0: 1e6, exponent: 0.3, perPluma: 0.05 },
    harmony: { perLevel: 0.02, thresholds: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400], mult: 2 },
    unlock: { world: 'bosque', plumasTotal: 3e5 },
    perkCostScale: 1,
    latePerkBase: 5e3,
  },
  {
    id: 'balneario',
    name: 'El Balneario',
    currency: 'Pompas',
    mechanic: 'calm',
    costGrowth: 1.18,
    startCurrency: 1000,
    generators: tiers(
      ['Bañista', 'Cerdita del barro', 'Masajista', 'Socorrista', 'Termalista', 'Maestra de sales', 'Director del spa', 'Cerdo zen'],
      1e3, 11, 5, 5.5,
    ),
    genUpgradeCounts: [10, 25, 50, 100, 150, 200],
    genUpgradeMult: 2,
    genUpgradeCostFactor: 5,
    globalUpgrades: globalUps(
      ['Toallas calentitas', 'Barro volcánico', 'Pepinos en los ojos', 'Hilo musical', 'Albornoces bordados', 'Aromas de lavanda'],
      5e5, 300, 1.5,
    ),
    prestige: { e0: 1e6, exponent: 0.28, perPluma: 0.05 },
    calm: { maxBonus: 3, rampSeconds: 1800, penalty: 0.5, windowSeconds: 60 },
    unlock: { world: 'huerta', plumasTotal: 1e4 },
    perkCostScale: 1,
    latePerkBase: 5e3,
  },
];

export const WORLD_BY_ID: Record<WorldId, WorldDef> = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, WorldDef>;

// ---------------------------------------------------------------------------
// Ventajas permanentes (árbol de ascensión). Mismo patrón en cada mundo.
// ---------------------------------------------------------------------------

export type PerkEffect =
  | { kind: 'prodMult'; perLevel: number } // producción × perLevel^nivel (este mundo)
  | { kind: 'costMult'; perLevel: number } // coste generadores × perLevel^nivel
  | { kind: 'upgradeCostMult'; perLevel: number } // coste mejoras × perLevel^nivel
  | { kind: 'startCurrency'; perLevel: number } // empieza cada ronda con startCurrency × perLevel^nivel
  | { kind: 'plumaMult'; perLevel: number } // plumas × (1 + perLevel × nivel)
  | { kind: 'crossProd'; perLevel: number } // producción de los OTROS mundos × (1 + perLevel × nivel)
  | { kind: 'costGrowthDelta'; perLevel: number } // crecimiento de coste de generadores − perLevel × nivel
  | { kind: 'perPlumaBonus'; perLevel: number } // bono por pluma + perLevel × nivel
  | { kind: 'autobuyGenerators' }
  | { kind: 'autobuyUpgrades' };

export interface PerkDef {
  id: string; // único global: `${world}.${local}`
  world: WorldId;
  name: string;
  maxLevel: number | null; // null = sin límite
  baseCost: number;
  costGrowth: number;
  requires: string[];
  effect: PerkEffect;
}

function perksFor(world: WorldId, scale: number, lateScale: number): PerkDef[] {
  const id = (local: string) => `${world}.${local}`;
  const p = (local: string, name: string, maxLevel: number | null, baseCost: number, costGrowth: number, requires: string[], effect: PerkEffect): PerkDef => ({
    id: id(local), world, name, maxLevel, baseCost, costGrowth, requires: requires.map(id), effect,
  });
  return [
    // Capataz y Encargada son baratas a propósito (quitar tareas pronto) y no escalan.
    p('abono', 'Abono de calidad', null, 2, 1.4, [], { kind: 'prodMult', perLevel: 1.1 }),
    p('capataz', 'Capataz', 1, 5, 1, [], { kind: 'autobuyGenerators' }),
    p('comienzo', 'Buen comienzo', 5, 3 * scale, 3, ['abono'], { kind: 'startCurrency', perLevel: 25 }),
    p('ahorro', 'Regateo en la feria', 5, 6 * scale, 2.2, ['abono'], { kind: 'costMult', perLevel: 0.93 }),
    p('encargada', 'Encargada de mejoras', 1, 20, 1, ['capataz'], { kind: 'autobuyUpgrades' }),
    p('mejoras', 'Herramientas heredadas', 3, 12 * scale, 3, ['encargada'], { kind: 'upgradeCostMult', perLevel: 0.75 }),
    p('vuelo', 'Plumas al viento', 5, 25 * scale, 2.5, ['ahorro'], { kind: 'plumaMult', perLevel: 0.15 }),
    p('puente', 'Hermandad de granjas', 5, 60 * scale, 2.2, ['vuelo'], { kind: 'crossProd', perLevel: 0.1 }),
    // Segunda fila: objetivos de largo plazo (días), con costes propios del mundo.
    p('establo', 'Establo ampliado', 4, lateScale, 4, ['puente'], { kind: 'costGrowthDelta', perLevel: 0.0025 }),
    p('raices', 'Raíces profundas', 5, lateScale * 2, 3, ['puente'], { kind: 'perPlumaBonus', perLevel: 0.01 }),
  ];
}

export const PERKS: PerkDef[] = WORLDS.flatMap((w) => perksFor(w.id, w.perkCostScale, w.latePerkBase));

// ---------------------------------------------------------------------------
// Colección: variedades de cerdito (deterministas) y sets
// ---------------------------------------------------------------------------

export type Requirement =
  | { kind: 'genCount'; world: WorldId; gen: number; count: number } // máximo comprado alguna vez en una ronda
  | { kind: 'ascensions'; world: WorldId; count: number }
  | { kind: 'plumasTotal'; world: WorldId; count: number }
  | { kind: 'lifetime'; world: WorldId; amount: number }
  | { kind: 'harmony'; count: number } // máximo nivel de armonía alcanzado en la Huerta
  | { kind: 'varieties'; ids: string[] };

export type Bonus =
  | { kind: 'prod'; world: WorldId | 'all'; mult: number }
  | { kind: 'cost'; world: WorldId | 'all'; mult: number };

export interface VarietyDef {
  id: string;
  name: string;
  set: string;
  requires: Requirement[];
  bonus: Bonus;
}

export interface SetDef {
  id: string;
  name: string;
  bonus: Bonus;
}

export const SETS: SetDef[] = [
  { id: 'valle', name: 'Razas del Valle', bonus: { kind: 'prod', world: 'valle', mult: 1.25 } },
  { id: 'bosque', name: 'Familia del Bosque', bonus: { kind: 'prod', world: 'bosque', mult: 1.25 } },
  { id: 'huerta', name: 'Amigos de la Huerta', bonus: { kind: 'prod', world: 'huerta', mult: 1.25 } },
  { id: 'balneario', name: 'Clientes del Balneario', bonus: { kind: 'prod', world: 'balneario', mult: 1.25 } },
  { id: 'curiosos', name: 'Cerditos curiosos', bonus: { kind: 'cost', world: 'all', mult: 0.95 } },
  { id: 'cruces', name: 'Cruces', bonus: { kind: 'prod', world: 'all', mult: 1.1 } },
  { id: 'leyendas', name: 'Leyendas porcinas', bonus: { kind: 'prod', world: 'all', mult: 1.25 } },
];

const own = (world: WorldId, mult = 1.05): Bonus => ({ kind: 'prod', world, mult });
const all = (mult: number): Bonus => ({ kind: 'prod', world: 'all', mult });

export const VARIETIES: VarietyDef[] = [
  // Razas del Valle
  { id: 'lechon-manchado', name: 'Lechón manchado', set: 'valle', requires: [{ kind: 'genCount', world: 'valle', gen: 0, count: 100 }], bonus: own('valle') },
  { id: 'rosa-de-concurso', name: 'Rosa de concurso', set: 'valle', requires: [{ kind: 'genCount', world: 'valle', gen: 1, count: 200 }], bonus: own('valle') },
  { id: 'duroc-pelirrojo', name: 'Duroc pelirrojo', set: 'valle', requires: [{ kind: 'genCount', world: 'valle', gen: 2, count: 250 }], bonus: own('valle') },
  { id: 'iberico-de-bellota', name: 'Ibérico de bellota', set: 'valle', requires: [{ kind: 'genCount', world: 'valle', gen: 6, count: 245 }], bonus: own('valle') },
  // Familia del Bosque
  { id: 'buscadora-veterana', name: 'Buscadora veterana', set: 'bosque', requires: [{ kind: 'ascensions', world: 'bosque', count: 1 }], bonus: own('bosque') },
  { id: 'jabato-curioso', name: 'Jabato curioso', set: 'bosque', requires: [{ kind: 'genCount', world: 'bosque', gen: 2, count: 150 }], bonus: own('bosque') },
  { id: 'cerdita-seta', name: 'Cerdita con sombrero de seta', set: 'bosque', requires: [{ kind: 'lifetime', world: 'bosque', amount: 1e33 }], bonus: own('bosque') },
  { id: 'madre-del-bosque', name: 'Madre del bosque', set: 'bosque', requires: [{ kind: 'plumasTotal', world: 'bosque', count: 5e6 }], bonus: own('bosque') },
  // Amigos de la Huerta
  { id: 'calabacero', name: 'Calabacero', set: 'huerta', requires: [{ kind: 'harmony', count: 25 }], bonus: own('huerta') },
  { id: 'espantapajaros', name: 'Cerdo espantapájaros', set: 'huerta', requires: [{ kind: 'harmony', count: 150 }], bonus: own('huerta') },
  { id: 'cerdita-jardinera', name: 'Cerdita jardinera', set: 'huerta', requires: [{ kind: 'ascensions', world: 'huerta', count: 10 }], bonus: own('huerta') },
  { id: 'gran-calabaza', name: 'Gran calabaza (con cerdito dentro)', set: 'huerta', requires: [{ kind: 'harmony', count: 250 }], bonus: own('huerta') },
  // Clientes del Balneario
  { id: 'cerdito-toalla', name: 'Cerdito con toalla', set: 'balneario', requires: [{ kind: 'ascensions', world: 'balneario', count: 1 }], bonus: own('balneario') },
  { id: 'cerdo-en-remojo', name: 'Cerdo en remojo', set: 'balneario', requires: [{ kind: 'lifetime', world: 'balneario', amount: 1e21 }], bonus: own('balneario') },
  { id: 'cerdita-pepinos', name: 'Cerdita con pepinos', set: 'balneario', requires: [{ kind: 'genCount', world: 'balneario', gen: 7, count: 140 }], bonus: own('balneario') },
  { id: 'maestro-del-barro', name: 'Maestro del barro', set: 'balneario', requires: [{ kind: 'plumasTotal', world: 'balneario', count: 5e4 }], bonus: own('balneario') },
  // Cerditos curiosos (hitos de ascensión en el Valle)
  { id: 'cerdito-boina', name: 'Cerdito con boina', set: 'curiosos', requires: [{ kind: 'ascensions', world: 'valle', count: 5 }], bonus: own('valle') },
  { id: 'cerdita-lectora', name: 'Cerdita lectora', set: 'curiosos', requires: [{ kind: 'plumasTotal', world: 'valle', count: 1e5 }], bonus: own('valle') },
  { id: 'cerdo-filosofo', name: 'Cerdo filósofo', set: 'curiosos', requires: [{ kind: 'ascensions', world: 'valle', count: 30 }], bonus: own('valle') },
  { id: 'cerdito-astronauta', name: 'Cerdito astronauta', set: 'curiosos', requires: [{ kind: 'plumasTotal', world: 'valle', count: 4e6 }], bonus: own('valle') },
  // Cruces (necesitan dos variedades de mundos distintos)
  { id: 'trufero-iberico', name: 'Trufero ibérico', set: 'cruces', requires: [{ kind: 'varieties', ids: ['iberico-de-bellota', 'buscadora-veterana'] }], bonus: all(1.03) },
  { id: 'jabali-rosa', name: 'Jabalí rosa', set: 'cruces', requires: [{ kind: 'varieties', ids: ['rosa-de-concurso', 'jabato-curioso'] }], bonus: all(1.03) },
  { id: 'duroc-hortelano', name: 'Duroc hortelano', set: 'cruces', requires: [{ kind: 'varieties', ids: ['duroc-pelirrojo', 'calabacero'] }], bonus: all(1.03) },
  { id: 'lechon-de-spa', name: 'Lechón de spa', set: 'cruces', requires: [{ kind: 'varieties', ids: ['lechon-manchado', 'cerdito-toalla'] }], bonus: all(1.03) },
  // Leyendas
  { id: 'cerdo-alado', name: 'Cerdo alado', set: 'leyendas', requires: [{ kind: 'varieties', ids: ['cerdito-astronauta', 'maestro-del-barro'] }], bonus: all(1.05) },
  { id: 'gran-madre', name: 'La Gran Madre', set: 'leyendas', requires: [{ kind: 'varieties', ids: ['madre-del-bosque', 'gran-calabaza'] }], bonus: all(1.05) },
  { id: 'cerdo-de-oro', name: 'Cerdo de oro', set: 'leyendas', requires: [{ kind: 'varieties', ids: ['trufero-iberico', 'jabali-rosa', 'duroc-hortelano', 'lechon-de-spa'] }], bonus: all(1.05) },
  { id: 'pancho', name: 'Pancho, el primer cerdito', set: 'leyendas', requires: [{ kind: 'varieties', ids: ['cerdo-alado', 'gran-madre', 'cerdo-de-oro', 'cerdo-filosofo', 'cerdita-seta', 'cerdita-pepinos', 'cerdita-jardinera', 'cerdo-en-remojo'] }], bonus: all(1.05) },
];
