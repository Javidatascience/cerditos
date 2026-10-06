// Logros: reconocimiento sin bonos (no tocan la economía). Cada uno tiene su requisito visible
// con progreso. Los de profundidad, ascensiones y plumas se anotan en el Diario.

import { PIECES } from './mine.ts';
import type { AchievementDef } from './types.ts';

const DEPTHS: { count: number; name: string; flavor: string }[] = [
  { count: 10, name: 'Primeros metros', flavor: 'Ya huele a tierra mojada.' },
  { count: 20, name: 'Fin de la tierra blanda', flavor: 'Lo fácil se ha acabado.' },
  { count: 40, name: 'Arcilla y barro', flavor: 'Las botas ya tienen historia.' },
  { count: 60, name: 'Bajo la roca', flavor: 'Aquí abajo el silencio pesa.' },
  { count: 80, name: 'Fuera las luces', flavor: 'Menos mal que hay linterna.' },
  { count: 100, name: 'Cien niveles', flavor: 'Cuesta recordar cómo era el sol.' },
  { count: 120, name: 'Cristales por todas partes', flavor: 'Brillan más que las monedas.' },
  { count: 140, name: 'Tocando el magma', flavor: 'Calentito, pero demasiado.' },
  { count: 160, name: 'El abismo', flavor: 'Nadie ha vuelto a contar los niveles.' },
  { count: 200, name: 'Doscientos niveles', flavor: 'Hasta los topos se han quedado atrás.' },
  { count: 300, name: 'Más hondo que nunca', flavor: 'Ya casi se oyen las estrellas.' },
];

const fmt = (n: number) => n.toLocaleString('es-ES');

export const ACHIEVEMENTS: AchievementDef[] = [
  ...DEPTHS.map((d) => ({ id: `nivel-${d.count}`, name: d.name, flavor: d.flavor, requires: { kind: 'depth' as const, count: d.count } })),
  ...[100, 1000, 10000, 100000].map((n) => ({ id: `bloques-${n}`, name: `${fmt(n)} bloques`, flavor: 'Una mina entera hecha migas.', requires: { kind: 'blocks' as const, count: n } })),
  ...[100, 1000, 10000].map((n) => ({ id: `picar-${n}`, name: `Picar ×${fmt(n)}`, flavor: 'Tus manos ya tienen callo bueno.', requires: { kind: 'taps' as const, count: n } })),
  ...[1, 3, 5, 10, 25].map((n) => ({ id: `subir-${n}`, name: n === 1 ? 'Primera subida' : `Subir ×${n}`, flavor: 'La superficie ya sabe a casa.', requires: { kind: 'ascensions' as const, count: n } })),
  ...[10, 100, 1000].map((n) => ({ id: `plumas-${n}`, name: `${fmt(n)} plumas`, flavor: 'Un almohadón entero.', requires: { kind: 'plumasTotal' as const, count: n } })),
  ...PIECES.flatMap((p) =>
    [10, 25, 50, 100].map((n) => ({ id: `${p.id}-${n}`, name: `${p.name} nivel ${n}`, flavor: p.flavor, requires: { kind: 'pieceLevel' as const, piece: p.id, count: n } })),
  ),
];
