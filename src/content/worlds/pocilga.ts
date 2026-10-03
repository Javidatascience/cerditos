// La Pocilga — mecánica de fusión: compras cochinillos y, al juntar dos cerdos del mismo nivel,
// evolucionan en uno del nivel siguiente (que produce ×3). Hay un número limitado de huecos
// (`merge.slots`), así que fusionar es lo que libera sitio para seguir creciendo.
// Es un mundo abierto desde el principio: no hay que desbloquearlo.
// (Idea de juego de fusión; nombres, textos y dibujos son propios.)

import type { WorldDef } from '../types.ts';

export const pocilga: WorldDef = {
  id: 'pocilga',
  name: 'La Pocilga',
  currency: 'Monedas',
  prestigeCurrency: 'Plumas de la Pocilga',
  mechanic: 'merge',
  costGrowth: 1.04, // solo se compra el nivel 0; los demás nacen de fusionar
  startCurrency: 30,
  merge: { slots: 12 },
  generators: [
    { id: 'cochinillo', name: 'Cochinillo', flavor: 'Recién llegado y ya quiere jugar con todos.', baseCost: 10, baseProd: 0.5 },
    { id: 'cerdito', name: 'Cerdito', flavor: 'Ha descubierto el barro y no piensa soltarlo.', baseCost: 10, baseProd: 1.5 },
    { id: 'cerdo-joven', name: 'Cerdo joven', flavor: 'Todo patas y entusiasmo.', baseCost: 10, baseProd: 4.5 },
    { id: 'cerdo-robusto', name: 'Cerdo robusto', flavor: 'Tiene un buen apetito y una buena sombra.', baseCost: 10, baseProd: 13.5 },
    { id: 'verraco', name: 'Verraco', flavor: 'Camina con la cabeza alta por el corral.', baseCost: 10, baseProd: 40.5 },
    { id: 'cerdo-de-feria', name: 'Cerdo de feria', flavor: 'Ya tiene una cinta colgada en la cuadra.', baseCost: 10, baseProd: 121.5 },
    { id: 'cerdo-campeon', name: 'Cerdo campeón', flavor: 'Sale en las fotos sin que nadie se lo pida.', baseCost: 10, baseProd: 364.5 },
    { id: 'cerdo-alado', name: 'Cerdo alado', flavor: 'Las alas son pequeñas, pero la fe es enorme.', baseCost: 10, baseProd: 1093.5 },
    { id: 'cerdo-estelar', name: 'Cerdo estelar', flavor: 'Deja un rastro de purpurina por donde pasa.', baseCost: 10, baseProd: 3280.5 },
    { id: 'cerdo-cosmico', name: 'Cerdo cósmico', flavor: 'Se dice que ronca al ritmo de las estrellas.', baseCost: 10, baseProd: 9841.5 },
  ],
  genUpgrades: null,
  globalUpgrades: [
    { id: 'comedero-grande', name: 'Comedero grande', flavor: 'Caben dos hocicos a la vez, y ninguno discute.', cost: 5000, mult: 1.5 },
    { id: 'barro-tibio', name: 'Barro tibio', flavor: 'Siempre a la temperatura justa.', cost: 5e5, mult: 1.5 },
    { id: 'paja-dorada', name: 'Paja dorada', flavor: 'Brilla un poco, por si acaso alguien mira.', cost: 5e7, mult: 1.5 },
    { id: 'musica-de-feria', name: 'Música de feria', flavor: 'Los cerdos mueven la cola al compás.', cost: 5e9, mult: 1.5 },
    { id: 'cena-de-gala', name: 'Cena de gala', flavor: 'Con servilleta y todo.', cost: 5e11, mult: 1.5 },
  ],
  prestige: { e0: 1e6, exponent: 0.3, perPluma: 0.05 },
  unlock: null,
  flavor: 'Aquí los cerdos se juntan, se parecen y acaban evolucionando en algo mejor.',
};
