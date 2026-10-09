// Sinergias (como las de Cookie Clicker): mejoras que ligan dos herramientas vecinas. Se desbloquean al
// tener cierta cantidad de las dos; al comprarlas, cada herramienta gana un % de producción por cada
// unidad de la otra. Se pierden al ascender, como las demás mejoras de la ronda.

import { GAME, TOOLS } from './game.ts';
import type { SynergyDef } from './types.ts';

const NAMES: [string, string][] = [
  ['Pico y cubo', 'El cubo recoge lo que el pico suelta.'],
  ['Cubo y martillo', 'Cada golpe deja piedra suelta para la pala.'],
  ['Martillo y hacha', 'Uno parte la roca y el otro, la raíz.'],
  ['Hacha y dinamita', 'Despejan el camino para un estruendo mayor.'],
  ['Dinamita y taladro', 'El taladro entra justo por la grieta.'],
  ['Taladro y excavadora', 'Vapor para el pistón, vapor para el motor.'],
  ['Excavadora y grúa', 'La grúa levanta lo que la pala remueve.'],
  ['Grúa y láser', 'Cortes limpios desde las alturas.'],
  ['Láser y plasma', 'Dos haces que se entienden sin hablar.'],
  ['Plasma y cohete', 'Una chispa para encender el despegue.'],
  ['Cohete y agujero negro', 'Lo que sube, baja… hacia dentro.'],
  ['Agujero y tiempo', 'Lo que traga hoy, lo devuelve ayer.'],
  ['Tiempo y prisma', 'Una luz que llega antes de encenderse.'],
  ['Prisma y dado', 'Siete colores y todos de buena suerte.'],
  ['Dado y fractal', 'Cada tirada se repite dentro de sí misma.'],
  ['Fractal y consola', 'Un bucle infinito, pero a nuestro favor.'],
  ['Consola y universo', 'El universo corre en la consola; la consola, en el universo.'],
];

/** Un tramo de pares cada vez más exigente: 15, 25 y 50 unidades de cada una. */
function needFor(pair: number): number {
  return pair < 6 ? 15 : pair < 12 ? 25 : 50;
}

export const SYNERGIES: SynergyDef[] = NAMES.map(([name, flavor], pair) => {
  const a = TOOLS[pair]!;
  const b = TOOLS[pair + 1]!;
  const need = needFor(pair);
  return {
    id: `sinergia-${a.id}-${b.id}`,
    name,
    flavor,
    a: a.id,
    b: b.id,
    need,
    // unas 20 veces el precio de la unidad de la herramienta mayor en el momento de desbloquearla
    cost: Math.round(b.baseCost * GAME.costGrowth ** need * 20),
    aPerB: 0.005,
    bPerA: 0.001,
  };
});
