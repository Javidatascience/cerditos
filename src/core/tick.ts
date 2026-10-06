// Bucle de avance del tiempo. `advance` es la única función que hace pasar el tiempo: cava
// durante `dt` segundos (con el impulso del visitante si está activo) y luego comprueba logros.
// Es exacta para cualquier `dt` mientras no haya compras de por medio.

import type { Content } from '../content/types.ts';
import { updateAchievements } from './achievements.ts';
import { gameClockMs } from './journal.ts';
import { advanceMine } from './mining.ts';
import type { GameState } from './state.ts';

/** Avanza `dt` segundos la mina. Muta `state`. */
export function advance(state: GameState, content: Content, dt: number): void {
  if (dt <= 0) return;
  // Impulso del visitante: la parte de `dt` que cae dentro de su duración se cava con el multiplicador.
  const buff = state.buff;
  const boosted = buff ? Math.min(dt, Math.max(0, buff.until - state.time)) : 0;
  if (buff && boosted > 0) advanceMine(state, content, boosted, buff.mult);
  if (dt - boosted > 0) advanceMine(state, content, dt - boosted, 1);

  state.time += dt;
  state.runSeconds += dt;
  if (buff && state.time >= buff.until) state.buff = null;

  updateAchievements(state, content, gameClockMs(state));
}
