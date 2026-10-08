// Contenido completo del juego. Ver docs/06-mina.md.

import { ACCESSORIES } from './accessories.ts';
import { ACHIEVEMENTS } from './achievements.ts';
import { CAVE } from './cave.ts';
import { GARDEN } from './garden.ts';
import { COMPANIONS, GAME, GLOBAL_UPGRADES, RELICS, SKINS, TOOLS } from './game.ts';
import { NEST } from './nest.ts';
import { PERKS } from './perks.ts';
import type { Content } from './types.ts';

export const CONTENT: Content = {
  game: GAME,
  nest: NEST,
  accessories: ACCESSORIES,
  cave: CAVE,
  garden: GARDEN,
  tools: TOOLS,
  perks: PERKS,
  globalUpgrades: GLOBAL_UPGRADES,
  skins: SKINS,
  companions: COMPANIONS,
  relics: RELICS,
  achievements: ACHIEVEMENTS,
};
