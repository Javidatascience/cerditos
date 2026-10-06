// Bucle de avance del tiempo. `advance` es la única función que hace pasar el tiempo: suma la
// producción de `dt` segundos (con el impulso del visitante si está activo) y comprueba
// herramientas descubiertas y logros. Es exacta para cualquier `dt` mientras no haya compras de por medio.

import type { Content } from '../content/types.ts';
import { updateAchievements } from './achievements.ts';
import { baseIncomePerSecond, momentumMult } from './formulas.ts';
import { gameClockMs } from './journal.ts';
import { updateReveals } from './reveal.ts';
import type { GameState } from './state.ts';

/** Avanza `dt` segundos el juego. Muta `state`. */
export function advance(state: GameState, content: Content, dt: number): void {
  if (dt <= 0) return;
  const base = baseIncomePerSecond(state, content);
  const g = content.game;
  const m0 = state.momentum;
  const decay = g.momentumDecay;
  const buff = state.buff;

  // La producción depende de dos cosas que cambian a trozos: el impulso del visitante (se acaba
  // en `buffEnd`) y la inercia (baja linealmente hasta llegar a 0 en `zeroAt`). Se parte `dt` en
  // esos puntos y en cada trozo el multiplicador es lineal, así que su media es exacta.
  const buffEnd = buff ? Math.min(dt, Math.max(0, buff.until - state.time)) : 0;
  const zeroAt = decay > 0 && m0 > 0 ? Math.min(dt, m0 / decay) : m0 > 0 ? dt : 0;
  const cuts = [0, buffEnd, zeroAt, dt].filter((t, i, all) => t >= 0 && t <= dt && all.indexOf(t) === i).sort((a, b) => a - b);

  let gained = base.mul(0);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const len = b - a;
    if (len <= 0) continue;
    const ma = Math.max(0, m0 - decay * a);
    const mb = Math.max(0, m0 - decay * b);
    const inertia = momentumMult(state, content, (ma + mb) / 2);
    const boost = buff && b <= buffEnd + 1e-9 ? buff.mult : 1;
    gained = gained.add(base.mul(len * inertia * boost));
  }

  state.coins = state.coins.add(gained);
  state.lifetime = state.lifetime.add(gained);
  state.momentum = Math.max(0, m0 - decay * dt);

  state.time += dt;
  if (buff && state.time >= buff.until) state.buff = null;

  const income = base.mul(momentumMult(state, content));
  if (income.gt(state.stats.bestIncome)) state.stats.bestIncome = income;

  updateReveals(state, content);
  updateAchievements(state, content, gameClockMs(state));
}
