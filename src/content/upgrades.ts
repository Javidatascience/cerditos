// Nombres de las mejoras por cerdito. Ver docs/02-arquitectura.md §7: las mejoras por
// cerdito se generan a partir de `WorldDef.genUpgrades` (umbrales, multiplicador, factor de
// coste) con una función del motor; aquí solo viven los NOMBRES, una plantilla por umbral,
// igual para todos los cerditos del mundo. El nombre final compone la plantilla con el
// nombre del cerdito, p. ej. "Lechón: Comedero doble".
//
// La Huerta no tiene mejoras por cerdito (mecánica "harmony", 01 §7): su lista está vacía.

import type { GeneratorDef } from './types.ts';
import type { WorldId } from '../core/state.ts';

export const GENERATOR_UPGRADE_TEMPLATES: Record<WorldId, string[]> = {
  valle: [
    'Comedero doble',
    'Paja fresca a diario',
    'Cepillado semanal',
    'Charca ampliada',
    'Sombra extra en el corral',
    'Ración de manzana',
    'Refuerzo de la valla',
    'Suite de invierno',
  ],
  bosque: [
    'Nariz fina',
    'Ruta de robles marcada',
    'Cesta más grande',
    'Turno de noche',
    'Mapa actualizado',
    'Reserva de trufas secreta',
  ],
  huerta: [],
  balneario: [
    'Toalla extra mullida',
    'Turno de tarde',
    'Aceite de lavanda',
    'Reserva anticipada',
    'Música relajante',
    'Sillón reclinable',
  ],
};

/** Nombre visible de la mejora nº `level` (0-indexada) del cerdito `gen` en el mundo `worldId`. */
export function generatorUpgradeName(worldId: WorldId, gen: GeneratorDef, level: number): string {
  const templates = GENERATOR_UPGRADE_TEMPLATES[worldId] ?? [];
  const template = templates[level] ?? `Mejora ${level + 1}`;
  return `${gen.name}: ${template}`;
}
