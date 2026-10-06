// Tipos del contenido del juego (datos declarativos). Ver docs/06-mina.md.
// El motor (src/core/) no menciona ninguna herramienta ni ventaja por nombre: todo sale de aquí.

export type ToolId = string;
export type PerkId = string;

/** Números del juego. Todo el equilibrio está aquí. */
export interface GameDef {
  /** Crecimiento del coste de cada herramienta por unidad comprada. */
  costGrowth: number;
  /** Al tener estas cantidades de una herramienta se desbloquea su siguiente mejora (×`milestoneMult` de producción), que hay que comprar. */
  milestones: number[];
  milestoneMult: number;
  /** Coste de una mejora: `upgradeCostFactor` veces el precio de la unidad que la desbloquea. */
  upgradeCostFactor: number;
  /** Segundos de producción que equivale un toque (mínimo 1 moneda). */
  tapSeconds: number;
  /** Monedas con las que empieza cada ronda. */
  startCoins: number;
  /** Índice (0-based) de la herramienta que hay que tener para poder ascender (la 8.ª = 7). */
  ascendTool: number;
  /** Plumas: floor((ganado en la vida / e0)^exponent · bonos) − plumas ya ganadas. */
  plumaE0: number;
  plumaExponent: number;
  /** Bono de producción por cada pluma ganada (histórico). */
  perPluma: number;
  /** Horas de producción offline base (las ventajas las amplían). */
  offlineHours: number;
}

export interface ToolDef {
  id: ToolId;
  name: string;
  emoji: string;
  flavor: string;
  /** Coste de la unidad n (0-based): baseCost · costGrowth^n. */
  baseCost: number;
  /** Monedas por segundo de una unidad (antes de hitos y bonos). */
  baseProd: number;
}

export type PerkEffect =
  | { kind: 'prodMult'; perLevel: number }
  | { kind: 'costMult'; perLevel: number }
  | { kind: 'startCurrency'; perLevel: number }
  | { kind: 'tapMult'; perLevel: number }
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
  | { kind: 'toolCount'; tool: ToolId; count: number }
  | { kind: 'taps'; count: number }
  | { kind: 'ascensions'; count: number }
  | { kind: 'plumasTotal'; count: number }
  | { kind: 'lifetime'; amount: number };

export interface AchievementDef {
  id: string;
  name: string;
  flavor: string;
  requires: AchievementReq;
}

export interface Content {
  game: GameDef;
  tools: ToolDef[];
  perks: PerkDef[];
  achievements: AchievementDef[];
}
