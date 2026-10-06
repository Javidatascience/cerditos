// Herramientas descubiertas: al empezar solo se ve la primera; la siguiente aparece difuminada y las
// demás quedan ocultas ("hay más herramientas por descubrir"). Una herramienta se descubre cuando se
// ha podido pagar su primera unidad, o ya se tuvo alguna vez. Solo avanza (ascender no vuelve a
// ocultar nada).

import type { Content } from '../content/types.ts';
import { toolBulkCost } from './formulas.ts';
import type { GameState } from './state.ts';

/** Descubre las herramientas que ya se pueden pagar. Muta `state`. */
export function updateReveals(state: GameState, content: Content): void {
  while (state.revealed < content.tools.length) {
    const tool = content.tools[state.revealed]!;
    const seenBefore = (state.maxOwned[tool.id] ?? 0) > 0;
    if (!seenBefore && state.coins.lt(toolBulkCost(state, content, tool, state.tools[tool.id] ?? 0, 1))) break;
    state.revealed += 1;
  }
}
