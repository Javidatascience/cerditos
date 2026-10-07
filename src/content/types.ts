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
  /** Bellotas con las que empieza una partida nueva. */
  startAcorns: number;
  /** Índice (0-based) de la herramienta que hay que tener para poder ascender (la 8.ª = 7). */
  ascendTool: number;
  /** Plumas: floor((ganado en la vida / e0)^exponent · bonos) − plumas ya ganadas. */
  plumaE0: number;
  plumaExponent: number;
  /** Bono de producción por cada pluma ganada (histórico). */
  perPluma: number;
  /** Horas de producción offline base (las ventajas las amplían). */
  offlineHours: number;
  /** Inercia: cuanto más picas, más sube la producción hasta ×`momentumMax`. Cada pico suma `momentumPerTap` (0..1) y baja `momentumDecay` por segundo. */
  momentumMax: number;
  momentumPerTap: number;
  momentumDecay: number;
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
  | { kind: 'offlineHours'; perLevel: number }
  /** Sube el tope de la inercia (+perLevel al multiplicador máximo). */
  | { kind: 'momentumMax'; perLevel: number };

export interface PerkDef {
  id: PerkId;
  name: string;
  flavor: string;
  maxLevel: number | null;
  baseCost: number;
  costGrowth: number;
  requires: PerkId[];
  /** Nivel que hay que tener en cada ventaja requerida (1 si no se indica). */
  requiresLevel?: number;
  effect: PerkEffect;
  /** Icono (sprite de `public/art/ui/`) y posición en el árbol: cada nivel es un nodo; `dir` dice hacia dónde crece la cadena. */
  icon?: string;
  layout?: { col: number; row: number; dir: 'right' | 'down' };
}

/** Mejora global: ×`mult` a toda la producción. Se desbloquea al ganar `unlockAt` monedas en total; se compra con `cost`. Se pierde al ascender. */
export interface GlobalUpgradeDef {
  id: string;
  name: string;
  flavor: string;
  unlockAt: number;
  cost: number;
  mult: number;
  /** Si no es 0, en vez de multiplicar la producción sube el tope de la inercia. */
  momentumAdd?: number;
}

/** Cosmético del cerdito: color de piel. Se compra con bellotas o se consigue con un logro. */
export interface SkinDef {
  id: string;
  name: string;
  flavor: string;
  color: string;
  /** Bellotas que cuesta (null si solo se consigue con un logro). */
  cost: number | null;
  /** Logro que lo regala (null si solo se compra). */
  achievement: string | null;
}

/** Lo que hace un compañero mientras se lleva puesto. */
export type CompanionAbility =
  /** Cada `every` picos encuentra 1 bellota. */
  | { kind: 'tapAcorn'; every: number }
  /** Cada `everySeconds` de juego abierto trae un regalo de `incomeSeconds` segundos de ingresos. */
  | { kind: 'coinGift'; everySeconds: number; incomeSeconds: number }
  /** Multiplica la producción de la mejor herramienta que tengas. */
  | { kind: 'bestToolMult'; mult: number }
  /** El cerdito viajero llega `speed` veces más rápido. */
  | { kind: 'visitorSpeed'; speed: number }
  /** Permite comprar gratis 1 unidad de una herramienta disponible, con enfriamiento en horas reales. */
  | { kind: 'freeTool'; cooldownHours: number };

/** Compañero que acompaña al cerdito en la escena y hace algo útil en el fondo. */
export interface CompanionDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  cost: number | null;
  achievement: string | null;
  ability: CompanionAbility;
  /** Mejoras con bellotas: cada nivel sustituye la habilidad por una mejor. */
  upgrades: { cost: number; ability: CompanionAbility }[];
}

/** Reliquia: bono permanente que se consigue al lograr un logro concreto (no se compra). */
export interface RelicDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  achievement: string;
  effect: PerkEffect;
}

export type AchievementReq =
  | { kind: 'toolCount'; tool: ToolId; count: number }
  | { kind: 'taps'; count: number }
  | { kind: 'ascensions'; count: number }
  | { kind: 'plumasTotal'; count: number }
  | { kind: 'lifetime'; amount: number }
  | { kind: 'companionsOwned'; count: number }
  | { kind: 'companionLevels'; count: number }
  | { kind: 'flowersFound'; count: number }
  | { kind: 'shinyFound'; count: number }
  | { kind: 'harvests'; count: number }
  | { kind: 'furnaces'; count: number }
  | { kind: 'caveNodes'; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  flavor: string;
  requires: AchievementReq;
}

/** Efecto de una ventaja de la cueva sobre el juego. */
export interface CaveEffect {
  kind: 'embers' | 'momentumMax' | 'prodMult' | 'basketSeconds' | 'visitorStay' | 'offlineHours';
  value: number;
}

export interface CaveFurnaceDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  baseCost: number;
  baseProd: number;
}

export interface CaveNodeDef {
  id: string;
  branch: string;
  name: string;
  flavor: string;
  cost: number;
  requires: string | null;
  effect: CaveEffect;
}

export interface CaveDef {
  /** Plumas en total necesarias para abrir la cueva. */
  unlockPlumas: number;
  furnaceGrowth: number;
  blowCooldown: number;
  blowSeconds: number;
  furnaces: CaveFurnaceDef[];
  branches: { id: string; name: string; emoji: string }[];
  nodes: CaveNodeDef[];
}

/** Efecto pasivo de una flor del jardín. */
export interface GardenEffect {
  /** `coins`: regalo inmediato de `seconds` segundos de ingresos; el resto son bonos temporales de `seconds` segundos. */
  kind: 'prodMult' | 'costMult' | 'tapMult' | 'momentumMax' | 'coins';
  value: number;
  seconds: number;
}

export interface GardenFlowerDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  growSeconds: number;
  effect: GardenEffect;
  /** Dos flores vecinas que, al cruzarse en una casilla vacía, pueden dar esta (null = se planta desde el principio). */
  recipe: [string, string] | null;
}

export interface GardenDef {
  cols: number;
  rows: number;
  shinyChance: number;
  /** Plumas en total necesarias para abrir el jardín. */
  unlockPlumas: number;
  /** Cada cuántos segundos reales se comprueban los cruces, y la probabilidad por casilla vacía. */
  mutationSeconds: number;
  mutationChance: number;
  flowers: GardenFlowerDef[];
}

export interface Content {
  cave: CaveDef;
  garden: GardenDef;
  game: GameDef;
  tools: ToolDef[];
  perks: PerkDef[];
  globalUpgrades: GlobalUpgradeDef[];
  skins: SkinDef[];
  companions: CompanionDef[];
  relics: RelicDef[];
  achievements: AchievementDef[];
}
