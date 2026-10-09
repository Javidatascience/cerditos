// La Cueva del Dragón: mini mundo aparte con su propia moneda (brasas), hornos y un árbol de
// ventajas por ramas. Se abre al conseguir 3 esmeraldas en total y es permanente (no se reinicia al ascender).

import type { CaveDef } from './types.ts';

export const CAVE: CaveDef = {
  unlockPlumas: 3,
  dragon: [
    { id: 'huevo', name: 'Huevo', flavor: 'Late despacio, calentito entre las brasas.', cost: 0, prodMult: 1, embersMult: 1 },
    { id: 'cria', name: 'Cría de dragón', flavor: 'Acaba de romper el cascarón y ya tiene hambre.', cost: 2e4, prodMult: 1.05, embersMult: 1.2 },
    { id: 'joven', name: 'Dragón joven', flavor: 'Escupe chispas y persigue a las gallinas.', cost: 1e6, prodMult: 1.08, embersMult: 1.3 },
    { id: 'adulto', name: 'Dragón adulto', flavor: 'Con las alas abiertas tapa media cueva.', cost: 1e8, prodMult: 1.1, embersMult: 1.4 },
    { id: 'anciano', name: 'Dragón anciano', flavor: 'Sabio, barbudo y dueño de todo el tesoro.', cost: 1.5e10, prodMult: 1.15, embersMult: 1.5 },
  ],
  furnaceGrowth: 1.28,
  furnaceMilestones: [10, 25, 50],
  /** Solo la primera hora de ausencia da brasas. */
  offlineEmbersSeconds: 3600,
  /** Segundos entre soplidos. */
  blowCooldown: 3,
  /** Un soplido da esto en segundos de producción de brasas (mínimo 1 brasa). */
  blowSeconds: 5,
  furnaces: [
    { id: 'brasero', name: 'Brasero', emoji: '🔥', flavor: 'Un montoncito de carbón que no se apaga.', baseCost: 15, baseProd: 0.2 },
    { id: 'fragua', name: 'Fragua', emoji: '⚒️', flavor: 'El dragón sopla y el hierro se pone al rojo.', baseCost: 150, baseProd: 1.5 },
    { id: 'horno-de-roca', name: 'Horno de roca', emoji: '🪨', flavor: 'Guarda el calor durante días.', baseCost: 1800, baseProd: 12 },
    { id: 'corazon-de-lava', name: 'Corazón de lava', emoji: '🌋', flavor: 'Late justo debajo de la cueva.', baseCost: 22000, baseProd: 100 },
    { id: 'mina-de-azufre', name: 'Mina de azufre', emoji: '🟡', flavor: 'Huele fatal, pero arde de maravilla.', baseCost: 300000, baseProd: 900 },
  ],
  branches: [
    { id: 'fuego', name: 'Fuego', emoji: '🔥' },
    { id: 'escamas', name: 'Escamas', emoji: '🛡️' },
    { id: 'tesoro', name: 'Tesoro', emoji: '💰' },
  ],
  nodes: [
    { id: 'fuego-interior', branch: 'fuego', name: 'Fuego interior', flavor: 'El dragón respira más hondo.', cost: 5000, requires: null, effect: { kind: 'embers', value: 1.5 } },
    { id: 'aliento-frecuente', branch: 'fuego', name: 'Aliento cálido', flavor: 'Calienta las patitas.', cost: 1e5, requires: 'fuego-interior', effect: { kind: 'momentumMax', value: 0.1 } },
    { id: 'llama-eterna', branch: 'fuego', name: 'Llama eterna', flavor: 'Nunca se apaga, ni de noche.', cost: 4e6, requires: 'aliento-frecuente', effect: { kind: 'embers', value: 2 } },
    { id: 'aliento-ardiente', branch: 'fuego', name: 'Aliento ardiente', flavor: 'Un soplo de fuego más.', cost: 2e8, requires: 'llama-eterna', effect: { kind: 'momentumMax', value: 0.15 } },
    { id: 'pulmones-de-fragua', branch: 'fuego', name: 'Pulmones de fragua', flavor: 'Cada soplido sale como de un fuelle.', cost: 3e9, requires: 'aliento-ardiente', effect: { kind: 'blow', value: 2 } },
    { id: 'escamas-de-bronce', branch: 'escamas', name: 'Escamas de bronce', flavor: 'Brillan y dan suerte a la mina.', cost: 2e4, requires: null, effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'escamas-de-plata', branch: 'escamas', name: 'Escamas de plata', flavor: 'Más duras que el mejor pico.', cost: 5e5, requires: 'escamas-de-bronce', effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'escamas-de-oro', branch: 'escamas', name: 'Escamas de oro', flavor: 'El cerdito se mira en ellas.', cost: 2e7, requires: 'escamas-de-plata', effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'escamas-de-diamante', branch: 'escamas', name: 'Escamas de diamante', flavor: 'Lo más duro que ha visto la mina.', cost: 4e9, requires: 'escamas-de-oro', effect: { kind: 'prodMult', value: 1.1 } },
    { id: 'cesta-honda', branch: 'tesoro', name: 'Cesta honda', flavor: 'Cabe más producción esperando.', cost: 1e4, requires: null, effect: { kind: 'basketSeconds', value: 900 } },
    { id: 'ojo-de-dragon', branch: 'tesoro', name: 'Ojo de dragón', flavor: 'Ve venir al cerdito viajero.', cost: 3e5, requires: 'cesta-honda', effect: { kind: 'visitorStay', value: 5 } },
    { id: 'tesoro-dormido', branch: 'tesoro', name: 'Tesoro dormido', flavor: 'El tesoro sigue creciendo mientras no estás.', cost: 1e7, requires: 'ojo-de-dragon', effect: { kind: 'offlineHours', value: 1 } },
    { id: 'forja-barata', branch: 'tesoro', name: 'Forja barata', flavor: 'El dragón regatea con los herreros.', cost: 5e8, requires: 'tesoro-dormido', effect: { kind: 'furnaceCost', value: 0.85 } },
  ],
};
