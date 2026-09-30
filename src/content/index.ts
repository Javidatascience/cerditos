// Contenido completo del juego (hito 2). Ver docs/02-arquitectura.md §7.

import { SETS, VARIETIES } from './collection.ts';
import { PERKS } from './perks.ts';
import type { Content } from './types.ts';
import { balneario } from './worlds/balneario.ts';
import { bosque } from './worlds/bosque.ts';
import { huerta } from './worlds/huerta.ts';
import { valle } from './worlds/valle.ts';

export const CONTENT: Content = {
  worlds: [valle, bosque, huerta, balneario],
  perks: PERKS,
  varieties: VARIETIES,
  sets: SETS,
};
