// La Cueva del Dragón: un corredor sin fin a lo Idle Slayer. El cerdito corre solo de izquierda a derecha;
// tocar le hace saltar. Los monstruos caen al chocar con ellos (a los que vuelan hay que alcanzarlos de un
// salto) y dan brasas y almas; a veces sueltan la semilla de su flor para el jardín. Hay cofres por el
// camino, una barra de furia que se llena derrotando monstruos y, cada `bossEvery` metros, el dragón como
// jefe. Brasas → armería (se pierde al renacer). Almas → mejoras permanentes y evolucionar monstruos.
// Se abre con 3 esmeraldas en total. La carrera solo avanza con la pestaña abierta.

import type { CaveDef } from './types.ts';

export const CAVE: CaveDef = {
  unlockPlumas: 3,
  dragon: [
    { id: 'huevo', name: 'Huevo', flavor: 'Late despacio, calentito entre las brasas.', prodMult: 1, embersMult: 1 },
    { id: 'cria', name: 'Cría de dragón', flavor: 'Al vencerla, te sigue a todas partes.', prodMult: 1.05, embersMult: 1.2 },
    { id: 'joven', name: 'Dragón joven', flavor: 'Escupe chispas y persigue a las gallinas.', prodMult: 1.08, embersMult: 1.3 },
    { id: 'adulto', name: 'Dragón adulto', flavor: 'Con las alas abiertas tapa media cueva. Te ha dejado un huevo en el nido.', prodMult: 1.1, embersMult: 1.4 },
    { id: 'anciano', name: 'Dragón anciano', flavor: 'Sabio, barbudo y dueño de todo el tesoro.', prodMult: 1.15, embersMult: 1.5 },
  ],
  speed: 6,
  coinEmbers: 1,
  rewardGrowth: 1.12,
  hitsPerSecond: 4,
  seedChance: 0.03,
  chestEvery: 350,
  rageKills: 25,
  rageSeconds: 12,
  rageMult: 3,
  evolveEmbers: 3,
  evolveSouls: 2,
  monsters: [
    { id: 'babosa', name: 'Babosa de lava', embers: 3, souls: 1, fromMeters: 0, flower: 'flor-babosa' },
    { id: 'murcielago', name: 'Murciélago', embers: 5, souls: 1, fromMeters: 120, flies: true, flower: 'flor-murcielago' },
    { id: 'seta', name: 'Seta gruñona', embers: 8, souls: 2, fromMeters: 350, flower: 'flor-seta' },
    { id: 'arana', name: 'Araña de cristal', embers: 14, souls: 3, fromMeters: 800, flies: true, flower: 'flor-arana' },
    { id: 'golem', name: 'Gólem de roca', embers: 30, souls: 5, fromMeters: 1500, flower: 'musgo-de-golem' },
  ],
  bossEvery: 500,
  bossHp: 150,
  bossHpGrowth: 4,
  bossReward: 0.8,
  bossSeconds: 30,
  bossSouls: 10,
  bonusEvery: 900,
  bonusSeconds: 15,
  armory: [
    { id: 'espada', name: 'Espada de madera', flavor: 'Golpes más fuertes contra el dragón.', baseCost: 15, costGrowth: 1.55, maxLevel: null, effect: { kind: 'damage', perLevel: 1.5 } },
    { id: 'botas', name: 'Botas de correr', flavor: 'Más metros, más monstruos, más brasas.', baseCost: 40, costGrowth: 2.2, maxLevel: 10, effect: { kind: 'speed', perLevel: 0.12 } },
    { id: 'mochila', name: 'Mochila de brasas', flavor: 'Caben más brasas en cada viaje.', baseCost: 60, costGrowth: 1.8, maxLevel: null, effect: { kind: 'embers', perLevel: 0.25 } },
    { id: 'iman', name: 'Imán de brasas', flavor: 'Las brasas vienen solas hacia el cerdito.', baseCost: 120, costGrowth: 2.6, maxLevel: 5, effect: { kind: 'magnet', perLevel: 8 } },
    { id: 'alas', name: 'Alas de murciélago', flavor: 'Un salto más en el aire, para los que vuelan alto.', baseCost: 400, costGrowth: 12, maxLevel: 2, effect: { kind: 'jumps', perLevel: 1 } },
  ],
  soulUpgrades: [
    { id: 'almas-brasas', name: 'Brasas del más allá', flavor: 'Todo arde un poco más.', baseCost: 10, costGrowth: 1.6, maxLevel: null, effect: { kind: 'embers', perLevel: 0.25 } },
    { id: 'almas-almas', name: 'Coleccionista de almas', flavor: 'Cada monstruo deja algo más de sí.', baseCost: 15, costGrowth: 1.7, maxLevel: null, effect: { kind: 'souls', perLevel: 0.2 } },
    { id: 'almas-furia', name: 'Furia larga', flavor: 'La furia dura más.', baseCost: 20, costGrowth: 2, maxLevel: 5, effect: { kind: 'rageSeconds', perLevel: 3 } },
    { id: 'almas-cofres', name: 'Olfato de cofres', flavor: 'Aparecen más cofres por el camino.', baseCost: 25, costGrowth: 2, maxLevel: 4, effect: { kind: 'chests', perLevel: 0.5 } },
    { id: 'almas-inicio', name: 'Bolsillo de brasas', flavor: 'Al renacer empiezas con algo de brasas.', baseCost: 30, costGrowth: 2.2, maxLevel: 6, effect: { kind: 'startEmbers', perLevel: 4 } },
    { id: 'almas-jefe', name: 'Paciencia de dragón', flavor: 'El jefe espera más antes de irse.', baseCost: 40, costGrowth: 2, maxLevel: 4, effect: { kind: 'bossSeconds', perLevel: 5 } },
    { id: 'evolucion-babosa', name: 'Evolucionar babosa', flavor: 'Babosas de magma: más grandes y más generosas.', baseCost: 20, costGrowth: 1, maxLevel: 1, effect: { kind: 'evolve', monster: 'babosa' } },
    { id: 'evolucion-murcielago', name: 'Evolucionar murciélago', flavor: 'Murciélagos vampiro con brasas en las alas.', baseCost: 40, costGrowth: 1, maxLevel: 1, effect: { kind: 'evolve', monster: 'murcielago' } },
    { id: 'evolucion-seta', name: 'Evolucionar seta', flavor: 'Setas reina, con corona de esporas.', baseCost: 80, costGrowth: 1, maxLevel: 1, effect: { kind: 'evolve', monster: 'seta' } },
    { id: 'evolucion-arana', name: 'Evolucionar araña', flavor: 'Arañas de amatista, rarísimas.', baseCost: 150, costGrowth: 1, maxLevel: 1, effect: { kind: 'evolve', monster: 'arana' } },
    { id: 'evolucion-golem', name: 'Evolucionar gólem', flavor: 'Gólems de oro: lentos, pero valen un tesoro.', baseCost: 300, costGrowth: 1, maxLevel: 1, effect: { kind: 'evolve', monster: 'golem' } },
  ],
  soulsDivisor: 2000,
  soulEmbers: 0.1,
  soulProd: 0.01,
};
