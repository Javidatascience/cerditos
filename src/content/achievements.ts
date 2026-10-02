// Logros: reconocimiento sin bonos (no tocan la economía). Cada uno tiene su requisito visible
// con progreso, igual que las variedades. Se anotan en el Diario al conseguirlos.

import type { AchievementDef } from './types.ts';
import { balneario } from './worlds/balneario.ts';
import { bosque } from './worlds/bosque.ts';
import { huerta } from './worlds/huerta.ts';
import { valle } from './worlds/valle.ts';

/** Cantidades de cada cerdito que dan logro (y su frase). Una serie igual para todos los cerditos. */
export const GENERATOR_MILESTONES: { count: number; flavor: string }[] = [
  { count: 1, flavor: 'Hay que empezar por alguno.' },
  { count: 15, flavor: 'Ya hacen compañía.' },
  { count: 25, flavor: 'Esto ya es una pandilla.' },
  { count: 50, flavor: 'Media centena, y todos con apetito.' },
  { count: 100, flavor: 'Cien, y ninguno se queda atrás.' },
  { count: 150, flavor: 'Ya hay que contarlos dos veces.' },
  { count: 200, flavor: 'Un pequeño pueblo de cerditos.' },
  { count: 250, flavor: 'Se acabaron los nombres propios.' },
  { count: 300, flavor: 'Nadie sabe ya cuántos son.' },
  { count: 350, flavor: 'Corral, pueblo, comarca…' },
  { count: 400, flavor: 'El récord de toda la comarca.' },
];

/** Un logro por cada cerdito y cada cantidad de la serie (id `${cerdito}-${cantidad}`). */
const GENERATOR_ACHIEVEMENTS: AchievementDef[] = [valle, bosque, huerta, balneario].flatMap((world) =>
  world.generators.flatMap((gen) =>
    GENERATOR_MILESTONES.map((m) => ({
      id: `${gen.id}-${m.count}`,
      name: `${gen.name} ×${m.count}`,
      flavor: m.flavor,
      requires: { kind: 'genCount' as const, world: world.id, gen: gen.id, count: m.count },
    })),
  ),
);

export const ACHIEVEMENTS: AchievementDef[] = [
  ...GENERATOR_ACHIEVEMENTS,
  // Valle
  { id: 'primer-vuelo', name: 'Primer vuelo', flavor: 'Las plumas no se las lleva el viento.', requires: { kind: 'ascensions', world: 'valle', count: 1 } },
  { id: 'vuelo-habitual', name: 'Vuelo habitual', flavor: 'Ya ni miran hacia arriba cuando despegan.', requires: { kind: 'ascensions', world: 'valle', count: 10 } },
  { id: 'almohada-de-plumas', name: 'Almohada de plumas', flavor: 'Se duerme de maravilla.', requires: { kind: 'plumasTotal', world: 'valle', count: 100 } },
  { id: 'mil-millones', name: 'Mil millones de bellotas', flavor: 'Más bellotas que granos de arena en el corral.', requires: { kind: 'lifetime', world: 'valle', amount: 1e9 } },
  // Rascar
  { id: 'rascabarrigas', name: 'Rascabarrigas', flavor: 'Tus manos ya tienen callo bueno.', requires: { kind: 'taps', count: 100 } },
  { id: 'rascabarrigas-experto', name: 'Rascabarrigas experto', flavor: 'Los cerditos hacen cola.', requires: { kind: 'taps', count: 1000 } },
  // Mundos
  { id: 'bosque-abierto', name: 'El bosque te espera', flavor: 'Huele a tierra mojada y a trufa.', requires: { kind: 'worldUnlocked', world: 'bosque' } },
  { id: 'huerta-abierta', name: 'Huerta en flor', flavor: 'Ocho parcelas y ninguna prisa.', requires: { kind: 'worldUnlocked', world: 'huerta' } },
  { id: 'balneario-abierto', name: 'Con la toalla al hombro', flavor: 'Por fin, un sitio para no hacer nada.', requires: { kind: 'worldUnlocked', world: 'balneario' } },
  // Bosque
  { id: 'primer-vuelo-bosque', name: 'Vuelo entre las copas', flavor: 'Las ramas se apartan para dejarlos pasar.', requires: { kind: 'ascensions', world: 'bosque', count: 1 } },
  // Huerta
  { id: 'filas-10', name: 'Diez filas bien rectas', flavor: 'Ni una calabaza fuera de su sitio.', requires: { kind: 'harmony', world: 'huerta', count: 10 } },
  { id: 'filas-100', name: 'Cien filas en armonía', flavor: 'Hasta las abejas siguen el compás.', requires: { kind: 'harmony', world: 'huerta', count: 100 } },
  // Balneario
  // Colección
  { id: 'album-con-huecos', name: 'Álbum con huecos', flavor: 'Cinco caras nuevas en la familia.', requires: { kind: 'varietyCount', count: 5 } },
  { id: 'medio-album', name: 'Medio álbum', flavor: 'Mitad del camino, y todavía hay galletas.', requires: { kind: 'varietyCount', count: 14 } },
  { id: 'album-completo', name: 'Álbum completo', flavor: 'Pancho ya tiene con quién jugar.', requires: { kind: 'varietyCount', count: 28 } },
];
