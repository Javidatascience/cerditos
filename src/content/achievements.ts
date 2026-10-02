// Logros: reconocimiento sin bonos (no tocan la economía). Cada uno tiene su requisito visible
// con progreso, igual que las variedades. Se anotan en el Diario al conseguirlos.

import type { AchievementDef } from './types.ts';

export const ACHIEVEMENTS: AchievementDef[] = [
  // Valle
  { id: 'primer-lechon', name: 'Primer lechón', flavor: 'Todo gran corral empieza con uno.', requires: { kind: 'genCount', world: 'valle', gen: 'lechon', count: 1 } },
  { id: 'corral-lleno', name: 'Corral lleno', flavor: 'Ya no cabe ni una bellota más.', requires: { kind: 'genCount', world: 'valle', gen: 'lechon', count: 50 } },
  { id: 'gran-blanco-a-la-vista', name: 'Gran Blanco a la vista', flavor: 'Llega despacio, ocupa todo el camino.', requires: { kind: 'genCount', world: 'valle', gen: 'gran-blanco', count: 1 } },
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
  { id: 'espiritu-del-bosque', name: 'Una sombra entre los robles', flavor: 'Alguien te mira, y es amable.', requires: { kind: 'genCount', world: 'bosque', gen: 'espiritu-del-bosque', count: 1 } },
  { id: 'primer-vuelo-bosque', name: 'Vuelo entre las copas', flavor: 'Las ramas se apartan para dejarlos pasar.', requires: { kind: 'ascensions', world: 'bosque', count: 1 } },
  // Huerta
  { id: 'filas-10', name: 'Diez filas bien rectas', flavor: 'Ni una calabaza fuera de su sitio.', requires: { kind: 'harmony', world: 'huerta', count: 10 } },
  { id: 'filas-100', name: 'Cien filas en armonía', flavor: 'Hasta las abejas siguen el compás.', requires: { kind: 'harmony', world: 'huerta', count: 100 } },
  // Balneario
  { id: 'paz-interior', name: 'Paz interior', flavor: 'El cerdo zen sonríe sin que nadie sepa por qué.', requires: { kind: 'genCount', world: 'balneario', gen: 'cerdo-zen', count: 1 } },
  // Colección
  { id: 'album-con-huecos', name: 'Álbum con huecos', flavor: 'Cinco caras nuevas en la familia.', requires: { kind: 'varietyCount', count: 5 } },
  { id: 'medio-album', name: 'Medio álbum', flavor: 'Mitad del camino, y todavía hay galletas.', requires: { kind: 'varietyCount', count: 14 } },
  { id: 'album-completo', name: 'Álbum completo', flavor: 'Pancho ya tiene con quién jugar.', requires: { kind: 'varietyCount', count: 28 } },
];
