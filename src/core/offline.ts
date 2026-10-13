// Cálculo offline: lo que ha pasado mientras el jugador no estaba, con el mismo tick del juego
// (advance), troceado. Solo se cuentan las primeras 2 horas de ausencia (más con "Siesta larga").
// No hay compras de por medio, así que el resultado es exacto, trocee como trocee.

import type { Content } from '../content/types.ts';
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
  /** Monedas ganadas durante la ausencia (están en la cesta). */
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
  const lifetimeBefore = state.lifetime;
  for (let i = 0; i < chunks; i++) advance(state, content, chunkSeconds);
  // Lo ganado no va a las monedas: va a la cesta (cuenta para las esmeraldas al recogerla).
  const earned = state.coins.sub(before);
  state.coins = before;
  state.lifetime = lifetimeBefore;
  state.basket = state.basket.add(earned);

  return { awaySeconds: capped, totalAwaySeconds: seconds, coinsEarned: earned };
}
