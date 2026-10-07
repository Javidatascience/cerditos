// Los números del juego y las herramientas del cerdito. Ver docs/06-mina.md.

import type { CompanionDef, GameDef, GlobalUpgradeDef, RelicDef, SkinDef, ToolDef } from './types.ts';

export const GAME: GameDef = {
  costGrowth: 1.17,
  milestones: [5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  milestoneMult: 2,
  upgradeCostFactor: 7,
  tapSeconds: 0.05,
  startCoins: 0,
  startAcorns: 4,
  ascendTool: 7,
  plumaE0: 1e8,
  plumaExponent: 1 / 3,
  perPluma: 0.01,
  offlineHours: 2,
  momentumMax: 1.25,
  momentumPerTap: 0.03,
  momentumDecay: 0.04,
};

/**
 * Herramientas: costes y producción base tomados de los edificios de Cookie Clicker (wiki: precio × 1,15^n,
 * cada edificio cuesta ~12-15× el anterior y produce ~5-8×, así que los de arriba tardan horas en amortizarse).
 */
export const TOOLS: ToolDef[] = [
  { id: 'pico-de-madera', name: 'Pico de madera', emoji: '⛏️', flavor: 'Hecho con una rama y mucho cariño.', baseCost: 15, baseProd: 0.1 },
  { id: 'cubo-y-pala', name: 'Cubo y pala', emoji: '🪣', flavor: 'Para sacar la tierra suelta de la zanja.', baseCost: 100, baseProd: 1 },
  { id: 'martillo-de-piedra', name: 'Martillo de piedra', emoji: '🔨', flavor: 'Pesa, pero parte cualquier roca.', baseCost: 1100, baseProd: 8 },
  { id: 'hacha-de-hierro', name: 'Hacha de hierro', emoji: '🪓', flavor: 'Brilla tanto que da pena ensuciarla.', baseCost: 12000, baseProd: 47 },
  { id: 'dinamita-de-feria', name: 'Dinamita de feria', emoji: '🧨', flavor: 'Un estruendo y media mina avanzada.', baseCost: 130000, baseProd: 260 },
  { id: 'taladro-de-vapor', name: 'Taladro de vapor', emoji: '🛠️', flavor: 'Hace ruido, humo y mucho progreso.', baseCost: 1.4e6, baseProd: 1400 },
  { id: 'excavadora', name: 'Excavadora', emoji: '🚜', flavor: 'Cabe el cerdito y media granja dentro.', baseCost: 2e7, baseProd: 7800 },
  { id: 'grua-perforadora', name: 'Grúa perforadora', emoji: '🏗️', flavor: 'Con ella ya se puede volar a ver mundo.', baseCost: 3.3e8, baseProd: 44000 },
  { id: 'laser-de-cristal', name: 'Láser de cristal', emoji: '🔦', flavor: 'Corta la piedra como si fuera mantequilla.', baseCost: 5.1e9, baseProd: 2.6e5 },
  { id: 'taladro-de-plasma', name: 'Taladro de plasma', emoji: '⚡', flavor: 'Se oye un zumbido y el suelo desaparece.', baseCost: 7.5e10, baseProd: 1.6e6 },
  { id: 'cohete-excavador', name: 'Cohete excavador', emoji: '🚀', flavor: 'Hacia abajo también se puede despegar.', baseCost: 1e12, baseProd: 1e7 },
  { id: 'agujero-negro', name: 'Agujero negro portátil', emoji: '🌌', flavor: 'Se lo traga todo y devuelve monedas.', baseCost: 1.4e13, baseProd: 6.5e7 },
  { id: 'maquina-del-tiempo', name: 'Máquina del tiempo', emoji: '⏳', flavor: 'Pica ayer lo que cobras hoy.', baseCost: 1.7e14, baseProd: 4.3e8 },
  { id: 'prisma-de-luz', name: 'Prisma de luz', emoji: '🔮', flavor: 'Convierte un rayo en mil monedas de colores.', baseCost: 2.1e15, baseProd: 2.9e9 },
  { id: 'dado-de-la-suerte', name: 'Dado de la suerte', emoji: '🎲', flavor: 'Siempre sale seis, no preguntes cómo.', baseCost: 2.6e16, baseProd: 2.1e10 },
  { id: 'fractal-de-picos', name: 'Fractal de picos', emoji: '♾️', flavor: 'Cada pico lleva dentro otro pico más pequeño.', baseCost: 3.1e17, baseProd: 1.5e11 },
  { id: 'consola-de-codigo', name: 'Consola de código', emoji: '💻', flavor: 'sudo picar --todo', baseCost: 7.1e19, baseProd: 1.1e12 },
  { id: 'universo-en-un-bote', name: 'Universo en un bote', emoji: '🫙', flavor: 'Hay un cerdito dentro que también pica.', baseCost: 1.2e22, baseProd: 8.3e12 },
];

/** Mejoras globales (×1,5 a todo): cada una se desbloquea al ganar una décima parte de su coste en total. */
export const GLOBAL_UPGRADES: GlobalUpgradeDef[] = [
  { id: 'comedero-grande', name: 'Comedero grande', flavor: 'Caben dos hocicos a la vez, y ninguno discute.', unlockAt: 1e5, cost: 1e6, mult: 1.5 },
  { id: 'barro-tibio', name: 'Barro tibio', flavor: 'Siempre a la temperatura justa.', unlockAt: 1e7, cost: 1e8, mult: 1.5 },
  { id: 'paja-dorada', name: 'Paja dorada', flavor: 'Brilla un poco, por si acaso alguien mira.', unlockAt: 1e9, cost: 1e10, mult: 1.5 },
  { id: 'musica-de-feria', name: 'Música de feria', flavor: 'Los cerdos mueven la cola al compás.', unlockAt: 1e11, cost: 1e12, mult: 1.5 },
  { id: 'cena-de-gala', name: 'Cena de gala', flavor: 'Con servilleta y todo.', unlockAt: 1e13, cost: 1e14, mult: 1.5 },
  { id: 'fiesta-del-pueblo', name: 'Fiesta del pueblo', flavor: 'Hasta el alcalde trae una pala.', unlockAt: 1e15, cost: 1e16, mult: 1.5 },
  { id: 'aplausos', name: 'Aplausos de la granja', flavor: 'Se oyen desde la colina.', unlockAt: 1e17, cost: 1e18, mult: 1.5 },
  { id: 'cuerda-de-saltar', name: 'Cuerda de saltar', flavor: 'Calienta las patitas: la inercia llega más alto.', unlockAt: 1e4, cost: 2e4, mult: 1, momentumAdd: 0.15 },
  { id: 'botas-con-muelle', name: 'Botas con muelle', flavor: 'Cada pico rebota un poco más.', unlockAt: 1e6, cost: 2e6, mult: 1, momentumAdd: 0.15 },
  { id: 'cinta-de-correr', name: 'Cinta de correr', flavor: 'El cerdito no quiere parar.', unlockAt: 1e8, cost: 2e8, mult: 1, momentumAdd: 0.15 },
  { id: 'bebida-energetica', name: 'Bebida energética de bellota', flavor: 'Con cuidado, que sube rápido.', unlockAt: 1e10, cost: 2e10, mult: 1, momentumAdd: 0.15 },
  { id: 'tambor-de-ritmo', name: 'Tambor de ritmo', flavor: 'Pica al compás y el compás no se acaba.', unlockAt: 1e12, cost: 2e12, mult: 1, momentumAdd: 0.15 },
  { id: 'trueno-de-feria', name: 'Trueno de feria', flavor: 'Hasta las gallinas aplauden.', unlockAt: 1e14, cost: 2e14, mult: 1, momentumAdd: 0.15 },
  { id: 'luz-de-las-estrellas', name: 'Luz de las estrellas', flavor: 'Trabajar de noche también tiene su encanto.', unlockAt: 1e19, cost: 1e20, mult: 1.5 },
];

/** Pieles del cerdito: unas se compran con bellotas (la moneda del cerdito viajero), otras las regalan logros. */
export const SKINS: SkinDef[] = [
  { id: 'rosa', name: 'Rosa de siempre', flavor: 'El color de toda la vida.', color: '#f4c7c3', cost: 0, achievement: null },
  { id: 'manchado', name: 'Manchado', flavor: 'Cada mancha cuenta una historia distinta.', color: '#e6c9b5', cost: 3, achievement: null },
  { id: 'azulado', name: 'Azulado', flavor: 'Como si hubiera nevado sobre él.', color: '#b7c9e6', cost: 5, achievement: null },
  { id: 'menta', name: 'Menta', flavor: 'Huele a hierbabuena.', color: '#bfe3cf', cost: 5, achievement: null },
  { id: 'terciopelo', name: 'Terciopelo negro', flavor: 'Elegante hasta debajo del barro.', color: '#7a7272', cost: 8, achievement: null },
  { id: 'dorado', name: 'Dorado', flavor: 'Para quien ya ha ganado mil millones.', color: '#f2c94c', cost: null, achievement: 'monedas-1000000000' },
  { id: 'plateado', name: 'Plateado', flavor: 'Reluce tras cinco ascensiones.', color: '#c9ced6', cost: null, achievement: 'ascender-5' },
  { id: 'lila', name: 'Lila de feria', flavor: 'El premio a diez mil picos.', color: '#d7b8e6', cost: null, achievement: 'picar-10000' },
];

/** Compañeros que van con el cerdito en el fondo; cada uno hace algo mientras lo llevas y se mejora con bellotas. */
export const COMPANIONS: CompanionDef[] = [
  {
    id: 'topo', name: 'Topo', emoji: '🦔', flavor: 'Cava mientras picas y desentierra bellotas.', cost: 4, achievement: null,
    ability: { kind: 'tapAcorn', every: 40 },
    upgrades: [
      { cost: 3, ability: { kind: 'tapAcorn', every: 30 } },
      { cost: 6, ability: { kind: 'tapAcorn', every: 22 } },
      { cost: 10, ability: { kind: 'tapAcorn', every: 15 } },
    ],
  },
  {
    id: 'perro', name: 'Perro pastor', emoji: '🐶', flavor: 'Olfatea tu mejor herramienta y la hace rendir más.', cost: 6, achievement: null,
    ability: { kind: 'bestToolMult', mult: 1.1 },
    upgrades: [
      { cost: 4, ability: { kind: 'bestToolMult', mult: 1.15 } },
      { cost: 8, ability: { kind: 'bestToolMult', mult: 1.2 } },
      { cost: 14, ability: { kind: 'bestToolMult', mult: 1.3 } },
    ],
  },
  {
    id: 'pajaro', name: 'Pájaro cantor', emoji: '🐦', flavor: 'Avisa al cerdito viajero para que llegue antes.', cost: 6, achievement: null,
    ability: { kind: 'visitorSpeed', speed: 1.33 },
    upgrades: [
      { cost: 4, ability: { kind: 'visitorSpeed', speed: 1.6 } },
      { cost: 8, ability: { kind: 'visitorSpeed', speed: 2 } },
      { cost: 14, ability: { kind: 'visitorSpeed', speed: 2.5 } },
    ],
  },
  {
    id: 'gato', name: 'Gato dormilón', emoji: '🐱', flavor: 'De vez en cuando se despierta y te trae un regalo de monedas.', cost: 10, achievement: null,
    ability: { kind: 'coinGift', everySeconds: 120, incomeSeconds: 30 },
    upgrades: [
      { cost: 5, ability: { kind: 'coinGift', everySeconds: 110, incomeSeconds: 35 } },
      { cost: 10, ability: { kind: 'coinGift', everySeconds: 100, incomeSeconds: 40 } },
      { cost: 16, ability: { kind: 'coinGift', everySeconds: 90, incomeSeconds: 45 } },
    ],
  },
  {
    id: 'conejo', name: 'Conejo veloz', emoji: '🐰', flavor: 'De vez en cuando te deja coger una herramienta gratis.', cost: 10, achievement: null,
    ability: { kind: 'freeTool', cooldownHours: 6 },
    upgrades: [
      { cost: 5, ability: { kind: 'freeTool', cooldownHours: 5 } },
      { cost: 10, ability: { kind: 'freeTool', cooldownHours: 4 } },
      { cost: 16, ability: { kind: 'freeTool', cooldownHours: 3 } },
    ],
  },
];

/** Reliquias: bonos permanentes que dan algunos logros. */
export const RELICS: RelicDef[] = [
  { id: 'callo-de-oro', name: 'Callo de oro', emoji: '🖐️', flavor: 'De tanto picar, la mano se ha vuelto de oro.', achievement: 'picar-1000', effect: { kind: 'tapMult', perLevel: 1 } },
  { id: 'pico-ancestral', name: 'Pico ancestral', emoji: '🪓', flavor: 'Lo usaba la abuela del abuelo.', achievement: 'pico-de-madera-100', effect: { kind: 'prodMult', perLevel: 1.1 } },
  { id: 'pluma-eterna', name: 'Esmeralda eterna', emoji: '💎', flavor: 'No se apaga nunca, ni en lo más hondo de la mina.', achievement: 'ascender-3', effect: { kind: 'plumaMult', perLevel: 0.1 } },
  { id: 'reloj-de-bolsillo', name: 'Reloj de bolsillo', emoji: '⏱️', flavor: 'Atrasa un poco, a favor del cerdito.', achievement: 'plumas-100', effect: { kind: 'offlineHours', perLevel: 1 } },
  { id: 'muelle-magico', name: 'Muelle mágico', emoji: '🌀', flavor: 'Quien lo toca, no quiere parar.', achievement: 'grua-perforadora-25', effect: { kind: 'momentumMax', perLevel: 0.25 } },
  { id: 'monedero-sin-fondo', name: 'Monedero sin fondo', emoji: '👛', flavor: 'Siempre cabe una moneda más.', achievement: 'monedas-1000000000000', effect: { kind: 'costMult', perLevel: 0.95 } },
  { id: 'corazon-de-agujero', name: 'Corazón de agujero negro', emoji: '🕳️', flavor: 'Late muy despacio y lo atrae todo.', achievement: 'agujero-negro-1', effect: { kind: 'prodMult', perLevel: 1.5 } },
];
