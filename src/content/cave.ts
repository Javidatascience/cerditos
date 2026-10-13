// La Cueva del Dragón: un corredor sin fin a lo Idle Slayer. El cerdito corre solo por la cueva; tocar le
// hace saltar. Recoge brasas del suelo, pelea con los monstruos que se encuentra (si no puede con uno, se
// para a golpearlo hasta que cae, o lo salta) y cada `bossEvery` metros le espera el dragón como jefe.
// Con las brasas se compra la armería; al renacer se pierde la carrera a cambio de almas permanentes.
// Se abre con 3 esmeraldas en total. La carrera solo avanza con la pestaña abierta.

import type { CaveDef } from './types.ts';

export const CAVE: CaveDef = {
  unlockPlumas: 3,
  dragon: [
    { id: 'huevo', name: 'Huevo', flavor: 'Late despacio, calentito entre las brasas.', prodMult: 1, embersMult: 1 },
    { id: 'cria', name: 'Cría de dragón', flavor: 'Al vencerla, te sigue a todas partes.', prodMult: 1.05, embersMult: 1.2 },
    { id: 'joven', name: 'Dragón joven', flavor: 'Escupe chispas y persigue a las gallinas.', prodMult: 1.08, embersMult: 1.3 },
    { id: 'adulto', name: 'Dragón adulto', flavor: 'Con las alas abiertas tapa media cueva.', prodMult: 1.1, embersMult: 1.4 },
    { id: 'anciano', name: 'Dragón anciano', flavor: 'Sabio, barbudo y dueño de todo el tesoro.', prodMult: 1.15, embersMult: 1.5 },
  ],
  speed: 6,
  coinEmbers: 1,
  hpGrowth: 1.15,
  rewardGrowth: 1.12,
  hitsPerSecond: 4,
  monsters: [
    { id: 'babosa', name: 'Babosa de lava', hp: 3, embers: 3, fromMeters: 0 },
    { id: 'murcielago', name: 'Murciélago', hp: 6, embers: 5, fromMeters: 120 },
    { id: 'seta', name: 'Seta gruñona', hp: 15, embers: 12, fromMeters: 350 },
    { id: 'arana', name: 'Araña de cristal', hp: 40, embers: 30, fromMeters: 800 },
    { id: 'golem', name: 'Gólem de roca', hp: 120, embers: 80, fromMeters: 1500 },
  ],
  bossEvery: 500,
  bossHp: 150,
  bossHpGrowth: 4,
  bossReward: 0.8,
  bossSeconds: 30,
  bonusEvery: 900,
  bonusSeconds: 15,
  armory: [
    { id: 'espada', name: 'Espada de madera', flavor: 'Cada nivel, golpes más fuertes.', baseCost: 15, costGrowth: 1.55, maxLevel: null, effect: { kind: 'damage', perLevel: 1.5 } },
    { id: 'botas', name: 'Botas de correr', flavor: 'Más metros, más brasas.', baseCost: 40, costGrowth: 2.2, maxLevel: 10, effect: { kind: 'speed', perLevel: 0.12 } },
    { id: 'mochila', name: 'Mochila de brasas', flavor: 'Caben más brasas en cada viaje.', baseCost: 60, costGrowth: 1.8, maxLevel: null, effect: { kind: 'embers', perLevel: 0.25 } },
    { id: 'iman', name: 'Imán de brasas', flavor: 'Las brasas vienen solas hacia el cerdito.', baseCost: 120, costGrowth: 2.6, maxLevel: 5, effect: { kind: 'magnet', perLevel: 6 } },
    { id: 'alas', name: 'Alas de murciélago', flavor: 'Un salto más en el aire.', baseCost: 400, costGrowth: 12, maxLevel: 2, effect: { kind: 'jumps', perLevel: 1 } },
    { id: 'ojo', name: 'Ojo de lagarto', flavor: 'Salta solo cuando hace falta: la cueva corre sin tocar nada.', baseCost: 800, costGrowth: 1, maxLevel: 1, effect: { kind: 'auto', perLevel: 1 } },
  ],
  soulsDivisor: 2000,
  soulEmbers: 0.1,
  soulProd: 0.01,
};
