// Contenido del juego. Ver docs/02-arquitectura.md §7.
// Hito 1: solo el Valle (2 cerditos). Los demás mundos, ventajas y colección llegan en el hito 2.

import type { Content } from './types.ts';
import { valle } from './worlds/valle.ts';

export const CONTENT: Content = {
  worlds: [valle],
  perks: [],
  varieties: [],
  sets: [],
};
