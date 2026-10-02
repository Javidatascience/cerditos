// Cálculo offline: lo que ha pasado mientras el jugador no estaba, con el mismo tick del
// juego (advance), troceado. Ver docs/02-arquitectura.md §5 y docs/01-diseno-juego.md §10.
//
// Cada trozo hace advance(). Ya no hay autocompra: mientras no estás, la granja solo produce.
// Como solo hay producción (sin compras de por medio), el resultado es exacto, trocee como trocee.

import type { Content } from '../content/types.ts';
import { D, Decimal } from './num.ts';
import type { GameState } from './state.ts';
import { advance } from './tick.ts';

/** Tope de producción offline: solo se cuentan las primeras 2 horas de ausencia (decisión del usuario). */
export const MAX_OFFLINE_SECONDS = 2 * 3600;
const CHUNK_SECONDS = 15;
const MAX_CHUNKS = 2000;

export interface OfflineSummary {
  /** Segundos realmente simulados (ya recortados al tope de 2 horas). */
  awaySeconds: number;
  /** Segundos que duró de verdad la ausencia (puede superar el tope de producción). */
  totalAwaySeconds: number;
  /** Moneda ganada por mundo durante la ausencia (solo mundos desbloqueados producen). */
  earnedByWorld: Record<string, Decimal>;
}

function emptySummary(awaySeconds: number, content: Content, totalAwaySeconds = awaySeconds): OfflineSummary {
  const earnedByWorld: Record<string, Decimal> = {};
  for (const world of content.worlds) earnedByWorld[world.id] = D(0);
  return { awaySeconds, totalAwaySeconds, earnedByWorld };
}

/**
 * Avanza el estado lo que corresponda a `seconds` de ausencia, trocreado en pasos de ~15 s
 * (como mucho 2000 trozos). `seconds <= 0` no hace nada (reloj del sistema atrasado). Muta
 * `state`. Sin autocompradores, advance es exacta: el resultado es idéntico a avanzar
 * `seconds` de una sola vez, trocee como trocee.
 */
export function simulateOffline(state: GameState, content: Content, seconds: number): OfflineSummary {
  if (seconds <= 0) return emptySummary(0, content);

  const capped = Math.min(seconds, MAX_OFFLINE_SECONDS);
  const chunks = Math.min(MAX_CHUNKS, Math.max(1, Math.ceil(capped / CHUNK_SECONDS)));
  const chunkSeconds = capped / chunks;

  const before: Record<string, Decimal> = {};
  for (const world of content.worlds) before[world.id] = state.worlds[world.id]?.lifetimeEarned ?? D(0);

  for (let i = 0; i < chunks; i++) {
    advance(state, content, chunkSeconds);
  }

  const earnedByWorld: Record<string, Decimal> = {};
  for (const world of content.worlds) {
    const after = state.worlds[world.id]?.lifetimeEarned ?? D(0);
    earnedByWorld[world.id] = after.sub(before[world.id]!);
  }

  return { awaySeconds: capped, totalAwaySeconds: seconds, earnedByWorld };
}
