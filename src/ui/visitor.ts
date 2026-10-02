// Cerdito viajero: de vez en cuando, mientras el juego está abierto, aparece un visitante con una
// recompensa (una inyección de moneda o un impulso de producción). Se queda hasta que se acepta:
// no caduca ni corre prisa. El azar (cuándo llega y qué trae) vive aquí, fuera de `core`, que
// solo aplica la recompensa (`actions.claimVisitor`). Ver docs/01 §11 (regla 1, revisada).

import type { VisitorKind } from '../core/actions.ts';

/** Espera entre visitantes, en segundos de juego abierto. */
export const VISITOR_MIN_DELAY = 300;
export const VISITOR_MAX_DELAY = 600;

export interface VisitorScheduler {
  /** Avanza `dt` segundos de juego abierto; puede hacer aparecer al visitante. */
  tick(dt: number): void;
  /** Visitante esperando (o null). */
  current(): VisitorKind | null;
  /** El visitante se ha aceptado: se programa el siguiente. */
  clear(): void;
}

export function createVisitorScheduler(rng: () => number = Math.random): VisitorScheduler {
  const nextDelay = () => VISITOR_MIN_DELAY + rng() * (VISITOR_MAX_DELAY - VISITOR_MIN_DELAY);
  let remaining = nextDelay();
  let waiting: VisitorKind | null = null;
  return {
    tick(dt) {
      if (waiting) return;
      remaining -= dt;
      if (remaining <= 0) waiting = rng() < 0.5 ? 'injection' : 'boost';
    },
    current: () => waiting,
    clear() {
      waiting = null;
      remaining = nextDelay();
    },
  };
}
