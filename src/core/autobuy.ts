// Autocompra: lo que hacen las ventajas Capataz (cerditos) y Encargada (mejoras) en cada
// tick y en cada trozo del offline. Misma regla que tools/sim/strategy.ts > greedyBuy/autobuy
// (03 §4), para que el juego automático y el simulado coincidan.
//
// Incluye ya el "paquete de fila" de la armonía y la condición de calma aunque la Huerta y el
// Balneario no sean jugables hasta los hitos 8-9 (pedido explícitamente por el hito 5): el
// código simplemente no se ejercita todavía porque esos mundos están bloqueados.

import { buyGenerator, buyRow, buyUpgrade, rowBundleCost } from './actions.ts';
import {
  availableUpgrades,
  generatorCost,
  getWorldDef,
  hasPerkEffect,
  perkCostGrowthDelta,
  totalCostMultiplier,
  productionPerSecond,
  valueRate,
  type UpgradeOffer,
} from './formulas.ts';
import { D, Decimal } from './num.ts';
import type { Content } from '../content/types.ts';
import type { GameState, GeneratorId, WorldId } from './state.ts';

const VALUE_HORIZON_SECONDS = 1800;
const MAX_BUYS_PER_STEP = 400;

type Candidate =
  | { kind: 'generator'; genId: GeneratorId; cost: Decimal; delta: Decimal }
  | { kind: 'bundle'; genIds: GeneratorId[]; cost: Decimal; delta: Decimal }
  | { kind: 'upgrade'; offer: UpgradeOffer; cost: Decimal; delta: Decimal };

/** Cuánto sube `valueRate` al aplicar `apply` (y se deshace con `revert` antes de devolver). */
function deltaValue(state: GameState, content: Content, worldId: WorldId, base: Decimal, apply: () => void, revert: () => void): Decimal {
  apply();
  const after = valueRate(state, content, worldId, VALUE_HORIZON_SECONDS);
  revert();
  return after.sub(base);
}

function candidates(state: GameState, content: Content, worldId: WorldId, includeGenerators: boolean, includeUpgrades: boolean): Candidate[] {
  const world = getWorldDef(content, worldId);
  const worldState = state.worlds[worldId]!;
  const base = valueRate(state, content, worldId, VALUE_HORIZON_SECONDS);
  const costDelta = perkCostGrowthDelta(state, content, worldId);
  const costMult = totalCostMultiplier(state, content, worldId);
  const out: Candidate[] = [];

  if (includeGenerators) {
    for (const gen of world.generators) {
      const genState = worldState.generators[gen.id];
      if (!genState) continue;
      const delta = deltaValue(
        state,
        content,
        worldId,
        base,
        () => (genState.owned = genState.owned.add(1)),
        () => (genState.owned = genState.owned.sub(1)),
      );
      out.push({ kind: 'generator', genId: gen.id, cost: generatorCost(world, gen, genState.bought, costDelta, costMult), delta });
    }

    // Armonía (hito 8): "paquete de fila", una unidad de cada cerdito que está en el mínimo.
    if (world.mechanic === 'harmony' && world.generators.length > 0) {
      const { genIds: lowIds, cost } = rowBundleCost(state, content, worldId);
      const delta = deltaValue(
        state,
        content,
        worldId,
        base,
        () => lowIds.forEach((genId) => { const g = worldState.generators[genId]; if (g) g.owned = g.owned.add(1); }),
        () => lowIds.forEach((genId) => { const g = worldState.generators[genId]; if (g) g.owned = g.owned.sub(1); }),
      );
      out.push({ kind: 'bundle', genIds: lowIds, cost, delta });
    }
  }

  if (includeUpgrades) {
    for (const offer of availableUpgrades(state, content, worldId)) {
      const delta = deltaValue(
        state,
        content,
        worldId,
        base,
        () => (worldState.upgrades[offer.id] = true),
        () => delete worldState.upgrades[offer.id],
      );
      out.push({ kind: 'upgrade', offer, cost: offer.cost, delta });
    }
  }

  return out;
}

/** Tiempo hasta poder pagarlo + tiempo en amortizarlo. Menor es mejor (03 §4). */
function score(candidate: Candidate, currency: Decimal, incomePerSecond: Decimal): number {
  if (candidate.delta.lte(0)) return Infinity;
  const missing = candidate.cost.sub(currency);
  const wait = missing.gt(0) ? missing.div(Decimal.max(incomePerSecond, 1e-9)).toNumber() : 0;
  return wait + candidate.cost.div(candidate.delta).toNumber();
}

function execute(state: GameState, content: Content, worldId: WorldId, candidate: Candidate): boolean {
  switch (candidate.kind) {
    case 'generator':
      return buyGenerator(state, content, worldId, candidate.genId, 1) > 0;
    case 'upgrade':
      return buyUpgrade(state, content, worldId, candidate.offer.id);
    case 'bundle': {
      return buyRow(state, content, worldId);
    }
  }
}

/** Calma (hito 9): solo se compra con la calma casi llena o dentro de la ventana ya penalizada. */
function calmAllowsBuying(state: GameState, content: Content, worldId: WorldId): boolean {
  const world = getWorldDef(content, worldId);
  if (world.mechanic !== 'calm') return true;
  const worldState = state.worlds[worldId]!;
  return worldState.calm >= 0.95 || state.time < worldState.calmPenaltyUntil;
}

/**
 * Compra repetidamente el candidato de mejor puntuación mientras sea asequible. Exportada
 * (sin estar detrás de Capataz/Encargada) para que parity.test.ts pueda reproducir la compra
 * "manual" del jugador conectado de tools/sim/strategy.ts > playerAct, que llama a
 * greedyBuy(gens=true, upgrades=true) directamente — `runAutobuy`, más abajo, es solo la
 * versión gated que de verdad usa el juego cuando el jugador no está.
 */
export function greedyBuy(state: GameState, content: Content, worldId: WorldId, includeGenerators: boolean, includeUpgrades: boolean): number {
  let bought = 0;
  while (bought < MAX_BUYS_PER_STEP && calmAllowsBuying(state, content, worldId)) {
    const worldState = state.worlds[worldId]!;
    const incomePerSecond = productionPerSecond(state, content, worldId);
    const list = candidates(state, content, worldId, includeGenerators, includeUpgrades);
    if (list.length === 0) break;

    let best = list[0]!;
    let bestScore = score(best, worldState.currency, incomePerSecond);
    for (const candidate of list) {
      const candidateScore = score(candidate, worldState.currency, incomePerSecond);
      if (candidateScore < bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }
    }

    if (!isFinite(bestScore) || best.cost.gt(worldState.currency)) break;
    if (!execute(state, content, worldId, best)) break;
    bought++;
  }
  return bought;
}

/** Lo que hacen Capataz/Encargada en `worldId` cuando el jugador no está interactuando. */
export function runAutobuy(state: GameState, content: Content, worldId: WorldId): void {
  if (!state.settings.autobuyEnabled) return;
  const worldState = state.worlds[worldId];
  if (!worldState || !worldState.unlocked) return;

  const canBuyGenerators = hasPerkEffect(state, content, worldId, 'autobuyGenerators');
  const canBuyUpgrades = hasPerkEffect(state, content, worldId, 'autobuyUpgrades');
  if (!canBuyGenerators && !canBuyUpgrades) return;

  greedyBuy(state, content, worldId, canBuyGenerators, canBuyUpgrades);
}

/** Ejecuta runAutobuy en todos los mundos del contenido (lo llaman tick.ts y offline.ts). */
export function runAutobuyForAllWorlds(state: GameState, content: Content): void {
  for (const world of content.worlds) runAutobuy(state, content, world.id);
}
