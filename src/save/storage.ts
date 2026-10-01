// Guardado en localStorage con respaldo y recuperación. Ver docs/02-arquitectura.md §6.
// Todo el acceso al almacenamiento pasa por `SaveStorage`, para poder sustituirlo (Capacitor,
// 02 §11) sin tocar nada más. `createLocalStorageStorage` es la única pieza de este fichero
// atada al navegador; el resto (loadGame/saveGame) solo conoce la interfaz.

import type { Content } from '../content/types.ts';
import type { GameState } from '../core/state.ts';
import { createInitialState } from '../core/state.ts';
import { migrate, SaveValidationError } from './migrations.ts';
import { normalize } from './normalize.ts';
import { deserialize, serialize } from './serialize.ts';

export interface SaveStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

const MAIN_KEY = 'cerditos:save';
const BACKUP_KEY = 'cerditos:save:backup';

/** Implementación sobre `window.localStorage`. Nunca lanza: en modo privado o con la cuota
 * llena, localStorage puede lanzar al leer o escribir; aquí se trata como "no hay guardado". */
export function createLocalStorageStorage(): SaveStorage {
  return {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Cuota llena o almacenamiento bloqueado: se pierde este guardado puntual, no se avisa
        // (el próximo guardado automático, 10 s después, lo vuelve a intentar).
      }
    },
  };
}

export type LoadSource = 'main' | 'backup' | 'new';

export interface LoadResult {
  state: GameState;
  source: LoadSource;
}

function tryLoad(raw: string | null, content: Content): GameState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const data = migrate(parsed);
    return normalize(deserialize(data), content);
  } catch (err) {
    if (err instanceof SaveValidationError || err instanceof SyntaxError) return null;
    throw err;
  }
}

/** Carga la partida: principal → backup → nueva. `now`: epoch ms, para la partida nueva y
 * para la entrada del diario si hace falta caer al respaldo (02 §6: "se anota en el diario";
 * la vista del diario llega en el hito 6, pero la entrada ya queda guardada desde ahora). */
export function loadGame(storage: SaveStorage, content: Content, now: number): LoadResult {
  const mainRaw = storage.read(MAIN_KEY);
  const fromMain = tryLoad(mainRaw, content);
  if (fromMain) return { state: fromMain, source: 'main' };

  const fromBackup = tryLoad(storage.read(BACKUP_KEY), content);
  if (fromBackup) {
    if (mainRaw) {
      fromBackup.journal.push({ at: now, text: 'La partida guardada no se pudo leer; se ha recuperado la copia de seguridad anterior.' });
    }
    return { state: fromBackup, source: 'backup' };
  }

  return { state: createInitialState(content, now), source: 'new' };
}

/** Guarda la partida. El guardado principal anterior (si lo había) pasa a ser el respaldo. */
export function saveGame(storage: SaveStorage, state: GameState, now: number): void {
  const previous = storage.read(MAIN_KEY);
  if (previous) storage.write(BACKUP_KEY, previous);
  storage.write(MAIN_KEY, JSON.stringify(serialize(state, now)));
}
