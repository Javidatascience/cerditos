// Logros: reconocimiento sin bonos (no tocan la economía). Cada uno tiene su requisito visible con
// progreso. Uno por herramienta y cantidad, más los generales; los generales se anotan en el Diario.

import { TOOLS } from './game.ts';
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
  ...[1, 3, 5, 10, 25].map((n) => ({ id: `ascender-${n}`, name: n === 1 ? 'Primera ascensión' : `Ascender ×${n}`, flavor: 'Las plumas no se las lleva el viento.', requires: { kind: 'ascensions' as const, count: n } })),
  ...[10, 100, 1000].map((n) => ({ id: `plumas-${n}`, name: `${fmt(n)} plumas`, flavor: 'Un almohadón entero.', requires: { kind: 'plumasTotal' as const, count: n } })),
  ...[1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e24].map((n) => ({ id: `monedas-${n}`, name: `${fmt(n)} monedas`, flavor: 'Más monedas que granos de arena en la mina.', requires: { kind: 'lifetime' as const, amount: n } })),
  ...TOOLS.flatMap((tool) => TOOL_MILESTONES.map((m) => ({ id: `${tool.id}-${m.count}`, name: `${tool.name} ×${m.count}`, flavor: m.flavor, requires: { kind: 'toolCount' as const, tool: tool.id, count: m.count } }))),
];
