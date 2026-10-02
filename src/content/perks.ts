// Árbol de ventajas permanentes. Mismo patrón en los 4 mundos (docs/01-diseno-juego.md §6):
// un pequeño constructor evita repetir 40 veces la misma estructura, pero solo ensambla
// datos — ninguna lógica de juego vive aquí (esa está en core/formulas.ts, hito 5).
// Ver docs/03-economia.md §6 y §8 para el razonamiento y los números finales.

import { balneario } from './worlds/balneario.ts';
import { bosque } from './worlds/bosque.ts';
import { huerta } from './worlds/huerta.ts';
import { valle } from './worlds/valle.ts';
import type { PerkDef, PerkEffect } from './types.ts';
import type { WorldId } from '../core/state.ts';

// La primera fila (Buen comienzo…Hermandad de granjas) cuesta ×10 en el Valle y el Bosque
// respecto a la Huerta y el Balneario: con el mismo coste en los 4 mundos, el árbol del
// Valle se completaba en las primeras 12 h de juego (decisiones sin peso); con ×10 se reparte
// entre el día 1 y el día 6 (03 §6, §10). La segunda fila (Establo, Raíces) tiene un coste
// base propio por mundo, ya absoluto y proporcional a las plumas típicas de cada uno.
const FIRST_ROW_SCALE: Record<WorldId, number> = { [valle.id]: 10, [bosque.id]: 10, [huerta.id]: 1, [balneario.id]: 1 };
const LATE_ROW_BASE: Record<WorldId, number> = { [valle.id]: 200000, [bosque.id]: 200000, [huerta.id]: 5000, [balneario.id]: 5000 };

function perksForWorld(world: WorldId): PerkDef[] {
  const scale = FIRST_ROW_SCALE[world] ?? 1;
  const lateBase = LATE_ROW_BASE[world] ?? 5000;
  const id = (local: string) => `${world}.${local}`;
  const p = (
    local: string,
    name: string,
    flavor: string,
    maxLevel: number | null,
    baseCost: number,
    costGrowth: number,
    requires: string[],
    effect: PerkEffect,
  ): PerkDef => ({ id: id(local), world, name, flavor, maxLevel, baseCost, costGrowth, requires: requires.map(id), effect });

  return [
    p('abono', 'Abono de calidad', 'Cada saco hace que los cerditos crezcan un poco más felices y más deprisa.', null, 2, 1.4, [], {
      kind: 'prodMult',
      perLevel: 1.1,
    }),
    p('comienzo', 'Buen comienzo', 'Empieza cada ronda con la despensa ya llena.', 5, 3 * scale, 3, ['abono'], {
      kind: 'startCurrency',
      perLevel: 25,
    }),
    p('ahorro', 'Regateo en la feria', 'En el mercado, todo cuesta un poco menos si sabes regatear.', 5, 6 * scale, 2.2, ['abono'], {
      kind: 'costMult',
      perLevel: 0.93,
    }),
    p(
      'mejoras',
      'Herramientas heredadas',
      'De generación en generación, las mejoras salen más baratas.',
      3,
      12 * scale,
      3,
      ['abono'],
      { kind: 'upgradeCostMult', perLevel: 0.75 },
    ),
    p('vuelo', 'Plumas al viento', 'Cada vuelo deja un poco más de plumas en el suelo.', 5, 25 * scale, 2.5, ['ahorro'], {
      kind: 'plumaMult',
      perLevel: 0.15,
    }),
    p('puente', 'Hermandad de granjas', 'Las granjas se ayudan entre ellas, aunque estén lejos.', 5, 60 * scale, 2.2, ['vuelo'], {
      kind: 'crossProd',
      perLevel: 0.1,
    }),
    p(
      'establo',
      'Establo ampliado',
      'Más sitio, y los cerditos no notan tanto que hay más vecinos.',
      4,
      lateBase,
      4,
      ['puente'],
      { kind: 'costGrowthDelta', perLevel: 0.0025 },
    ),
    p(
      'raices',
      'Raíces profundas',
      'Cuantas más raíces, más aguanta el bono de las plumas.',
      5,
      lateBase * 2,
      3,
      ['puente'],
      { kind: 'perPlumaBonus', perLevel: 0.01 },
    ),
  ];
}

const WORLD_IDS: WorldId[] = [valle.id, bosque.id, huerta.id, balneario.id];

export const PERKS: PerkDef[] = WORLD_IDS.flatMap((w) => perksForWorld(w));
