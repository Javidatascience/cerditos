// Migraciones de guardado. Ver docs/02-arquitectura.md §6.
//
// Una migración por salto de versión, pura (sin acceder al contenido del juego: eso lo hace
// normalize.ts, para contenido nuevo que no necesita subir de versión). Cambiar la FORMA del
// GameState exige: subir CURRENT_VERSION, añadir una migración aquí, y un fixture nuevo en
// save/fixtures/.

import { CURRENT_VERSION, type SaveData } from './serialize.ts';

export class SaveValidationError extends Error {}

type RawSave = Record<string, unknown>;

/** v(n) → v(n+1). Vacío de momento: CURRENT_VERSION = 1 es la primera versión del formato. */
const MIGRATIONS: Record<number, (old: RawSave) => RawSave> = {
  // 1: (v1) => ({ ...v1, version: 2, state: { ...(v1.state as RawSave), ... } }),
};

function isPlainObject(value: unknown): value is RawSave {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Valida la forma mínima de un guardado, lo migra hasta CURRENT_VERSION y lo devuelve
 * tipado como SaveData. Lanza SaveValidationError si no es un guardado válido o es de una
 * versión del juego más nueva que esta.
 */
export function migrate(raw: unknown): SaveData {
  if (!isPlainObject(raw)) throw new SaveValidationError('No es un guardado de Cerditos válido.');
  if (raw['format'] !== 'cerditos') throw new SaveValidationError('No es un guardado de Cerditos.');

  let data = raw;
  const initialVersion = data['version'];
  if (typeof initialVersion !== 'number' || !Number.isInteger(initialVersion) || initialVersion < 1) {
    throw new SaveValidationError('El guardado no tiene una versión reconocible.');
  }
  if (initialVersion > CURRENT_VERSION) {
    throw new SaveValidationError('Este guardado es de una versión más nueva del juego. Actualiza antes de importarlo.');
  }
  let version: number = initialVersion;

  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveValidationError(`No hay forma de actualizar un guardado desde la versión ${version}.`);
    data = step(data);
    const next = data['version'];
    if (typeof next !== 'number' || next <= version) {
      throw new SaveValidationError('Migración de guardado inconsistente.');
    }
    version = next;
  }

  if (!isPlainObject(data['state'])) throw new SaveValidationError('El guardado no tiene estado de partida.');
  return data as unknown as SaveData;
}
