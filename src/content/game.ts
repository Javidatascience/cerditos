// Los números del juego y las herramientas del cerdito. Ver docs/06-mina.md.

import type { GameDef, ToolDef } from './types.ts';

export const GAME: GameDef = {
  costGrowth: 1.15,
  milestones: [5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  milestoneMult: 2,
  tapSeconds: 1,
  startCoins: 0,
  ascendTool: 7,
  plumaE0: 1e5,
  plumaExponent: 0.25,
  perPluma: 0.02,
  offlineHours: 2,
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
