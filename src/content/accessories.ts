// Prendas del cerdito, en tres huecos (además del color, que son las pieles): gorro (cabeza), ropa (cuerpo)
// y cola. Cada una tiene su dibujo en `public/pig/acc/<id>.png` (tools/make-pig-accessories.py), con el
// mismo lienzo que el cerdito. Se compran con bellotas o las regala un logro. Ver docs/06-mina.md.

import type { AccessoryDef } from './types.ts';

export const ACCESSORIES: AccessoryDef[] = [
  // Gorros
  { id: 'hechicero', slot: 'head', name: 'Gorro de hechicero', flavor: 'Con estrellitas y todo: algo de magia siempre queda.', cost: 6, achievement: null },
  { id: 'casco', slot: 'head', name: 'Casco de minero', flavor: 'Con su linterna, para ir a lo hondo.', cost: 8, achievement: null },
  { id: 'cuerno', slot: 'head', name: 'Cuerno de unicornio', flavor: 'Nadie sabe de dónde ha salido.', cost: 10, achievement: null },
  { id: 'corona', slot: 'head', name: 'Corona', flavor: 'Para quien ha subido cinco veces a la superficie.', cost: null, achievement: 'ascender-5' },
  // Ropa
  { id: 'tutu', slot: 'body', name: 'Tutú', flavor: 'Hasta picar tiene su gracia así.', cost: 8, achievement: null },
  { id: 'armadura', slot: 'body', name: 'Armadura', flavor: 'Pesa, pero el cerdito aguanta.', cost: 12, achievement: null },
  { id: 'alas', slot: 'body', name: 'Alas', flavor: 'No vuela, pero parece que podría.', cost: 14, achievement: null },
  // Colas
  { id: 'cola-lagarto', slot: 'tail', name: 'Cola de lagarto', flavor: 'Larga, verde y con escamas.', cost: 8, achievement: null },
  { id: 'cola-fuego', slot: 'tail', name: 'Cola de fuego', flavor: 'Calienta la mina entera.', cost: null, achievement: 'dragon-etapa-2' },
  { id: 'cola-fantasma', slot: 'tail', name: 'Cola fantasmal', flavor: 'Se ve y no se ve.', cost: null, achievement: 'brillantes-3' },
];
