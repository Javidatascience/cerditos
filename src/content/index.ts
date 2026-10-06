// Contenido completo del juego. Ver docs/06-mina.md.

import { ACHIEVEMENTS } from './achievements.ts';
import { CAVE } from './cave.ts';
import { COMPANIONS, GAME, GLOBAL_UPGRADES, RELICS, SKINS, TOOLS } from './game.ts';
import { PERKS } from './perks.ts';
import type { Content } from './types.ts';

export const CONTENT: Content = {
  game: GAME,
  cave: CAVE,
  tools: TOOLS,
  perks: PERKS,
  globalUpgrades: GLOBAL_UPGRADES,
  skins: SKINS,
  companions: COMPANIONS,
  relics: RELICS,
  achievements: ACHIEVEMENTS,
};
