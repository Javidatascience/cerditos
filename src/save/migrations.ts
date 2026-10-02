// Migraciones de guardado. Ver docs/02-arquitectura.md §6.
//
// Una migración por salto de versión, pura (sin acceder al contenido del juego: eso lo hace
// normalize.ts, para contenido nuevo que no necesita subir de versión). Cambiar la FORMA del
// GameState exige: subir CURRENT_VERSION, añadir una migración aquí, y un fixture nuevo en
// save/fixtures/.

import { CURRENT_VERSION, type SaveData } from './serialize.ts';

export class SaveValidationError extends Error {}

type RawSave = Record<string, unknown>;

/**
 * v1 → v2 (visitante, cesta, logros y cerditos descubiertos): añade `buff`, `achievements`,
 * `taps` al estado y `basketSince` y `revealed` a cada mundo. `revealed` se calcula con lo que
 * ya se tenía: hasta el último cerdito comprado alguna vez (el juego completa el resto).
 */
function v1ToV2(old: RawSave): RawSave {
  if (!isPlainObject(old['state'])) return { ...old, version: 2 }; // lo rechazará la validación posterior
  const state = old['state'];
  const time = typeof state['time'] === 'number' ? state['time'] : 0;
  const worlds: RawSave = {};
  for (const [id, raw] of Object.entries((state['worlds'] ?? {}) as RawSave)) {
    const w = raw as RawSave;
    const ids = Object.keys((w['generators'] ?? {}) as RawSave);
    const maxBought = ((w['records'] as RawSave | undefined)?.['maxBought'] ?? {}) as Record<string, number>;
    const generators = (w['generators'] ?? {}) as Record<string, { bought?: number }>;
    let last = -1;
    ids.forEach((gid, i) => {
      if ((maxBought[gid] ?? 0) > 0 || (generators[gid]?.bought ?? 0) > 0) last = i;
    });
    worlds[id] = { ...w, revealed: Math.max(1, last + 1), basketSince: time };
  }
  return { ...old, version: 2, state: { ...state, version: 2, worlds, achievements: {}, taps: 0, buff: null } };
}

/** v(n) → v(n+1). */
const MIGRATIONS: Record<number, (old: RawSave) => RawSave> = {
  1: v1ToV2,
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
