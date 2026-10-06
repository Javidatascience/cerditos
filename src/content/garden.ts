// El Jardín: parcelas donde crecen flores muy despacio (horas de reloj real, también con el juego
// cerrado). Plantar es gratis. Al recogerla, cada flor da un bono TEMPORAL (p. ej. ×1,5 un minuto); si
// sale brillante (10 %, siempre visible) dura el doble. Se abre al ganar cierta cantidad de monedas.

import type { GardenDef } from './types.ts';

export const GARDEN: GardenDef = {
  plots: 4,
  shinyChance: 0.1,
  unlockLifetime: 1e6,
  flowers: [
    { id: 'margarita', name: 'Margarita', emoji: '🌼', flavor: 'La primera de todas, humilde y terca.', growHours: 1, effect: { kind: 'prodMult', value: 1.5, seconds: 60 } },
    { id: 'tulipan', name: 'Tulipán', emoji: '🌷', flavor: 'Hace cosquillas en las pezuñas al picar.', growHours: 2, effect: { kind: 'tapMult', value: 1, seconds: 90 } },
    { id: 'girasol', name: 'Girasol', emoji: '🌻', flavor: 'Siempre mira hacia la mina.', growHours: 4, effect: { kind: 'prodMult', value: 2, seconds: 60 } },
    { id: 'rosa', name: 'Rosa', emoji: '🌹', flavor: 'Con espinas, pero regatea muy bien.', growHours: 6, effect: { kind: 'costMult', value: 0.7, seconds: 60 } },
    { id: 'lavanda', name: 'Lavanda', emoji: '🪻', flavor: 'Huele tan bien que no se puede parar de picar.', growHours: 8, effect: { kind: 'momentumMax', value: 1, seconds: 120 } },
    { id: 'loto', name: 'Loto', emoji: '🪷', flavor: 'Flota sobre el charco de barro.', growHours: 12, effect: { kind: 'prodMult', value: 3, seconds: 45 } },
    { id: 'hibisco', name: 'Hibisco', emoji: '🌺', flavor: 'Trae una cesta llena de monedas.', growHours: 16, effect: { kind: 'coins', value: 1, seconds: 1200 } },
    { id: 'flor-de-luna', name: 'Flor de luna', emoji: '🌸', flavor: 'Solo abre de noche y trabaja mientras duermes.', growHours: 24, effect: { kind: 'prodMult', value: 4, seconds: 90 } },
  ],
};
