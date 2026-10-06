// Cerdito viajero: cada 1-2 minutos (al azar), mientras el juego está abierto, aparece un visitante
// con una recompensa (una inyección de moneda o un impulso de producción). Se queda 20
// segundos: si no lo aceptas, se va y llegará otro más adelante. El azar (cuándo llega y qué
// trae) vive aquí, fuera de `core`, que solo aplica la recompensa (`actions.claimVisitor`).
// Ver docs/01 §11 (reglas 1 y 2, revisadas por el usuario).

import type { VisitorKind } from '../core/actions.ts';

/** Espera entre visitantes, en segundos de juego abierto. */
export const VISITOR_MIN_DELAY = 60;
export const VISITOR_MAX_DELAY = 120;
/** Segundos que se queda el visitante esperando antes de irse. */
export const VISITOR_STAY_SECONDS = 20;

export interface VisitorScheduler {
  /** Avanza `dt` segundos de juego abierto; puede hacer aparecer o marcharse al visitante. */
  tick(dt: number): void;
  /** Visitante esperando (o null). */
  current(): VisitorKind | null;
  /** Segundos que le quedan antes de irse (0 si no hay visitante). */
  secondsLeft(): number;
  /** El visitante se ha aceptado: se programa el siguiente. */
  clear(): void;
}

export function createVisitorScheduler(rng: () => number = Math.random, modifiers: () => { speed: number; stayBonus: number } = () => ({ speed: 1, stayBonus: 0 })): VisitorScheduler {
  const nextDelay = () => VISITOR_MIN_DELAY + rng() * (VISITOR_MAX_DELAY - VISITOR_MIN_DELAY);
  let untilNext = nextDelay();
  let waiting: VisitorKind | null = null;
  let stayLeft = 0;

  function leave(): void {
    waiting = null;
    stayLeft = 0;
    untilNext = nextDelay();
  }

  return {
    tick(dt) {
      if (waiting) {
        stayLeft -= dt;
        if (stayLeft <= 0) leave();
        return;
      }
      untilNext -= dt * modifiers().speed;
      if (untilNext <= 0) {
        waiting = rng() < 0.5 ? 'injection' : 'boost';
        stayLeft = VISITOR_STAY_SECONDS + modifiers().stayBonus;
      }
    },
    current: () => waiting,
    secondsLeft: () => (waiting ? Math.max(0, stayLeft) : 0),
    clear: leave,
  };
}
