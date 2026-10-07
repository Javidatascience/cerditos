// La Cueva del Dragón: mini mundo aparte con su propia moneda (brasas), hornos y un árbol de
// ventajas por ramas. Se abre al conseguir 10 plumas en total y es permanente (no se reinicia al ascender).

import type { CaveDef } from './types.ts';

export const CAVE: CaveDef = {
  unlockPlumas: 10,
  furnaceGrowth: 1.15,
  /** Segundos entre soplidos. */
  blowCooldown: 4,
  /** Un soplido da esto en segundos de producción de brasas (mínimo 1 brasa). */
  blowSeconds: 5,
  furnaces: [
    { id: 'brasero', name: 'Brasero', emoji: '🔥', flavor: 'Un montoncito de carbón que no se apaga.', baseCost: 15, baseProd: 0.2 },
    { id: 'fragua', name: 'Fragua', emoji: '⚒️', flavor: 'El dragón sopla y el hierro se pone al rojo.', baseCost: 150, baseProd: 1.5 },
    { id: 'horno-de-roca', name: 'Horno de roca', emoji: '🪨', flavor: 'Guarda el calor durante días.', baseCost: 1800, baseProd: 12 },
    { id: 'corazon-de-lava', name: 'Corazón de lava', emoji: '🌋', flavor: 'Late justo debajo de la cueva.', baseCost: 22000, baseProd: 100 },
  ],
  branches: [
    { id: 'fuego', name: 'Fuego', emoji: '🔥' },
    { id: 'escamas', name: 'Escamas', emoji: '🛡️' },
    { id: 'tesoro', name: 'Tesoro', emoji: '💰' },
  ],
  nodes: [
    { id: 'fuego-interior', branch: 'fuego', name: 'Fuego interior', flavor: 'El dragón respira más hondo.', cost: 50, requires: null, effect: { kind: 'embers', value: 1.5 } },
    { id: 'aliento-frecuente', branch: 'fuego', name: 'Aliento cálido', flavor: 'Calienta las patitas: +0,1 al tope de la inercia.', cost: 400, requires: 'fuego-interior', effect: { kind: 'momentumMax', value: 0.1 } },
    { id: 'llama-eterna', branch: 'fuego', name: 'Llama eterna', flavor: 'Nunca se apaga, ni de noche.', cost: 3000, requires: 'aliento-frecuente', effect: { kind: 'embers', value: 2 } },
    { id: 'aliento-ardiente', branch: 'fuego', name: 'Aliento ardiente', flavor: 'Un soplo de fuego más: +0,15 al tope de la inercia.', cost: 20000, requires: 'llama-eterna', effect: { kind: 'momentumMax', value: 0.15 } },
    { id: 'escamas-de-bronce', branch: 'escamas', name: 'Escamas de bronce', flavor: 'Brillan y dan suerte a la mina.', cost: 200, requires: null, effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'escamas-de-plata', branch: 'escamas', name: 'Escamas de plata', flavor: 'Más duras que el mejor pico.', cost: 2500, requires: 'escamas-de-bronce', effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'escamas-de-oro', branch: 'escamas', name: 'Escamas de oro', flavor: 'El cerdito se mira en ellas.', cost: 25000, requires: 'escamas-de-plata', effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'cesta-honda', branch: 'tesoro', name: 'Cesta honda', flavor: 'La cesta aguanta 15 min más.', cost: 300, requires: null, effect: { kind: 'basketSeconds', value: 900 } },
    { id: 'ojo-de-dragon', branch: 'tesoro', name: 'Ojo de dragón', flavor: 'Ve venir al cerdito viajero: se queda 5 s más.', cost: 4000, requires: 'cesta-honda', effect: { kind: 'visitorStay', value: 5 } },
    { id: 'tesoro-dormido', branch: 'tesoro', name: 'Tesoro dormido', flavor: 'Una hora más de producción mientras no estás.', cost: 30000, requires: 'ojo-de-dragon', effect: { kind: 'offlineHours', value: 1 } },
  ],
};
