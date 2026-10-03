// El Balneario — mecánica de calma: los cerditos rinden hasta ×4 cuando nadie los molesta;
// comprar reduce la calma a la mitad. Ver docs/01-diseno-juego.md §7 y docs/03-economia.md §3.4 y §8.

import type { WorldDef } from '../types.ts';

export const balneario: WorldDef = {
  id: 'balneario',
  name: 'El Balneario',
  currency: 'Pompas',
  prestigeCurrency: 'Plumas del Balneario',
  mechanic: 'calm',
  costGrowth: 1.18,
  startCurrency: 1000,
  generators: [
    { id: 'banista', name: 'Bañista', flavor: 'Entra despacio, sale flotando de gusto.', baseCost: 1000, baseProd: 5 },
    { id: 'cerdita-del-barro', name: 'Cerdita del barro', flavor: 'El barro es su segundo pelaje.', baseCost: 11000, baseProd: 27.5 },
    { id: 'masajista', name: 'Masajista', flavor: 'Sabe encontrar el nudo justo en la espalda.', baseCost: 121000, baseProd: 151 },
    { id: 'socorrista', name: 'Socorrista', flavor: 'Vigila la charca sin perder la calma nunca.', baseCost: 1.33e6, baseProd: 832 },
    { id: 'termalista', name: 'Termalista', flavor: 'Conoce la temperatura perfecta de cada poza.', baseCost: 1.46e7, baseProd: 4580 },
    { id: 'maestra-de-sales', name: 'Maestra de sales', flavor: 'Prepara las sales con una receta que no comparte.', baseCost: 1.61e8, baseProd: 25200 },
    { id: 'director-del-spa', name: 'Director del spa', flavor: 'Organiza los turnos para que nadie tenga prisa.', baseCost: 1.77e9, baseProd: 138000 },
    { id: 'cerdo-zen', name: 'Cerdo zen', flavor: 'Ha alcanzado una paz que el resto todavía busca.', baseCost: 1.95e10, baseProd: 761000 },
  ],
  genUpgrades: { counts: [10, 25, 50, 100, 150, 200], mult: 2, costFactor: 5 },
  globalUpgrades: [
    { id: 'toallas-calentitas', name: 'Toallas calentitas', flavor: 'Recién salidas del radiador, listas para envolver.', cost: 500000, mult: 1.5 },
    { id: 'barro-volcanico', name: 'Barro volcánico', flavor: 'Importado de muy lejos, o eso dicen.', cost: 1.5e8, mult: 1.5 },
    { id: 'pepinos-en-los-ojos', name: 'Pepinos en los ojos', flavor: 'Frescos, redondos, y sorprendentemente relajantes.', cost: 4.5e10, mult: 1.5 },
    { id: 'hilo-musical', name: 'Hilo musical', flavor: 'Nunca suena la misma canción dos veces seguidas.', cost: 1.35e13, mult: 1.5 },
    { id: 'albornoces-bordados', name: 'Albornoces bordados', flavor: 'Cada cerdito tiene el suyo, con sus iniciales.', cost: 4.05e15, mult: 1.5 },
    { id: 'aromas-de-lavanda', name: 'Aromas de lavanda', flavor: 'Se huele desde la entrada del Balneario.', cost: 1.22e18, mult: 1.5 },
  ],
  prestige: { e0: 1e6, exponent: 0.28, perPluma: 0.05 },
  unlock: { world: 'huerta', gen: 'abuelo-del-huerto', count: 10 },
  calm: { maxBonus: 3, rampSeconds: 1800, penalty: 0.5, windowSeconds: 60 },
  flavor: 'El sitio donde hasta los cerditos más nerviosos aprenden a no hacer nada.',
};
