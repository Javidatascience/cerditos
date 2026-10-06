// Bucle de avance del tiempo. `advance` es la única función que hace pasar el tiempo: suma la
// producción de `dt` segundos (con el impulso del visitante si está activo) y comprueba
// herramientas descubiertas y logros. Es exacta para cualquier `dt` mientras no haya compras de por medio.

import type { Content } from '../content/types.ts';
import { updateAchievements } from './achievements.ts';
import { incomePerSecond } from './formulas.ts';
import { gameClockMs } from './journal.ts';
import { updateReveals } from './reveal.ts';
import type { GameState } from './state.ts';

/** Avanza `dt` segundos el juego. Muta `state`. */
export function advance(state: GameState, content: Content, dt: number): void {
  if (dt <= 0) return;
  // Impulso del visitante: factor medio de producción durante este avance (exacto).
  const buff = state.buff;
  const overlap = buff ? Math.min(dt, Math.max(0, buff.until - state.time)) : 0;
  const factor = buff ? (buff.mult * overlap + (dt - overlap)) / dt : 1;

  const gained = incomePerSecond(state, content).mul(dt * factor);
  state.coins = state.coins.add(gained);
  state.lifetime = state.lifetime.add(gained);

  state.time += dt;
  if (buff && state.time >= buff.until) state.buff = null;

  updateReveals(state, content);
  updateAchievements(state, content, gameClockMs(state));
}
