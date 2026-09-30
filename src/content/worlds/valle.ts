// El Valle — mundo inicial, mecánica clásica. Ver docs/01-diseno-juego.md §7 y docs/03-economia.md §8.

import type { WorldDef } from '../types.ts';

export const valle: WorldDef = {
  id: 'valle',
  name: 'El Valle',
  currency: 'Bellotas',
  prestigeCurrency: 'Plumas del Valle',
  mechanic: 'classic',
  costGrowth: 1.15,
  startCurrency: 15,
  generators: [
    { id: 'lechon', name: 'Lechón', flavor: 'Pequeño, redondo y convencido de que todo es comida.', baseCost: 10, baseProd: 0.5 },
    { id: 'cerdita-rosa', name: 'Cerdita rosa', flavor: 'Rosa de verdad, no rosa de postal.', baseCost: 110, baseProd: 2.75 },
    { id: 'duroc', name: 'Duroc', flavor: 'Ancho de hombros y aún más ancho de apetito.', baseCost: 1210, baseProd: 15.1 },
    { id: 'pietrain', name: 'Pietrain', flavor: 'Musculoso pero con cara de buena persona.', baseCost: 13300, baseProd: 83.2 },
    { id: 'berkshire', name: 'Berkshire', flavor: 'Negro con calcetines blancos, como quien no quiere la cosa.', baseCost: 146000, baseProd: 458 },
    { id: 'mangalica', name: 'Mangalica', flavor: 'Rizado como una oveja, testarudo como un cerdo.', baseCost: 1.61e6, baseProd: 2520 },
    { id: 'iberico', name: 'Ibérico', flavor: 'Camina despacio porque sabe que tiene tiempo.', baseCost: 1.77e7, baseProd: 13800 },
    { id: 'gran-blanco', name: 'Gran Blanco', flavor: 'El más grande del corral, y lo sabe.', baseCost: 1.95e8, baseProd: 76100 },
  ],
  genUpgrades: { counts: [10, 25, 50, 100, 150, 200, 300, 400], mult: 2, costFactor: 5 },
  globalUpgrades: [
    { id: 'paja-fresca', name: 'Paja fresca', flavor: 'Recién cortada, huele todavía a verano.', cost: 5000, mult: 1.5 },
    { id: 'charca-de-barro', name: 'Charca de barro', flavor: 'El spa original, antes de que existiera el Balneario.', cost: 750000, mult: 1.5 },
    { id: 'rascador-de-roble', name: 'Rascador de roble', flavor: 'Ni el árbol se libra del cariño de los cerditos.', cost: 1.13e8, mult: 1.5 },
    { id: 'acordeon-del-abuelo', name: 'Acordeón del abuelo', flavor: 'Nadie sabe tocarlo bien, pero anima el corral igual.', cost: 1.69e10, mult: 1.5 },
    { id: 'huerto-de-manzanos', name: 'Huerto de manzanos', flavor: 'Las manzanas caídas nunca duran mucho.', cost: 2.53e12, mult: 1.5 },
    { id: 'siesta-a-la-sombra', name: 'Siesta a la sombra', flavor: 'Las mejores ideas llegan a las cuatro de la tarde.', cost: 3.8e14, mult: 1.5 },
    { id: 'fiesta-de-san-anton', name: 'Fiesta de San Antón', flavor: 'Una vez al año, toda la granja se engalana.', cost: 5.7e16, mult: 1.5 },
    { id: 'pocilga-con-vistas', name: 'Pocilga con vistas', flavor: 'Vistas al valle entero, aunque ellos prefieran mirar al suelo.', cost: 8.54e18, mult: 1.5 },
  ],
  prestige: { e0: 200000, exponent: 1 / 3, perPluma: 0.05 },
  unlock: null,
  flavor: 'La primera granja. Aquí se aprende a criar cerditos.',
};
