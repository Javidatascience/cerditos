// El Bosque — mecánica de cadena: solo las Buscadoras producen trufas; cada nivel superior
// produce cerditos del nivel inferior. Ver docs/01-diseno-juego.md §7 y docs/03-economia.md §3.2 y §8.

import type { WorldDef } from '../types.ts';

export const bosque: WorldDef = {
  id: 'bosque',
  name: 'El Bosque',
  currency: 'Trufas',
  prestigeCurrency: 'Plumas del Bosque',
  mechanic: 'chain',
  costGrowth: 1.2, // por defecto; cada cerdito tiene su propio crecimiento (más abajo)
  startCurrency: 60,
  generators: [
    { id: 'buscadora', name: 'Buscadora', flavor: 'Hocico al suelo, cola al viento, trufa a la vista.', baseCost: 50, baseProd: 1, costGrowth: 1.15 },
    { id: 'madre-trufera', name: 'Madre trufera', flavor: 'Enseña a las buscadoras todo lo que sabe, que es mucho.', baseCost: 5000, baseProd: 0.01, costGrowth: 1.25 },
    { id: 'abuela-sabia', name: 'Abuela sabia', flavor: 'Ha encontrado más trufas de las que puede contar.', baseCost: 500000, baseProd: 0.005, costGrowth: 1.35 },
    { id: 'clan-del-roble', name: 'Clan del roble', flavor: 'Una familia entera bajo el mismo roble centenario.', baseCost: 5e7, baseProd: 0.0025, costGrowth: 1.45 },
    { id: 'espiritu-del-bosque', name: 'Espíritu del bosque', flavor: 'Nadie la ha visto entera, solo su sombra entre los árboles.', baseCost: 5e9, baseProd: 0.00125, costGrowth: 1.55 },
  ],
  genUpgrades: { counts: [10, 25, 50, 75, 100, 150], mult: 2, costFactor: 5 },
  globalUpgrades: [
    { id: 'hocico-entrenado', name: 'Hocico entrenado', flavor: 'Distingue una trufa de una piedra a diez metros.', cost: 10000, mult: 1.5 },
    { id: 'mapa-de-robles', name: 'Mapa de robles', flavor: 'Marca cada roble donde ya se ha buscado.', cost: 1e7, mult: 1.5 },
    { id: 'cesta-de-mimbre', name: 'Cesta de mimbre', flavor: 'Cabe una trufa más de las que debería.', cost: 1e10, mult: 1.5 },
    { id: 'linterna-de-luciernagas', name: 'Linterna de luciérnagas', flavor: 'Ilumina sin asustar a nadie.', cost: 1e13, mult: 1.5 },
    { id: 'cancion-del-bosque', name: 'Canción del bosque', flavor: 'Los árboles la conocen mejor que las buscadoras.', cost: 1e16, mult: 1.5 },
    { id: 'musgo-mullido', name: 'Musgo mullido', flavor: 'El mejor sitio para dejar descansar las patas.', cost: 1e19, mult: 1.5 },
  ],
  prestige: { e0: 1e8, exponent: 0.25, perPluma: 0.05 },
  unlock: { world: 'valle', plumasTotal: 60000 },
  flavor: 'Un bosque tranquilo donde las trufas se esconden bien y las buscadoras nunca se rinden.',
};
