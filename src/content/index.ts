// Contenido completo del juego. Ver docs/06-mina.md.

import { ACHIEVEMENTS } from './achievements.ts';
import { HAZARDS, MATERIALS, MINE, PIECES, ZONES } from './mine.ts';
import { PERKS } from './perks.ts';
import type { Content } from './types.ts';

export const CONTENT: Content = {
  mine: MINE,
  materials: MATERIALS,
  hazards: HAZARDS,
  zones: ZONES,
  pieces: PIECES,
  perks: PERKS,
  achievements: ACHIEVEMENTS,
};
