// Logros: reconocimiento sin bonos (no tocan la economía). Cada uno tiene su requisito visible con
// progreso. Uno por herramienta y cantidad, más los generales; los generales se anotan en el Diario.

import { TOOLS } from './game.ts';
import { NEST } from './nest.ts';
import type { AchievementDef } from './types.ts';

/** Cantidades de cada herramienta que dan logro (y su frase). */
export const TOOL_MILESTONES: { count: number; flavor: string }[] = [
  { count: 1, flavor: 'Hay que empezar por alguna.' },
  { count: 5, flavor: 'Ya hay con qué cambiar de mano.' },
  { count: 15, flavor: 'Esto ya es un pequeño taller.' },
  { count: 25, flavor: 'El cobertizo empieza a quedarse pequeño.' },
  { count: 50, flavor: 'Media centena, y todas afiladas.' },
  { count: 75, flavor: 'Hay que contarlas dos veces.' },
  { count: 100, flavor: 'Cien, y ninguna se queda sin uso.' },
  { count: 150, flavor: 'Una fábrica entera de lo mismo.' },
  { count: 200, flavor: 'Se acabaron los sitios donde guardarlas.' },
  { count: 250, flavor: 'Nadie sabe ya cuántas son.' },
];

const fmt = (n: number) => n.toLocaleString('es-ES');

export const ACHIEVEMENTS: AchievementDef[] = [
  ...[100, 1000, 10000].map((n) => ({ id: `picar-${n}`, name: `Picar ×${fmt(n)}`, flavor: 'Tus manos ya tienen callo bueno.', requires: { kind: 'taps' as const, count: n } })),
  ...[1, 3, 5, 10, 25].map((n) => ({ id: `ascender-${n}`, name: n === 1 ? 'Primera ascensión' : `Ascender ×${n}`, flavor: 'Las esmeraldas no se las lleva nadie.', requires: { kind: 'ascensions' as const, count: n } })),
  ...[10, 100, 1000].map((n) => ({ id: `plumas-${n}`, name: `${fmt(n)} esmeraldas`, flavor: 'Un cofre entero.', requires: { kind: 'plumasTotal' as const, count: n } })),
  ...[1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e24].map((n) => ({ id: `monedas-${n}`, name: `${fmt(n)} monedas`, flavor: 'Más monedas que granos de arena en la mina.', requires: { kind: 'lifetime' as const, amount: n } })),
  ...[1, 3, 5, 8].map((n) => ({ id: `companeros-${n}`, name: n === 1 ? 'Primer compañero' : `${n} compañeros`, flavor: 'Mejor acompañado que solo.', requires: { kind: 'companionsOwned' as const, count: n } })),
  ...[1, 5, 10, 15, 20, 24].map((n) => ({ id: `mejoras-companeros-${n}`, name: n === 1 ? 'Primera mejora de compañero' : `${n} niveles de compañeros`, flavor: 'Se les nota más contentos.', requires: { kind: 'companionLevels' as const, count: n } })),
  ...[10, 50, 200, 1000].map((n) => ({ id: `cosechar-${n}`, name: `Recoger ×${fmt(n)}`, flavor: 'Con las manos llenas de tierra.', requires: { kind: 'harvests' as const, count: n } })),
  ...[1, 4, 7, 10].map((n) => ({ id: `flores-${n}`, name: n === 1 ? 'Primera flor' : `${n} flores distintas`, flavor: 'El jardín florece.', requires: { kind: 'flowersFound' as const, count: n } })),
  ...[1, 3, 5, 10].map((n) => ({ id: `brillantes-${n}`, name: n === 1 ? 'Primera flor brillante' : `${n} flores brillantes`, flavor: 'Reluce más que una moneda.', requires: { kind: 'shinyFound' as const, count: n } })),
  ...[1, 10, 25, 50, 100].map((n) => ({ id: `hornos-${n}`, name: n === 1 ? 'Primer horno' : `${n} hornos`, flavor: 'La cueva ya no se enfría.', requires: { kind: 'furnaces' as const, count: n } })),
  ...[1, 2, 3, 4].map((n) => ({ id: `dragon-etapa-${n}`, name: ['Cría de dragón', 'Dragón joven', 'Dragón adulto', 'Dragón anciano'][n - 1]!, flavor: 'Crece bien alimentado.', requires: { kind: 'dragonStage' as const, count: n } })),
  ...NEST.creatures.map((c) => ({ id: `${c.id}-adulto`, name: c.stages[3]!.name, flavor: 'Ha crecido del todo y se queda de recuerdo.', requires: { kind: 'creatureAdult' as const, creature: c.id } })),
  ...[1, 2, 3].map((n) => ({ id: `criaturas-adultas-${n}`, name: n === 1 ? 'Primera criatura adulta' : `${n} criaturas adultas`, flavor: 'El nido está lleno de vida.', requires: { kind: 'adultCount' as const, count: n } })),
  ...[1, 5, 10].map((n) => ({ id: `ventajas-dragon-${n}`, name: n === 1 ? 'Primera ventaja del dragón' : `${n} ventajas del dragón`, flavor: 'El dragón sonríe, que ya es mucho.', requires: { kind: 'caveNodes' as const, count: n } })),
  ...TOOLS.flatMap((tool) => TOOL_MILESTONES.map((m) => ({ id: `${tool.id}-${m.count}`, name: `${tool.name} ×${m.count}`, flavor: m.flavor, requires: { kind: 'toolCount' as const, tool: tool.id, count: m.count } }))),
];
