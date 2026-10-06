// Tipos del contenido del juego (datos declarativos). Ver docs/06-mina.md.
// El motor (src/core/) no menciona ninguna zona, pieza ni ventaja por nombre: todo sale de aquí.

export type ZoneId = string;
export type MaterialId = string;
export type HazardId = string;
export type PieceId = string;
export type PerkId = string;

export interface MaterialDef {
  id: MaterialId;
  name: string;
  emoji: string;
}

export interface HazardDef {
  id: HazardId;
  name: string;
  emoji: string;
}

/** Una zona de la mina: ocupa `zoneLength` niveles a partir de `index * zoneLength + 1`. */
export interface ZoneDef {
  id: ZoneId;
  name: string;
  emoji: string;
  flavor: string;
  /** Material que sueltan sus bloques. */
  material: MaterialId;
  /** Peligro de la zona (frena el cavado si no tienes la pieza que lo resiste), o null. */
  hazard: HazardId | null;
}

/** Números del cavado. Todo el equilibrio de la mina está aquí. */
export interface MineDef {
  /** Niveles por zona. */
  zoneLength: number;
  /** Vida del bloque del nivel d: hpBase · hpGrowth^(d-1). */
  hpBase: number;
  hpGrowth: number;
  /** Monedas del bloque del nivel d: coinBase · coinGrowth^(d-1). */
  coinBase: number;
  coinGrowth: number;
  /** Cavado base del cerdito sin piezas (daño por segundo). */
  baseDps: number;
  /** Segundos de cavado que equivalen a un toque ("Picar"). */
  tapSeconds: number;
  /** Monedas con las que empieza cada ronda. */
  startCoins: number;
  /** Con la resistencia a cero, el cavado queda en esta fracción (0..1). */
  hazardFloor: number;
  /** Multiplicador por cada hito de nivel de una pieza (×2 a los niveles de `milestones`). */
  milestones: number[];
  milestoneMult: number;
  /** Plumas al subir: floor(plumaCoef · profundidad^plumaExp · bonos). */
  plumaCoef: number;
  plumaExp: number;
  /** Bono de producción por cada pluma ganada (histórico). */
  perPluma: number;
  /** Horas de producción offline base (las ventajas las amplían). */
  offlineHours: number;
}

export type PieceEffect =
  /** +dps por nivel (se suma al cavado). */
  | { kind: 'dig'; perLevel: number }
  /** +dps por nivel, como "ayudante" (se suma igual que dig, pero es un compañero). */
  | { kind: 'helper'; perLevel: number }
  /** Multiplica el cavado por (1 + perLevel · nivel). */
  | { kind: 'digMult'; perLevel: number }
  /** Cada toque equivale a más segundos de cavado: ×(1 + perLevel · nivel). */
  | { kind: 'tap'; perLevel: number }
  /** Multiplica las monedas por bloque por (1 + perLevel · nivel). */
  | { kind: 'coinMult'; perLevel: number }
  /** Multiplica los materiales por bloque por (1 + perLevel · nivel). */
  | { kind: 'materialMult'; perLevel: number }
  /** Habilidad activa: avanza `baseSeconds + perLevel · nivel` segundos de cavado de golpe. */
  | { kind: 'burst'; baseSeconds: number; perLevel: number; cooldown: number }
  /** Resiste un peligro: con el nivel `needBase + needStep · zona` no hay penalización. */
  | { kind: 'resist'; hazard: HazardId; needBase: number; needStep: number };

export interface PieceDef {
  id: PieceId;
  name: string;
  emoji: string;
  flavor: string;
  effect: PieceEffect;
  /** Coste en monedas del nivel L → L+1: baseCost · costGrowth^L. */
  baseCost: number;
  costGrowth: number;
  /** Material del coste (ceil(materialBase · 1,12^L) unidades), o null si solo cuesta monedas. */
  material: MaterialId | null;
  materialBase: number;
  maxLevel: number;
  /** Se desbloquea al haber llegado a este nivel de la mina y al haber subido a la superficie estas veces. */
  unlock: { depth: number; ascensions: number };
}

export type PerkEffect =
  | { kind: 'prodMult'; perLevel: number }
  | { kind: 'costMult'; perLevel: number }
  | { kind: 'startCurrency'; perLevel: number }
  | { kind: 'startDepth'; perLevel: number }
  | { kind: 'plumaMult'; perLevel: number }
  | { kind: 'perPlumaBonus'; perLevel: number }
  | { kind: 'offlineHours'; perLevel: number };

export interface PerkDef {
  id: PerkId;
  name: string;
  flavor: string;
  maxLevel: number | null;
  baseCost: number;
  costGrowth: number;
  requires: PerkId[];
  effect: PerkEffect;
}

export type AchievementReq =
  | { kind: 'depth'; count: number }
  | { kind: 'blocks'; count: number }
  | { kind: 'taps'; count: number }
  | { kind: 'ascensions'; count: number }
  | { kind: 'plumasTotal'; count: number }
  | { kind: 'pieceLevel'; piece: PieceId; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  flavor: string;
  requires: AchievementReq;
}

export interface Content {
  mine: MineDef;
  materials: MaterialDef[];
  hazards: HazardDef[];
  zones: ZoneDef[];
  pieces: PieceDef[];
  perks: PerkDef[];
  achievements: AchievementDef[];
}
