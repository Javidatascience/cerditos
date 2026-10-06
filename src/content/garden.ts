// El Jardín: parcelas donde crecen flores muy despacio (horas de reloj real, también con el juego
// cerrado). Cada flor distinta que recoges da un bono pasivo permanente; si sale brillante (10 %,
// siempre visible), su bono vale el doble. Se abre al ganar cierta cantidad de monedas en total.

import type { GardenDef } from './types.ts';

export const GARDEN: GardenDef = {
  plots: 4,
  shinyChance: 0.1,
  /** Una semilla cuesta estos segundos de ingresos base (mínimo `minSeedCost`). */
  seedSeconds: 300,
  minSeedCost: 25,
  unlockLifetime: 1e6,
  flowers: [
    { id: 'margarita', name: 'Margarita', emoji: '🌼', flavor: 'La primera de todas, humilde y terca.', growHours: 1, effect: { kind: 'prodMult', value: 1.02 } },
    { id: 'tulipan', name: 'Tulipán', emoji: '🌷', flavor: 'Hace cosquillas en las pezuñas al picar.', growHours: 2, effect: { kind: 'tapMult', value: 0.1 } },
    { id: 'girasol', name: 'Girasol', emoji: '🌻', flavor: 'Siempre mira hacia la mina.', growHours: 4, effect: { kind: 'prodMult', value: 1.03 } },
    { id: 'rosa', name: 'Rosa', emoji: '🌹', flavor: 'Con espinas, pero regatea muy bien.', growHours: 6, effect: { kind: 'costMult', value: 0.98 } },
    { id: 'lavanda', name: 'Lavanda', emoji: '🪻', flavor: 'Huele tan bien que no se puede parar de picar.', growHours: 8, effect: { kind: 'momentumMax', value: 0.25 } },
    { id: 'loto', name: 'Loto', emoji: '🪷', flavor: 'Flota sobre el charco de barro.', growHours: 12, effect: { kind: 'prodMult', value: 1.04 } },
    { id: 'hibisco', name: 'Hibisco', emoji: '🌺', flavor: 'Agranda la cesta sin que nadie lo note.', growHours: 16, effect: { kind: 'basketSeconds', value: 1800 } },
    { id: 'flor-de-luna', name: 'Flor de luna', emoji: '🌸', flavor: 'Solo abre de noche y trabaja mientras duermes.', growHours: 24, effect: { kind: 'offlineHours', value: 0.5 } },
  ],
};
