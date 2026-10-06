// El cavado: romper bloques, avanzar de nivel y soltar monedas y materiales. Ver docs/06-mina.md.
// `advanceMine` es la única función que "cava"; la usan el tiempo (tick/offline), el toque y la dinamita.

import type { Content } from '../content/types.ts';
import { blockCoins, blockHpAt, digPower, MAX_DEPTH, materialDrop, zoneAt, zoneIndexOf } from './formulas.ts';
import { addEntry, gameClockMs } from './journal.ts';
import { D } from './num.ts';
import type { GameState } from './state.ts';

/** Tope de bloques por llamada, para que un paso enorme no bloquee (el resto del tiempo se pierde). */
const MAX_BLOCKS_PER_CALL = 20000;

/** Rompe el bloque actual: suelta sus monedas y materiales y pasa al siguiente nivel (o se queda si se está farmeando). */
export function breakBlock(state: GameState, content: Content): void {
  const zone = zoneAt(content, state.depth);
  state.coins = state.coins.add(blockCoins(state, content, state.depth));
  const drop = materialDrop(state, content);
  state.materials[zone.material] = (state.materials[zone.material] ?? D(0)).add(drop);
  state.records.blocks += 1;

  let next = state.depth + 1;
  if (state.farmZone !== null && zoneIndexOf(content, next) > state.farmZone) next = state.depth;
  if (next > MAX_DEPTH) next = state.depth;
  state.depth = next;
  state.blockHp = blockHpAt(content, next);

  if (next > state.runMaxDepth) state.runMaxDepth = next;
  if (next > state.records.maxDepth) {
    const before = zoneIndexOf(content, state.records.maxDepth);
    state.records.maxDepth = next;
    const after = zoneIndexOf(content, next);
    if (after > before) {
      const arrived = content.zones[after]!;
      addEntry(state, `Has llegado a ${arrived.name}. ${arrived.flavor}`, gameClockMs(state));
    }
  }
}

/**
 * Cava durante `seconds` segundos (con el cavado multiplicado por `mult`, p. ej. el impulso del
 * visitante). Rompe tantos bloques como den de sí; lo que sobra va quitando vida al bloque actual.
 */
export function advanceMine(state: GameState, content: Content, seconds: number, mult = 1): void {
  let remaining = seconds;
  for (let blocks = 0; remaining > 1e-9 && blocks < MAX_BLOCKS_PER_CALL; blocks++) {
    const dps = digPower(state, content, zoneIndexOf(content, state.depth)) * mult;
    if (!(dps > 0)) return;
    const timeToBreak = state.blockHp / dps;
    if (timeToBreak <= remaining) {
      remaining -= timeToBreak;
      breakBlock(state, content);
    } else {
      state.blockHp -= dps * remaining;
      return;
    }
  }
}
