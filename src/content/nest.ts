// El Nido: tres criaturas que nacen de huevos (se compran con bellotas), eclosionan con el tiempo y
// evolucionan alimentándolas con bellotas. Al llegar a adulta dan un logro y una reliquia. Solo hay un
// nido al principio; las ventajas del árbol (zona Nido) dan hasta tres. Dibujos en `public/art/creatures/`.

import type { NestDef } from './types.ts';

const HOUR = 3600;

export const NEST: NestDef = {
  unlockPlumas: 5,
  maxSlots: 3,
  basketAcornCap: 4,
  topoLevel: 3,
  topoHours: 6,
  creatures: [
    {
      id: 'fenix', name: 'Fénix', flavor: 'Renace de sus propias cenizas, o eso dice.', eggCost: 10, hatchSeconds: 1 * HOUR, feedCosts: [15, 40], boost: { kind: 'embersMult', value: 2, seconds: 2 * HOUR, cost: 20 }, resident: { kind: 'embers', perSecond: 0.5 },
      stages: [
        { name: 'Huevo rojo', flavor: 'Está calentito, casi quema.' },
        { name: 'Pollito rojo', flavor: 'Pía muy fuerte y echa alguna chispa.' },
        { name: 'Gallina de fuego', flavor: 'Lleva una llamita en la cresta y otra en la cola.' },
        { name: 'Fénix', flavor: 'Alas de brasa y una cola que no se apaga.' },
      ],
    },
    {
      id: 'tiburon', name: 'Tiburón', flavor: 'Nadie le ha visto nadar en el estanque, pero se nota.', eggCost: 10, hatchSeconds: 1 * HOUR, feedCosts: [15, 40], boost: { kind: 'tapMult', value: 1, seconds: 2 * HOUR, cost: 20 }, resident: { kind: 'prodMult', value: 1.15 },
      stages: [
        { name: 'Huevo azul', flavor: 'Se oye un chapoteo dentro.' },
        { name: 'Pececito azul', flavor: 'Pequeño, tímido y siempre hambriento.' },
        { name: 'Piraña', flavor: 'Ya enseña los dientes a quien se acerca.' },
        { name: 'Tiburón', flavor: 'Da miedo. Mucho miedo. Pero es un buen chico.' },
      ],
    },
    {
      id: 'ornitorrinco', name: 'Ornitorrinco', flavor: 'Pone huevos, tiene pico y es mamífero: no preguntes.', eggCost: 10, hatchSeconds: 1 * HOUR, feedCosts: [15, 40], boost: { kind: 'prodMult', value: 1.5, seconds: 2 * HOUR, cost: 20 }, resident: { kind: 'acorns', everyHours: 4 },
      stages: [
        { name: 'Huevo marrón', flavor: 'Moteado y con un aire sospechoso.' },
        { name: 'Mamífero bebé', flavor: 'Nadie sabe todavía qué va a ser.' },
        { name: 'Ornitorrinco pequeño', flavor: 'Ya tiene pico, cola y cara de despistado.' },
        { name: 'Ornitorrinco grande', flavor: 'Con gafas de sol y todo: el más chulo del estanque.' },
      ],
    },
    {
      id: 'dragon', name: 'Dragón', flavor: 'El huevo que te dejó el dragón adulto de la cueva.', eggCost: 0, requiresDragonStage: 3, hatchSeconds: 3 * HOUR, feedCosts: [40, 100], boost: { kind: 'embersMult', value: 3, seconds: 2 * HOUR, cost: 30 }, resident: { kind: 'prodMult', value: 1.25 },
      stages: [
        { name: 'Huevo de dragón', flavor: 'Moteado de verde y siempre caliente.' },
        { name: 'Dragoncito', flavor: 'Estornuda chispas y se esconde detrás del cerdito.' },
        { name: 'Dragón joven', flavor: 'Ya vuela un poco, sobre todo hacia la comida.' },
        { name: 'Dragón guardián', flavor: 'Vigila la mina desde lo alto: todo rinde más.' },
      ],
    },
  ],
};
