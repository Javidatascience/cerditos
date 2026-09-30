// Colección: variedades de cerdito (deterministas) y sets. Ver docs/01-diseno-juego.md §8 y
// docs/03-economia.md §7 y §8 (requisitos y días en que se alcanzan en la simulación).

import type { Bonus, SetDef, VarietyDef } from './types.ts';
import type { WorldId } from '../core/state.ts';

export const SETS: SetDef[] = [
  { id: 'valle', name: 'Razas del Valle', bonus: { kind: 'prod', world: 'valle', mult: 1.25 } },
  { id: 'bosque', name: 'Familia del Bosque', bonus: { kind: 'prod', world: 'bosque', mult: 1.25 } },
  { id: 'huerta', name: 'Amigos de la Huerta', bonus: { kind: 'prod', world: 'huerta', mult: 1.25 } },
  { id: 'balneario', name: 'Clientes del Balneario', bonus: { kind: 'prod', world: 'balneario', mult: 1.25 } },
  { id: 'curiosos', name: 'Cerditos curiosos', bonus: { kind: 'cost', world: 'all', mult: 0.95 } },
  { id: 'cruces', name: 'Cruces', bonus: { kind: 'prod', world: 'all', mult: 1.1 } },
  { id: 'leyendas', name: 'Leyendas porcinas', bonus: { kind: 'prod', world: 'all', mult: 1.25 } },
];

const own = (world: WorldId, mult = 1.05): Bonus => ({ kind: 'prod', world, mult });
const all = (mult: number): Bonus => ({ kind: 'prod', world: 'all', mult });

export const VARIETIES: VarietyDef[] = [
  // Razas del Valle
  {
    id: 'lechon-manchado',
    name: 'Lechón manchado',
    flavor: 'Cada mancha cuenta una historia distinta.',
    set: 'valle',
    requires: [{ kind: 'genCount', world: 'valle', gen: 'lechon', count: 100 }],
    bonus: own('valle'),
  },
  {
    id: 'rosa-de-concurso',
    name: 'Rosa de concurso',
    flavor: 'Ganó la cinta azul en la feria de otoño.',
    set: 'valle',
    requires: [{ kind: 'genCount', world: 'valle', gen: 'cerdita-rosa', count: 200 }],
    bonus: own('valle'),
  },
  {
    id: 'duroc-pelirrojo',
    name: 'Duroc pelirrojo',
    flavor: 'Pelirrojo y orgulloso de serlo.',
    set: 'valle',
    requires: [{ kind: 'genCount', world: 'valle', gen: 'duroc', count: 250 }],
    bonus: own('valle'),
  },
  {
    id: 'iberico-de-bellota',
    name: 'Ibérico de bellota',
    flavor: 'Solo come lo mejor, y se nota.',
    set: 'valle',
    requires: [{ kind: 'genCount', world: 'valle', gen: 'iberico', count: 245 }],
    bonus: own('valle'),
  },
  // Familia del Bosque
  {
    id: 'buscadora-veterana',
    name: 'Buscadora veterana',
    flavor: 'Ya no se pierde en el bosque; el bosque se pierde en ella.',
    set: 'bosque',
    requires: [{ kind: 'ascensions', world: 'bosque', count: 1 }],
    bonus: own('bosque'),
  },
  {
    id: 'jabato-curioso',
    name: 'Jabato curioso',
    flavor: 'Mete el hocico en todo lo que brilla.',
    set: 'bosque',
    requires: [{ kind: 'genCount', world: 'bosque', gen: 'abuela-sabia', count: 150 }],
    bonus: own('bosque'),
  },
  {
    id: 'cerdita-seta',
    name: 'Cerdita con sombrero de seta',
    flavor: 'El sombrero es real. La seta, discutible.',
    set: 'bosque',
    requires: [{ kind: 'lifetime', world: 'bosque', amount: 1e33 }],
    bonus: own('bosque'),
  },
  {
    id: 'madre-del-bosque',
    name: 'Madre del bosque',
    flavor: 'Todas las trufas del bosque le deben algo.',
    set: 'bosque',
    requires: [{ kind: 'plumasTotal', world: 'bosque', count: 5e6 }],
    bonus: own('bosque'),
  },
  // Amigos de la Huerta
  {
    id: 'calabacero',
    name: 'Calabacero',
    flavor: 'Cultiva calabazas más grandes que él.',
    set: 'huerta',
    requires: [{ kind: 'harmony', world: 'huerta', count: 25 }],
    bonus: own('huerta'),
  },
  {
    id: 'espantapajaros',
    name: 'Cerdo espantapájaros',
    flavor: 'No espanta a nadie, pero lo intenta con ganas.',
    set: 'huerta',
    requires: [{ kind: 'harmony', world: 'huerta', count: 150 }],
    bonus: own('huerta'),
  },
  {
    id: 'cerdita-jardinera',
    name: 'Cerdita jardinera',
    flavor: 'Sabe el nombre de cada planta del huerto.',
    set: 'huerta',
    requires: [{ kind: 'ascensions', world: 'huerta', count: 10 }],
    bonus: own('huerta'),
  },
  {
    id: 'gran-calabaza',
    name: 'Gran calabaza (con cerdito dentro)',
    flavor: 'Nadie sabe cómo entró. Nadie sabe cómo sale.',
    set: 'huerta',
    requires: [{ kind: 'harmony', world: 'huerta', count: 250 }],
    bonus: own('huerta'),
  },
  // Clientes del Balneario
  {
    id: 'cerdito-toalla',
    name: 'Cerdito con toalla',
    flavor: 'Recién salido del barro, oliendo a lavanda.',
    set: 'balneario',
    requires: [{ kind: 'ascensions', world: 'balneario', count: 1 }],
    bonus: own('balneario'),
  },
  {
    id: 'cerdo-en-remojo',
    name: 'Cerdo en remojo',
    flavor: 'Lleva tanto en remojo que ya es parte de la bañera.',
    set: 'balneario',
    requires: [{ kind: 'lifetime', world: 'balneario', amount: 1e21 }],
    bonus: own('balneario'),
  },
  {
    id: 'cerdita-pepinos',
    name: 'Cerdita con pepinos',
    flavor: 'Los pepinos son para los ojos, no para comer. Casi nunca.',
    set: 'balneario',
    requires: [{ kind: 'genCount', world: 'balneario', gen: 'cerdo-zen', count: 140 }],
    bonus: own('balneario'),
  },
  {
    id: 'maestro-del-barro',
    name: 'Maestro del barro',
    flavor: 'Sabe exactamente cuánto barro hace falta para la felicidad.',
    set: 'balneario',
    requires: [{ kind: 'plumasTotal', world: 'balneario', count: 5e4 }],
    bonus: own('balneario'),
  },
  // Cerditos curiosos (hitos de ascensión y plumas en el Valle)
  {
    id: 'cerdito-boina',
    name: 'Cerdito con boina',
    flavor: 'Se cree artista desde que encontró la boina.',
    set: 'curiosos',
    requires: [{ kind: 'ascensions', world: 'valle', count: 5 }],
    bonus: own('valle'),
  },
  {
    id: 'cerdita-lectora',
    name: 'Cerdita lectora',
    flavor: 'Ha leído más libros que cerditos hay en el Valle.',
    set: 'curiosos',
    requires: [{ kind: 'plumasTotal', world: 'valle', count: 1e5 }],
    bonus: own('valle'),
  },
  {
    id: 'cerdo-filosofo',
    name: 'Cerdo filósofo',
    flavor: 'Se pregunta si el barro le mancha a él o él mancha al barro.',
    set: 'curiosos',
    requires: [{ kind: 'ascensions', world: 'valle', count: 30 }],
    bonus: own('valle'),
  },
  {
    id: 'cerdito-astronauta',
    name: 'Cerdito astronauta',
    flavor: 'Sueña con bellotas que caigan desde más arriba.',
    set: 'curiosos',
    requires: [{ kind: 'plumasTotal', world: 'valle', count: 4e6 }],
    bonus: own('valle'),
  },
  // Cruces (necesitan dos variedades de mundos distintos)
  {
    id: 'trufero-iberico',
    name: 'Trufero ibérico',
    flavor: 'Mitad Valle, mitad Bosque, un narizón perfecto.',
    set: 'cruces',
    requires: [{ kind: 'varieties', ids: ['iberico-de-bellota', 'buscadora-veterana'] }],
    bonus: all(1.03),
  },
  {
    id: 'jabali-rosa',
    name: 'Jabalí rosa',
    flavor: 'Ni jabalí del todo, ni rosa del todo.',
    set: 'cruces',
    requires: [{ kind: 'varieties', ids: ['rosa-de-concurso', 'jabato-curioso'] }],
    bonus: all(1.03),
  },
  {
    id: 'duroc-hortelano',
    name: 'Duroc hortelano',
    flavor: 'Cambió las bellotas por las calabazas, y no se arrepiente.',
    set: 'cruces',
    requires: [{ kind: 'varieties', ids: ['duroc-pelirrojo', 'calabacero'] }],
    bonus: all(1.03),
  },
  {
    id: 'lechon-de-spa',
    name: 'Lechón de spa',
    flavor: 'Empezó pequeño y acabó en albornoz.',
    set: 'cruces',
    requires: [{ kind: 'varieties', ids: ['lechon-manchado', 'cerdito-toalla'] }],
    bonus: all(1.03),
  },
  // Leyendas
  {
    id: 'cerdo-alado',
    name: 'Cerdo alado',
    flavor: 'Nadie sabe cómo vuela. Él tampoco.',
    set: 'leyendas',
    requires: [{ kind: 'varieties', ids: ['cerdito-astronauta', 'maestro-del-barro'] }],
    bonus: all(1.05),
  },
  {
    id: 'gran-madre',
    name: 'La Gran Madre',
    flavor: 'Cuidó de más cerditos de los que nadie puede contar.',
    set: 'leyendas',
    requires: [{ kind: 'varieties', ids: ['madre-del-bosque', 'gran-calabaza'] }],
    bonus: all(1.05),
  },
  {
    id: 'cerdo-de-oro',
    name: 'Cerdo de oro',
    flavor: 'Brilla, pero no se vende.',
    set: 'leyendas',
    requires: [{ kind: 'varieties', ids: ['trufero-iberico', 'jabali-rosa', 'duroc-hortelano', 'lechon-de-spa'] }],
    bonus: all(1.05),
  },
  {
    id: 'pancho',
    name: 'Pancho, el primer cerdito',
    flavor: 'El que empezó todo esto, hace ya mucho tiempo.',
    set: 'leyendas',
    requires: [
      {
        kind: 'varieties',
        ids: ['cerdo-alado', 'gran-madre', 'cerdo-de-oro', 'cerdo-filosofo', 'cerdita-seta', 'cerdita-pepinos', 'cerdita-jardinera', 'cerdo-en-remojo'],
      },
    ],
    bonus: all(1.05),
  },
];
