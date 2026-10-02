// Diario de la granja: una línea discreta por cosa que ha pasado (variedad nueva, ascensión,
// recuperación de un guardado…), sin ventanas emergentes. Ver docs/01-diseno-juego.md §8.

import type { GameState } from './state.ts';

export const MAX_JOURNAL_ENTRIES = 100;

/** Añade una entrada al final (la más reciente); descarta las más antiguas por encima de 100. */
export function addEntry(state: GameState, text: string, at: number): void {
  state.journal.push({ at, text });
  if (state.journal.length > MAX_JOURNAL_ENTRIES) {
    state.journal.splice(0, state.journal.length - MAX_JOURNAL_ENTRIES);
  }
}

/**
 * "Ahora" derivado del propio estado (epoch ms de creación + segundos de juego simulados),
 * para poder anotar en el diario desde `advance` sin leer el reloj del sistema (core es puro).
 * Coincide con el reloj real salvo desviaciones de milisegundos o ausencias recortadas.
 */
export function gameClockMs(state: GameState): number {
  return state.createdAt + state.time * 1000;
}
