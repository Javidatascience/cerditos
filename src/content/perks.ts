// Ventajas permanentes, que se compran con plumas (las que deja ascender). Ver docs/06-mina.md.
// Coste del nivel L → L+1: ceil(baseCost · costGrowth^L) (core/formulas.ts).

import type { PerkDef } from './types.ts';

export const PERKS: PerkDef[] = [
  { id: 'abono', name: 'Abono de calidad', flavor: 'Los cerditos pican más contentos cuanto mejor comen.', maxLevel: null, baseCost: 2, costGrowth: 1.4, requires: [], effect: { kind: 'prodMult', perLevel: 1.1 } },
  { id: 'comienzo', name: 'Buen comienzo', flavor: 'Empiezas cada ronda con la despensa llena.', maxLevel: 5, baseCost: 3, costGrowth: 3, requires: ['abono'], effect: { kind: 'startCurrency', perLevel: 10 } },
  { id: 'manos', name: 'Manos de acero', flavor: 'Cada pico del cerdito pega bastante más fuerte.', maxLevel: 10, baseCost: 4, costGrowth: 1.8, requires: ['abono'], effect: { kind: 'tapMult', perLevel: 1.5 } },
  { id: 'descanso', name: 'Siesta larga', flavor: 'El cerdito sigue trabajando un rato más mientras no estás.', maxLevel: 6, baseCost: 15, costGrowth: 2.2, requires: ['abono'], effect: { kind: 'offlineHours', perLevel: 1 } },
  { id: 'ahorro', name: 'Regateo en la feria', flavor: 'Todo cuesta un poco menos si sabes regatear.', maxLevel: 5, baseCost: 6, costGrowth: 2.2, requires: ['abono'], effect: { kind: 'costMult', perLevel: 0.93 } },
  { id: 'vuelo', name: 'Plumas al viento', flavor: 'Cada ascensión deja un poco más de plumas en el suelo.', maxLevel: 5, baseCost: 25, costGrowth: 2.5, requires: ['ahorro'], effect: { kind: 'plumaMult', perLevel: 0.15 } },
  { id: 'raices', name: 'Raíces profundas', flavor: 'Cuantas más plumas, más aguanta su bono.', maxLevel: 5, baseCost: 100, costGrowth: 3, requires: ['vuelo'], effect: { kind: 'perPlumaBonus', perLevel: 0.01 } },
];
