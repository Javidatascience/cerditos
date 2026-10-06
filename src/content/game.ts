// Los números del juego y las herramientas del cerdito. Ver docs/06-mina.md.

import type { CompanionDef, GameDef, GlobalUpgradeDef, RelicDef, SkinDef, ToolDef } from './types.ts';

export const GAME: GameDef = {
  costGrowth: 1.15,
  milestones: [5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  milestoneMult: 2,
  upgradeCostFactor: 5,
  tapSeconds: 1,
  startCoins: 0,
  ascendTool: 7,
  plumaE0: 1e5,
  plumaExponent: 0.25,
  perPluma: 0.02,
  offlineHours: 2,
  momentumMax: 5,
  momentumPerTap: 0.03,
  momentumDecay: 0.04,
};

/** Cada herramienta cuesta ~11× la anterior y produce 8× más: amortizarla tarda ~1,4× más que la anterior. */
export const TOOLS: ToolDef[] = [
  { id: 'pico-de-madera', name: 'Pico de madera', emoji: '⛏️', flavor: 'Hecho con una rama y mucho cariño.', baseCost: 10, baseProd: 0.1 },
  { id: 'cubo-y-pala', name: 'Cubo y pala', emoji: '🪣', flavor: 'Para sacar la tierra suelta de la zanja.', baseCost: 110, baseProd: 0.8 },
  { id: 'martillo-de-piedra', name: 'Martillo de piedra', emoji: '🔨', flavor: 'Pesa, pero parte cualquier roca.', baseCost: 1210, baseProd: 6.4 },
  { id: 'hacha-de-hierro', name: 'Hacha de hierro', emoji: '🪓', flavor: 'Brilla tanto que da pena ensuciarla.', baseCost: 13300, baseProd: 51 },
  { id: 'dinamita-de-feria', name: 'Dinamita de feria', emoji: '🧨', flavor: 'Un estruendo y media mina avanzada.', baseCost: 146000, baseProd: 410 },
  { id: 'taladro-de-vapor', name: 'Taladro de vapor', emoji: '🛠️', flavor: 'Hace ruido, humo y mucho progreso.', baseCost: 1.61e6, baseProd: 3277 },
  { id: 'excavadora', name: 'Excavadora', emoji: '🚜', flavor: 'Cabe el cerdito y media granja dentro.', baseCost: 1.77e7, baseProd: 26214 },
  { id: 'grua-perforadora', name: 'Grúa perforadora', emoji: '🏗️', flavor: 'Con ella ya se puede volar a ver mundo.', baseCost: 1.95e8, baseProd: 209715 },
  { id: 'laser-de-cristal', name: 'Láser de cristal', emoji: '🔦', flavor: 'Corta la piedra como si fuera mantequilla.', baseCost: 2.1e9, baseProd: 1.68e06 },
  { id: 'taladro-de-plasma', name: 'Taladro de plasma', emoji: '⚡', flavor: 'Se oye un zumbido y el suelo desaparece.', baseCost: 2.4e10, baseProd: 1.34e07 },
  { id: 'cohete-excavador', name: 'Cohete excavador', emoji: '🚀', flavor: 'Hacia abajo también se puede despegar.', baseCost: 2.6e11, baseProd: 1.07e08 },
  { id: 'agujero-negro', name: 'Agujero negro portátil', emoji: '🌌', flavor: 'Se lo traga todo y devuelve monedas.', baseCost: 2.9e12, baseProd: 8.6e08 },
];

/** Mejoras globales (×1,5 a todo): cada una se desbloquea al ganar una décima parte de su coste en total. */
export const GLOBAL_UPGRADES: GlobalUpgradeDef[] = [
  { id: 'comedero-grande', name: 'Comedero grande', flavor: 'Caben dos hocicos a la vez, y ninguno discute.', unlockAt: 500, cost: 5e3, mult: 1.5 },
  { id: 'barro-tibio', name: 'Barro tibio', flavor: 'Siempre a la temperatura justa.', unlockAt: 5e4, cost: 5e5, mult: 1.5 },
  { id: 'paja-dorada', name: 'Paja dorada', flavor: 'Brilla un poco, por si acaso alguien mira.', unlockAt: 5e6, cost: 5e7, mult: 1.5 },
  { id: 'musica-de-feria', name: 'Música de feria', flavor: 'Los cerdos mueven la cola al compás.', unlockAt: 5e8, cost: 5e9, mult: 1.5 },
  { id: 'cena-de-gala', name: 'Cena de gala', flavor: 'Con servilleta y todo.', unlockAt: 5e10, cost: 5e11, mult: 1.5 },
  { id: 'fiesta-del-pueblo', name: 'Fiesta del pueblo', flavor: 'Hasta el alcalde trae una pala.', unlockAt: 5e12, cost: 5e13, mult: 1.5 },
  { id: 'aplausos', name: 'Aplausos de la granja', flavor: 'Se oyen desde la colina.', unlockAt: 5e14, cost: 5e15, mult: 1.5 },
  { id: 'luz-de-las-estrellas', name: 'Luz de las estrellas', flavor: 'Trabajar de noche también tiene su encanto.', unlockAt: 5e16, cost: 5e17, mult: 1.5 },
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

/** Compañeros que van con el cerdito en el fondo; cada uno hace algo mientras lo llevas puesto. */
export const COMPANIONS: CompanionDef[] = [
  { id: 'topo', name: 'Topo', emoji: '🦔', flavor: 'Cava mientras picas: cada 40 picos desentierra una bellota.', cost: 4, achievement: null, ability: { kind: 'tapAcorn', every: 40 } },
  { id: 'gato', name: 'Gato dormilón', emoji: '🐱', flavor: 'De vez en cuando se despierta y te trae un regalo de monedas.', cost: 10, achievement: null, ability: { kind: 'coinGift', everySeconds: 120, incomeSeconds: 90 } },
  { id: 'dragon', name: 'Dragoncito', emoji: '🐉', flavor: 'Un regalo por diez ascensiones. Su aliento enciende la inercia al máximo.', cost: null, achievement: 'ascender-10', ability: { kind: 'fireBreath', everySeconds: 180 } },
];

/** Reliquias: bonos permanentes que dan algunos logros. */
export const RELICS: RelicDef[] = [
  { id: 'callo-de-oro', name: 'Callo de oro', emoji: '🖐️', flavor: 'De tanto picar, la mano se ha vuelto de oro.', achievement: 'picar-1000', effect: { kind: 'tapMult', perLevel: 1 } },
  { id: 'pico-ancestral', name: 'Pico ancestral', emoji: '🪓', flavor: 'Lo usaba la abuela del abuelo.', achievement: 'pico-de-madera-100', effect: { kind: 'prodMult', perLevel: 1.1 } },
  { id: 'pluma-eterna', name: 'Pluma eterna', emoji: '🪶', flavor: 'No se cae nunca, ni con el viento.', achievement: 'ascender-3', effect: { kind: 'plumaMult', perLevel: 0.1 } },
  { id: 'reloj-de-bolsillo', name: 'Reloj de bolsillo', emoji: '⏱️', flavor: 'Atrasa un poco, a favor del cerdito.', achievement: 'plumas-100', effect: { kind: 'offlineHours', perLevel: 1 } },
  { id: 'muelle-magico', name: 'Muelle mágico', emoji: '🌀', flavor: 'Quien lo toca, no quiere parar.', achievement: 'grua-perforadora-25', effect: { kind: 'momentumMax', perLevel: 1 } },
  { id: 'monedero-sin-fondo', name: 'Monedero sin fondo', emoji: '👛', flavor: 'Siempre cabe una moneda más.', achievement: 'monedas-1000000000000', effect: { kind: 'costMult', perLevel: 0.95 } },
  { id: 'corazon-de-agujero', name: 'Corazón de agujero negro', emoji: '🕳️', flavor: 'Late muy despacio y lo atrae todo.', achievement: 'agujero-negro-1', effect: { kind: 'prodMult', perLevel: 1.5 } },
];
