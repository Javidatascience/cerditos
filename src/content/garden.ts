// El Jardín (a lo Cookie Clicker): una cuadrícula donde plantas flores gratis. Las comunes crecen en
// minutos y las raras en horas (tiempo real, también con el juego cerrado). Al recogerlas dan un
// bono TEMPORAL; si salen brillantes (10 %, siempre visible) dura el doble. Dos flores vecinas
// maduras pueden cruzarse en una casilla vacía y dar una flor nueva (la receta se ve en la lista).
// Las comunes dan poco pero se aprovechan sin parar; las raras tardan horas y dan mucho más.

import type { GardenDef } from './types.ts';

const MIN = 60;
const HOUR = 3600;

export const GARDEN: GardenDef = {
  cols: 5,
  rows: 5,
  shinyChance: 0.1,
  unlockPlumas: 5,
  mutationSeconds: 30,
  mutationChance: 0.25,
  flowers: [
    { id: 'margarita', name: 'Margarita', emoji: '🌼', flavor: 'La primera de todas, humilde y terca.', growSeconds: 1 * MIN, effect: { kind: 'prodMult', value: 1.1, seconds: 30 }, recipe: null },
    { id: 'tulipan', name: 'Tulipán', emoji: '🌷', flavor: 'Hace cosquillas en las pezuñas al picar.', growSeconds: 90, effect: { kind: 'tapMult', value: 0.5, seconds: 30 }, recipe: null },
    { id: 'girasol', name: 'Girasol', emoji: '🌻', flavor: 'Siempre mira hacia la mina.', growSeconds: 5 * MIN, effect: { kind: 'prodMult', value: 1.5, seconds: 45 }, recipe: ['margarita', 'margarita'] },
    { id: 'rosa', name: 'Rosa', emoji: '🌹', flavor: 'Con espinas, pero regatea muy bien.', growSeconds: 10 * MIN, effect: { kind: 'costMult', value: 0.8, seconds: 60 }, recipe: ['margarita', 'tulipan'] },
    { id: 'lavanda', name: 'Lavanda', emoji: '🪻', flavor: 'Huele tan bien que no se puede parar de picar.', growSeconds: 20 * MIN, effect: { kind: 'momentumMax', value: 0.25, seconds: 120 }, recipe: ['tulipan', 'tulipan'] },
    { id: 'loto', name: 'Loto', emoji: '🪷', flavor: 'Flota sobre el charco de barro.', growSeconds: 1 * HOUR, effect: { kind: 'prodMult', value: 2, seconds: 60 }, recipe: ['girasol', 'rosa'] },
    { id: 'hibisco', name: 'Hibisco', emoji: '🌺', flavor: 'Trae una cesta llena de monedas.', growSeconds: 2 * HOUR, effect: { kind: 'coins', value: 1, seconds: 5 * MIN }, recipe: ['rosa', 'lavanda'] },
    { id: 'orquidea', name: 'Orquídea', emoji: '💐', flavor: 'Delicada, pero pica por tres.', growSeconds: 3 * HOUR, effect: { kind: 'tapMult', value: 3, seconds: 60 }, recipe: ['lavanda', 'girasol'] },
    { id: 'flor-de-luna', name: 'Flor de luna', emoji: '🌸', flavor: 'Solo abre de noche y trabaja mientras duermes.', growSeconds: 6 * HOUR, effect: { kind: 'prodMult', value: 3, seconds: 90 }, recipe: ['loto', 'hibisco'] },
    { id: 'flor-de-oro', name: 'Flor de oro', emoji: '🏵️', flavor: 'La leyenda dice que el cerdito la sueña.', growSeconds: 12 * HOUR, effect: { kind: 'coins', value: 1, seconds: 30 * MIN }, recipe: ['flor-de-luna', 'orquidea'] },
  ],
};
