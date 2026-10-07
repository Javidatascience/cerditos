// Ventajas permanentes, que se compran con esmeraldas (las que deja ascender). Ver docs/06-mina.md.
// Coste del nivel L → L+1: ceil(baseCost · costGrowth^L) (core/formulas.ts).
// Árbol: cada nivel es un nodo (todas tienen como mucho 5). El Abono es la raíz y va en horizontal; cada uno
// de sus niveles abre otra rama (`requiresLevel`). Las posiciones (`layout`) son casillas de la cuadrícula del árbol.

import type { PerkDef } from './types.ts';

export const PERKS: PerkDef[] = [
  { id: 'abono', name: 'Abono de calidad', flavor: 'Los cerditos pican más contentos cuanto mejor comen.', maxLevel: 5, baseCost: 2, costGrowth: 1.6, requires: [], effect: { kind: 'prodMult', perLevel: 1.25 }, icon: 'perk-abono', layout: { col: 1, row: 0, dir: 'right' } },
  { id: 'comienzo', name: 'Buen comienzo', flavor: 'Empiezas cada ronda con la despensa llena.', maxLevel: 5, baseCost: 3, costGrowth: 3, requires: ['abono'], requiresLevel: 1, effect: { kind: 'startCurrency', perLevel: 10 }, icon: 'perk-comienzo', layout: { col: 1, row: 1, dir: 'down' } },
  { id: 'manos', name: 'Manos de acero', flavor: 'Cada pico del cerdito pega bastante más fuerte.', maxLevel: 5, baseCost: 4, costGrowth: 1.9, requires: ['abono'], requiresLevel: 2, effect: { kind: 'tapMult', perLevel: 3 }, icon: 'perk-manos', layout: { col: 2, row: 1, dir: 'down' } },
  { id: 'descanso', name: 'Siesta larga', flavor: 'El cerdito sigue trabajando un rato más mientras no estás.', maxLevel: 5, baseCost: 12, costGrowth: 2.2, requires: ['abono'], requiresLevel: 3, effect: { kind: 'offlineHours', perLevel: 1 }, icon: 'perk-descanso', layout: { col: 3, row: 1, dir: 'down' } },
  { id: 'ahorro', name: 'Regateo en la feria', flavor: 'Todo cuesta un poco menos si sabes regatear.', maxLevel: 5, baseCost: 6, costGrowth: 2.2, requires: ['abono'], requiresLevel: 4, effect: { kind: 'costMult', perLevel: 0.93 }, icon: 'perk-ahorro', layout: { col: 4, row: 1, dir: 'down' } },
  { id: 'vuelo', name: 'Veta rica', flavor: 'Cada ascensión deja un poco más de esmeraldas en la veta.', maxLevel: 5, baseCost: 25, costGrowth: 2.5, requires: ['ahorro'], requiresLevel: 1, effect: { kind: 'plumaMult', perLevel: 0.15 }, icon: 'perk-vuelo', layout: { col: 5, row: 2, dir: 'down' } },
  { id: 'raices', name: 'Raíces profundas', flavor: 'Cuantas más esmeraldas, más aguanta su bono.', maxLevel: 5, baseCost: 100, costGrowth: 3, requires: ['vuelo'], requiresLevel: 1, effect: { kind: 'perPlumaBonus', perLevel: 0.01 }, icon: 'perk-raices', layout: { col: 6, row: 3, dir: 'down' } },
];
