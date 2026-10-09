// Cálculo offline: lo que ha pasado mientras el jugador no estaba, con el mismo tick del juego
// (advance), troceado. Solo se cuentan las primeras 2 horas de ausencia (más con "Siesta larga").
// No hay compras de por medio, así que el resultado es exacto, trocee como trocee.

import type { Content } from '../content/types.ts';
import { embersPerSecond } from './cave.ts';
import { offlineCapSeconds } from './formulas.ts';
import type { Decimal } from './num.ts';
import type { GameState } from './state.ts';
import { advance } from './tick.ts';

const CHUNK_SECONDS = 15;
const MAX_CHUNKS = 2000;

export interface OfflineSummary {
  /** Segundos realmente simulados (ya recortados al tope). */
  awaySeconds: number;
  /** Segundos que duró de verdad la ausencia (puede superar el tope). */
  totalAwaySeconds: number;
  /** Monedas ganadas durante la ausencia. */
  coinsEarned: Decimal;
}

/**
 * Avanza el estado lo que corresponda a `seconds` de ausencia, troceado en pasos de ~15 s (como
 * mucho 2000 trozos). `seconds <= 0` no hace nada (reloj del sistema atrasado). Muta `state`.
 */
export function simulateOffline(state: GameState, content: Content, seconds: number): OfflineSummary {
  const before = state.coins;
  if (seconds <= 0) return { awaySeconds: 0, totalAwaySeconds: 0, coinsEarned: before.sub(before) };

  const capped = Math.min(seconds, offlineCapSeconds(state, content));
  const chunks = Math.min(MAX_CHUNKS, Math.max(1, Math.ceil(capped / CHUNK_SECONDS)));
  const chunkSeconds = capped / chunks;
  const embersBefore = state.cave.embers;
  const embersPerSec = embersPerSecond(state, content);
  for (let i = 0; i < chunks; i++) advance(state, content, chunkSeconds);
  // Las brasas solo cuentan la primera hora de ausencia (las compras no cambian el ritmo mientras no estás).
  state.cave.embers = embersBefore.add(embersPerSec.mul(Math.min(capped, content.cave.offlineEmbersSeconds)));

  return { awaySeconds: capped, totalAwaySeconds: seconds, coinsEarned: state.coins.sub(before) };
}
