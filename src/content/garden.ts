// El Jardín (a lo Cookie Clicker): una cuadrícula donde plantas flores gratis. Las comunes crecen en
// minutos y las raras en horas (tiempo real, también con el juego cerrado). Al recogerlas dan un
// bono TEMPORAL (o monedas o bellotas de golpe); si salen brillantes (10 %, siempre visible) dan el doble.
// Cruces: cuando una flor madura y tiene al lado madura la otra flor de una receta, tira un dado
// (`chance` + bonos) y, si sale, brota la flor nueva en una casilla vacía contigua. Si no hay cruce,
// a veces brota un hierbajo, que también sirve para algunas recetas.

import type { GardenDef } from './types.ts';

const MIN = 60;
const HOUR = 3600;

export const GARDEN: GardenDef = {
  cols: 5,
  rows: 5,
  shinyChance: 0.1,
  unlockPlumas: 1,
  wildChance: 0.05,
  flowers: [
    // De base: se plantan desde el principio
    { id: 'margarita', name: 'Margarita', emoji: '🌼', flavor: 'La primera de todas, humilde y terca.', growSeconds: 1 * MIN, effect: { kind: 'prodMult', value: 1.1, seconds: 30 }, recipe: null },
    { id: 'tulipan', name: 'Tulipán', emoji: '🌷', flavor: 'Hace cosquillas en las pezuñas al picar.', growSeconds: 90, effect: { kind: 'tapMult', value: 0.5, seconds: 30 }, recipe: null },
    // Silvestre: brota sola
    { id: 'hierbajo', name: 'Hierbajo', emoji: '🌿', flavor: 'Nadie lo ha plantado, pero ahí está. Sirve para más de lo que parece.', growSeconds: 2 * MIN, effect: { kind: 'coins', value: 1, seconds: 20 }, recipe: null, wild: true },
    // Cruces fáciles (minutos)
    { id: 'girasol', name: 'Girasol', emoji: '🌻', flavor: 'Siempre mira hacia la mina.', growSeconds: 5 * MIN, effect: { kind: 'prodMult', value: 1.5, seconds: 45 }, recipe: ['margarita', 'margarita'], chance: 0.2 },
    { id: 'rosa', name: 'Rosa', emoji: '🌹', flavor: 'Con espinas, pero regatea muy bien.', growSeconds: 10 * MIN, effect: { kind: 'costMult', value: 0.8, seconds: 60 }, recipe: ['margarita', 'tulipan'], chance: 0.2 },
    { id: 'lavanda', name: 'Lavanda', emoji: '🪻', flavor: 'Huele tan bien que no se puede parar de picar.', growSeconds: 20 * MIN, effect: { kind: 'momentumMax', value: 0.25, seconds: 120 }, recipe: ['tulipan', 'tulipan'], chance: 0.2 },
    { id: 'trebol', name: 'Trébol', emoji: '☘️', flavor: 'Debajo siempre hay alguna bellota olvidada.', growSeconds: 3 * MIN, effect: { kind: 'acorns', value: 1, seconds: 0 }, recipe: ['margarita', 'hierbajo'], chance: 0.15 },
    { id: 'diente-de-leon', name: 'Diente de león', emoji: '🌬️', flavor: 'Se sopla y salen volando las ganas de picar.', growSeconds: 4 * MIN, effect: { kind: 'momentumMax', value: 0.15, seconds: 90 }, recipe: ['tulipan', 'hierbajo'], chance: 0.15 },
    { id: 'campanilla', name: 'Campanilla', emoji: '🔔', flavor: 'Suena a cada golpe de pico.', growSeconds: 15 * MIN, effect: { kind: 'tapMult', value: 1, seconds: 90 }, recipe: ['margarita', 'lavanda'], chance: 0.12 },
    { id: 'cactus', name: 'Cactus', emoji: '🌵', flavor: 'Pincha a los vendedores hasta que bajan el precio.', growSeconds: 30 * MIN, effect: { kind: 'costMult', value: 0.85, seconds: 120 }, recipe: ['hierbajo', 'hierbajo'], chance: 0.12 },
    { id: 'amapola', name: 'Amapola', emoji: '🥀', flavor: 'Roja como las mejillas del cerdito al picar.', growSeconds: 30 * MIN, effect: { kind: 'prodMult', value: 1.5, seconds: 120 }, recipe: ['rosa', 'rosa'], chance: 0.1 },
    // Cruces medios (una o pocas horas)
    { id: 'loto', name: 'Loto', emoji: '🪷', flavor: 'Flota sobre el charco de barro.', growSeconds: 1 * HOUR, effect: { kind: 'prodMult', value: 2, seconds: 60 }, recipe: ['girasol', 'rosa'], chance: 0.1 },
    { id: 'cardo', name: 'Cardo', emoji: '🌾', flavor: 'Con pinchos y con carácter: pica por dos.', growSeconds: 1 * HOUR, effect: { kind: 'tapMult', value: 2, seconds: 120 }, recipe: ['cactus', 'rosa'], chance: 0.08 },
    { id: 'hibisco', name: 'Hibisco', emoji: '🌺', flavor: 'Trae una cesta llena de monedas.', growSeconds: 2 * HOUR, effect: { kind: 'coins', value: 1, seconds: 5 * MIN }, recipe: ['rosa', 'lavanda'], chance: 0.08 },
    { id: 'trebol-de-cuatro', name: 'Trébol de cuatro hojas', emoji: '🍀', flavor: 'Trae suerte, y bellotas.', growSeconds: 2 * HOUR, effect: { kind: 'acorns', value: 4, seconds: 0 }, recipe: ['trebol', 'trebol'], chance: 0.06 },
    { id: 'orquidea', name: 'Orquídea', emoji: '💐', flavor: 'Delicada, pero pica por tres.', growSeconds: 3 * HOUR, effect: { kind: 'tapMult', value: 3, seconds: 60 }, recipe: ['lavanda', 'girasol'], chance: 0.06 },
    // Cruces raros (muchas horas)
    { id: 'nenufar', name: 'Nenúfar', emoji: '🪷', flavor: 'Una cama de agua para no dejar de picar.', growSeconds: 4 * HOUR, effect: { kind: 'momentumMax', value: 0.5, seconds: 5 * MIN }, recipe: ['loto', 'campanilla'], chance: 0.05 },
    { id: 'flor-de-luna', name: 'Flor de luna', emoji: '🌸', flavor: 'Solo abre de noche y trabaja mientras duermes.', growSeconds: 6 * HOUR, effect: { kind: 'prodMult', value: 3, seconds: 90 }, recipe: ['loto', 'hibisco'], chance: 0.05 },
    { id: 'seta-luminosa', name: 'Seta luminosa', emoji: '🍄', flavor: 'Brilla en la oscuridad y esconde un tesoro de bellotas.', growSeconds: 8 * HOUR, effect: { kind: 'acorns', value: 10, seconds: 0 }, recipe: ['hierbajo', 'flor-de-luna'], chance: 0.04 },
    { id: 'flor-de-oro', name: 'Flor de oro', emoji: '🏵️', flavor: 'La leyenda dice que el cerdito la sueña.', growSeconds: 12 * HOUR, effect: { kind: 'coins', value: 1, seconds: 30 * MIN }, recipe: ['flor-de-luna', 'orquidea'], chance: 0.03 },
  ],
};
