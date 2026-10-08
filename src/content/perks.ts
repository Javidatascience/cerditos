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
  { id: 'compania', name: 'Un amigo más', flavor: 'En la escena cabe otro compañero.', maxLevel: 1, baseCost: 40, costGrowth: 1, requires: ['abono'], requiresLevel: 5, effect: { kind: 'companionSlots', perLevel: 1 }, icon: 'perk-compania', layout: { col: 5, row: 1, dir: 'down' } },

  // --- Jardín (se abre con 1 esmeralda en total): una escalera de ventajas, una fila cada una ---
  { id: 'parcelas', name: 'Más tierra', flavor: 'Un trozo más de huerta para plantar.', maxLevel: 3, baseCost: 8, costGrowth: 2.5, requires: [], requiresPlumasTotal: 1, section: 'Jardín', effect: { kind: 'gardenRows', perLevel: 1 }, icon: 'perk-parcelas', layout: { col: 1, row: 10, dir: 'right' } },
  { id: 'abonado', name: 'Tierra buena', flavor: 'Las flores crecen más deprisa.', maxLevel: 5, baseCost: 6, costGrowth: 2, requires: ['parcelas'], effect: { kind: 'gardenGrowth', perLevel: 0.9 }, icon: 'perk-crecimiento', layout: { col: 1, row: 11, dir: 'right' } },
  { id: 'polen', name: 'Mucho polen', flavor: 'Las flores vecinas se cruzan con más facilidad.', maxLevel: 5, baseCost: 8, costGrowth: 2.1, requires: ['abonado'], effect: { kind: 'gardenMutation', perLevel: 0.05 }, icon: 'perk-polen', layout: { col: 1, row: 12, dir: 'right' } },
  { id: 'rocio', name: 'Rocío de la mañana', flavor: 'Los bonos de las flores duran más.', maxLevel: 5, baseCost: 10, costGrowth: 2.2, requires: ['polen'], effect: { kind: 'gardenDuration', perLevel: 0.2 }, icon: 'perk-rocio', layout: { col: 1, row: 13, dir: 'right' } },
  { id: 'ojo-brillante', name: 'Ojo para lo brillante', flavor: 'Se te dan mejor las flores relucientes.', maxLevel: 5, baseCost: 14, costGrowth: 2.4, requires: ['rocio'], effect: { kind: 'gardenShiny', perLevel: 0.02 }, icon: 'perk-brillo', layout: { col: 1, row: 14, dir: 'right' } },

  // --- Cueva (se abre con 3 esmeraldas en total) ---
  { id: 'brasas', name: 'Más brasas', flavor: 'Los hornos dan más calor.', maxLevel: 5, baseCost: 10, costGrowth: 2, requires: [], requiresPlumasTotal: 3, section: 'Cueva del Dragón', effect: { kind: 'caveEmbers', perLevel: 0.25 }, icon: 'perk-brasas', layout: { col: 1, row: 17, dir: 'right' } },
  { id: 'soplido', name: 'Soplido potente', flavor: 'Cada soplido da más brasas.', maxLevel: 5, baseCost: 8, costGrowth: 2, requires: ['brasas'], effect: { kind: 'caveBlow', perLevel: 0.5 }, icon: 'perk-soplido', layout: { col: 1, row: 18, dir: 'right' } },
  { id: 'hornos-baratos', name: 'Hornos de saldo', flavor: 'Construir hornos cuesta menos.', maxLevel: 5, baseCost: 12, costGrowth: 2.2, requires: ['soplido'], effect: { kind: 'caveCost', perLevel: 0.92 }, icon: 'perk-hornos', layout: { col: 1, row: 19, dir: 'right' } },
  { id: 'calor-del-dragon', name: 'Calor del dragón', flavor: 'El calor de la cueva sube hasta la mina.', maxLevel: 5, baseCost: 30, costGrowth: 2.8, requires: ['hornos-baratos'], effect: { kind: 'prodMult', perLevel: 1.05 }, icon: 'perk-calor', layout: { col: 1, row: 20, dir: 'right' } },
];
