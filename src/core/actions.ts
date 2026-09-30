// Únicas funciones (junto con tick.ts y, desde el hito 4, offline.ts/autobuy.ts) que mutan
// el GameState. Ver CLAUDE.md "Reglas de código" y docs/02-arquitectura.md §4.
//
// Hito 1: solo `tap` y compra ×1 de un generador, lo mínimo para que la UI del esqueleto
// funcione. Cantidades ×10/máx, mejoras y `setBuyAmount` llegan en el hito 3 (ver Desviaciones
// en docs/04-plan-implementacion.md: este fichero se crea aquí en vez de en el hito 3 porque
// la UI mínima del hito 1 ya necesita comprar y tocar).

import type { Content } from '../content/types.ts';
import { generatorCost, getGeneratorDef, getWorldDef } from './formulas.ts';
import type { GameState, GeneratorId, WorldId } from './state.ts';

/** Rasca la barriga de un cerdito: +1 a la moneda del mundo. No escala (regla anti-clic, CLAUDE.md). */
export function tap(state: GameState, worldId: WorldId): void {
  const worldState = state.worlds[worldId];
  if (!worldState) return;
  worldState.currency = worldState.currency.add(1);
}

/**
 * Compra 1 unidad del generador si hay dinero suficiente. Devuelve `true` si se compró.
 * Nunca deja la moneda negativa.
 */
export function buyGenerator(state: GameState, content: Content, worldId: WorldId, genId: GeneratorId): boolean {
  const world = getWorldDef(content, worldId);
  const gen = getGeneratorDef(world, genId);
  const worldState = state.worlds[worldId];
  if (!worldState) return false;
  const genState = worldState.generators[genId];
  if (!genState) return false;

  const cost = generatorCost(world, gen, genState.bought);
  if (worldState.currency.lt(cost)) return false;

  worldState.currency = worldState.currency.sub(cost);
  genState.bought += 1;
  genState.owned = genState.owned.add(1);
  worldState.records.maxBought[genId] = Math.max(worldState.records.maxBought[genId] ?? 0, genState.bought);
  return true;
}
