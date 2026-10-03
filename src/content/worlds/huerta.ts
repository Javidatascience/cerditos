// La Huerta — mecánica de armonía: sin mejoras por cerdito; la producción se multiplica
// según el mínimo de unidades entre los 8 tipos ("filas completas"). Ver docs/01-diseno-juego.md
// §7 y docs/03-economia.md §3.3 y §8.

import type { WorldDef } from '../types.ts';

export const huerta: WorldDef = {
  id: 'huerta',
  name: 'La Huerta',
  currency: 'Calabazas',
  prestigeCurrency: 'Plumas de la Huerta',
  mechanic: 'harmony',
  costGrowth: 1.14,
  startCurrency: 100,
  generators: [
    { id: 'hortelana', name: 'Hortelana', flavor: 'Sabe qué planta va en cada surco sin mirar el cartel.', baseCost: 100, baseProd: 1 },
    { id: 'regador', name: 'Regador', flavor: 'Nunca deja una planta sedienta.', baseCost: 350, baseProd: 2.9 },
    { id: 'escardadora', name: 'Escardadora', flavor: 'Las malas hierbas no tienen nada que hacer.', baseCost: 1230, baseProd: 8.41 },
    { id: 'cuidador-de-tomates', name: 'Cuidador de tomates', flavor: 'Habla con las tomateras. Ellas responden con tomates.', baseCost: 4290, baseProd: 24.4 },
    { id: 'pastora-de-gallinas', name: 'Pastora de gallinas', flavor: 'Las gallinas la siguen como si fuera una más.', baseCost: 15000, baseProd: 70.7 },
    { id: 'apicultor', name: 'Apicultor', flavor: 'Las abejas le tienen tanto respeto como cariño.', baseCost: 52500, baseProd: 205 },
    { id: 'jardinera-jefa', name: 'Jardinera jefa', flavor: 'Decide qué se planta y cuándo, sin discusión.', baseCost: 184000, baseProd: 595 },
    { id: 'abuelo-del-huerto', name: 'Abuelo del huerto', flavor: 'Lleva cultivando esta tierra más años que nadie recuerda.', baseCost: 643000, baseProd: 1720 },
  ],
  genUpgrades: null,
  globalUpgrades: [
    { id: 'semillas-antiguas', name: 'Semillas antiguas', flavor: 'Vienen de la primera huerta que hubo aquí.', cost: 20000, mult: 1.5 },
    { id: 'compost-casero', name: 'Compost casero', flavor: 'Nada se tira si se puede volver a plantar.', cost: 2e6, mult: 1.5 },
    { id: 'espantapajaros-amable', name: 'Espantapájaros amable', flavor: 'Saluda a los pájaros antes de pedirles que se vayan.', cost: 2e8, mult: 1.5 },
    { id: 'riego-por-goteo', name: 'Riego por goteo', flavor: 'Ni una gota se desperdicia.', cost: 2e10, mult: 1.5 },
    { id: 'invernadero', name: 'Invernadero', flavor: 'Aquí siempre es primavera, llueva o nieve fuera.', cost: 2e12, mult: 1.5 },
    { id: 'calendario-lunar', name: 'Calendario lunar', flavor: 'Se planta según la luna, por si acaso.', cost: 2e14, mult: 1.5 },
    { id: 'abejas-amigas', name: 'Abejas amigas', flavor: 'Vienen todos los días, aunque nadie las invite.', cost: 2e16, mult: 1.5 },
    { id: 'fiesta-de-la-cosecha', name: 'Fiesta de la cosecha', flavor: 'El día en que se recoge todo lo sembrado.', cost: 2e18, mult: 1.5 },
  ],
  prestige: { e0: 1e6, exponent: 0.3, perPluma: 0.05 },
  unlock: { world: 'bosque', gen: 'espiritu-del-bosque', count: 10 },
  harmony: { perLevel: 0.02, thresholds: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400], mult: 2 },
  flavor: 'Ocho parcelas que solo dan su mejor fruto si se cuidan todas por igual.',
};
