// Migraciones de guardado. Ver docs/06-mina.md.
//
// Una migración por salto de versión, pura (sin acceder al contenido del juego: eso lo hace
// normalize.ts, para contenido nuevo que no necesita subir de versión). Cambiar la FORMA del
// GameState exige: subir CURRENT_VERSION, añadir una migración aquí y un test.
//
// Las versiones 1-4 eran juegos anteriores (granjas con mundos y una primera mina con zonas y
// piezas): no se pueden convertir (no hay equivalente a las herramientas actuales), así que se
// rechazan con un mensaje claro y el juego empieza una partida nueva.

import { CURRENT_VERSION, type SaveData } from './serialize.ts';

export class SaveValidationError extends Error {}

type RawSave = Record<string, unknown>;

/** Primera versión del formato actual (el cerdito picador con herramientas). */
const FIRST_VERSION = 5;

/**
 * v5 → v6 (mejoras de herramienta que se compran): añade `upgrades`. Para no quitar nada a quien ya
 * tenía hitos aplicados automáticamente, se le dan como compradas las mejoras que ya habría
 * desbloqueado con las unidades que tiene (los hitos 5, 15, 25…).
 */
const MILESTONES_V5 = [5, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500];
function v5ToV6(old: RawSave): RawSave {
  if (!isPlainObject(old['state'])) return { ...old, version: 6 };
  const state = old['state'];
  const owned = (isPlainObject(state['tools']) ? state['tools'] : {}) as Record<string, number>;
  const upgrades: Record<string, number> = {};
  for (const [id, count] of Object.entries(owned)) {
    const reached = MILESTONES_V5.filter((m) => count >= m).length;
    if (reached > 0) upgrades[id] = reached;
  }
  return { ...old, version: 6, state: { ...state, version: 6, upgrades } };
}

/**
 * v6 → v7 (mejoras globales, inercia, bellotas, pieles, compañeros y estadísticas): añade los campos
 * nuevos con valores neutros.
 */
function v6ToV7(old: RawSave): RawSave {
  if (!isPlainObject(old['state'])) return { ...old, version: 7 };
  const state = old['state'];
  return {
    ...old,
    version: 7,
    state: { ...state, version: 7, globalUpgrades: {}, momentum: 0, acorns: 0, skins: {}, activeSkin: 'rosa', companions: {}, activeCompanions: [], stats: { visitors: 0, bestIncome: '0' } },
  };
}

/** v(n) → v(n+1). */
const MIGRATIONS: Record<number, (old: RawSave) => RawSave> = {
  5: v5ToV6,
  6: v6ToV7,
};

function isPlainObject(value: unknown): value is RawSave {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Valida la forma mínima de un guardado, lo migra hasta CURRENT_VERSION y lo devuelve tipado
 * como SaveData. Lanza SaveValidationError si no es un guardado válido, es de un juego anterior
 * o de una versión más nueva que esta.
 */
export function migrate(raw: unknown): SaveData {
  if (!isPlainObject(raw)) throw new SaveValidationError('No es un guardado de Cerditos válido.');
  if (raw['format'] !== 'cerditos') throw new SaveValidationError('No es un guardado de Cerditos.');

  let data = raw;
  const initialVersion = data['version'];
  if (typeof initialVersion !== 'number' || !Number.isInteger(initialVersion) || initialVersion < 1) {
    throw new SaveValidationError('El guardado no tiene una versión reconocible.');
  }
  if (initialVersion < FIRST_VERSION) {
    throw new SaveValidationError('Esta partida es de una versión anterior del juego (granjas o mina con zonas) y no se puede usar.');
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
