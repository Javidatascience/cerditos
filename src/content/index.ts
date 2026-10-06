// Contenido completo del juego. Ver docs/06-mina.md.

import { ACHIEVEMENTS } from './achievements.ts';
import { GAME, TOOLS } from './game.ts';
import { PERKS } from './perks.ts';
import type { Content } from './types.ts';

export const CONTENT: Content = {
  game: GAME,
  tools: TOOLS,
  perks: PERKS,
  achievements: ACHIEVEMENTS,
};
