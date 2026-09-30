// El Valle — mundo inicial, mecánica clásica. Ver docs/01-diseno-juego.md §7 y docs/03-economia.md §8.
//
// NOTA (hito 1): solo 2 cerditos, sin mejoras ni ventajas todavía; el resto llega en el hito 2,
// cuando este fichero se completa con los 8 cerditos y se convierte en la fuente de verdad que
// también usará tools/sim/content.ts (adaptador).

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
    {
      id: 'lechon',
      name: 'Lechón',
      flavor: 'Pequeño, redondo y convencido de que todo es comida.',
      baseCost: 10,
      baseProd: 0.5,
    },
    {
      id: 'cerdita-rosa',
      name: 'Cerdita rosa',
      flavor: 'Rosa de verdad, no rosa de postal.',
      baseCost: 110,
      baseProd: 2.75,
    },
  ],
  genUpgrades: null,
  globalUpgrades: [],
  prestige: { e0: 200000, exponent: 1 / 3, perPluma: 0.05 },
  unlock: null,
  flavor: 'La primera granja. Aquí se aprende a criar cerditos.',
};
