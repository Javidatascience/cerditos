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
  | { kind: 'momentumMax'; perLevel: number }
  /** Compañeros que se pueden llevar a la vez (+perLevel por nivel). */
  | { kind: 'companionSlots'; perLevel: number }
  /** Jardín: filas extra de casillas (+perLevel por nivel). */
  | { kind: 'gardenRows'; perLevel: number }
  /** Jardín: tiempo de crecimiento ×perLevel^nivel. */
  | { kind: 'gardenGrowth'; perLevel: number }
  /** Jardín: +perLevel a la probabilidad de cruce por nivel. */
  | { kind: 'gardenMutation'; perLevel: number }
  /** Jardín: +perLevel (fracción) a la duración de los bonos por nivel. */
  | { kind: 'gardenDuration'; perLevel: number }
  /** Jardín: +perLevel a la probabilidad de flor brillante por nivel. */
  | { kind: 'gardenShiny'; perLevel: number }
  /** Cueva: +perLevel (fracción) a las brasas por nivel. */
  | { kind: 'caveEmbers'; perLevel: number }
  /** Cueva: +perLevel (fracción) al daño del cerdito por nivel. */
  | { kind: 'caveBlow'; perLevel: number }
  /** Cueva: coste de la armería ×perLevel^nivel. */
  | { kind: 'caveCost'; perLevel: number }
  /** Nido: nidos extra (+perLevel por nivel). */
  | { kind: 'nestSlots'; perLevel: number };

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
  /** Esmeraldas ganadas en total que hacen falta para poder comprarla (p. ej. las del jardín o la cueva). */
  requiresPlumasTotal?: number;
  /** Rótulo de la zona del árbol que empieza en esta ventaja (se pinta encima de su primer círculo). */
  section?: string;
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

/** Sinergia: liga dos herramientas; al comprarla, cada una gana producción por cada unidad de la otra. */
export interface SynergyDef {
  id: string;
  name: string;
  flavor: string;
  /** La herramienta menor y la mayor del par. */
  a: ToolId;
  b: ToolId;
  /** Unidades que hay que tener de cada una para verla. */
  need: number;
  cost: number;
  /** Fracción de producción que gana `a` por cada unidad de `b` (0,005 = +0,5 %). */
  aPerB: number;
  /** Fracción de producción que gana `b` por cada unidad de `a`. */
  bPerA: number;
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

/** Dónde se pone una prenda del cerdito: cabeza (gorro), cuerpo (ropa) o cola. El color es otra cosa (las pieles). */
export type AccessorySlot = 'head' | 'body' | 'tail';

/** Prenda cosmética del cerdito: se compra con bellotas (`cost`) o la regala un logro (`achievement`). */
export interface AccessoryDef {
  id: string;
  slot: AccessorySlot;
  name: string;
  flavor: string;
  cost: number | null;
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
  | { kind: 'freeTool'; cooldownHours: number }
  /** Las flores del jardín tardan `factor` veces el tiempo en crecer (menor que 1 = más rápido). */
  | { kind: 'gardenSpeed'; factor: number }
  /** Suma probabilidad de cruce y de flor brillante en el jardín. */
  | { kind: 'gardenLuck'; mutation: number; shiny: number }
  /** Multiplica las brasas por segundo de la cueva. */
  | { kind: 'embersMult'; mult: number };

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
  | { kind: 'dragonStage'; count: number }
  | { kind: 'creatureAdult'; creature: string }
  | { kind: 'adultCount'; count: number }
  | { kind: 'caveMeters'; count: number }
  | { kind: 'caveMonsters'; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  flavor: string;
  requires: AchievementReq;
}

/** Monstruo de la cueva: vida y brasas de base; ambas crecen con los metros recorridos. */
export interface CaveMonsterDef {
  id: string;
  name: string;
  /** Brasas y almas de base al derrotarlo (las brasas crecen con los metros). */
  embers: number;
  souls: number;
  /** Metros a partir de los que puede aparecer. */
  fromMeters: number;
  /** Va volando: hay que saltar para alcanzarlo. */
  flies?: boolean;
  /** Flor del jardín cuya semilla suelta a veces. */
  flower: string;
}

/** Mejora permanente de la cueva que se compra con almas (no se pierde al renacer). */
export interface SoulUpgradeDef {
  id: string;
  name: string;
  flavor: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number | null;
  effect:
    /** Brasas / almas +perLevel (fracción) por nivel. */
    | { kind: 'embers' | 'souls'; perLevel: number }
    /** Segundos extra de furia y de jefe por nivel. */
    | { kind: 'rageSeconds' | 'bossSeconds'; perLevel: number }
    /** Más cofres: ×(1 + perLevel) por nivel. */
    | { kind: 'chests'; perLevel: number }
    /** Brasas del suelo con las que empiezas al renacer (×perLevel por nivel). */
    | { kind: 'startEmbers'; perLevel: number }
    /** El monstruo evoluciona: da más brasas y almas. */
    | { kind: 'evolve'; monster: string };
}

/** Objeto de la armería (se compra con brasas, por niveles; se pierde al renacer). */
export interface ArmoryItemDef {
  id: string;
  name: string;
  flavor: string;
  baseCost: number;
  costGrowth: number;
  /** null = sin tope. */
  maxLevel: number | null;
  effect:
    /** Daño de cada golpe ×perLevel por nivel. */
    | { kind: 'damage'; perLevel: number }
    /** Velocidad +perLevel (fracción) por nivel. */
    | { kind: 'speed'; perLevel: number }
    /** Radio del imán de brasas +perLevel píxeles por nivel. */
    | { kind: 'magnet'; perLevel: number }
    /** Saltos extra en el aire (+perLevel por nivel). */
    | { kind: 'jumps'; perLevel: number }
    /** Brasas +perLevel (fracción) por nivel. */
    | { kind: 'embers'; perLevel: number };
}

/** Etapa del dragón: se alcanza derrotándolo como jefe en la carrera y da bonos acumulados a la producción y a las brasas. */
export interface DragonStageDef {
  id: string;
  name: string;
  flavor: string;
  prodMult: number;
  embersMult: number;
}

/** La Cueva del Dragón: un corredor sin fin (a lo Idle Slayer). */
export interface CaveDef {
  /** Esmeraldas en total necesarias para abrir la cueva. */
  unlockPlumas: number;
  /** Etapas del dragón: la 0 es el huevo; cada jefe derrotado (la primera vez) lo hace crecer. */
  dragon: DragonStageDef[];
  /** Velocidad de base en metros por segundo. */
  speed: number;
  /** Brasas de base de cada brasa recogida del suelo. */
  coinEmbers: number;
  /** Cada 100 m, las brasas de los monstruos y del suelo ×rewardGrowth (los monstruos caen al chocar). */
  rewardGrowth: number;
  /** Golpes por segundo del cerdito contra el jefe. */
  hitsPerSecond: number;
  /** Probabilidad de que un monstruo suelte la semilla de su flor (si aún no la tienes). */
  seedChance: number;
  /** Un cofre cada tantos metros (de media). */
  chestEvery: number;
  /** Furia: se llena derrotando monstruos; dura unos segundos y multiplica brasas y almas. */
  rageKills: number;
  rageSeconds: number;
  rageMult: number;
  /** Un monstruo evolucionado da ×evolveEmbers brasas y ×evolveSouls almas. */
  evolveEmbers: number;
  evolveSouls: number;
  /** Almas del jefe: bossSouls × (jefes derrotados en esta vida + 1). */
  bossSouls: number;
  soulUpgrades: SoulUpgradeDef[];
  monsters: CaveMonsterDef[];
  /** Un jefe cada tantos metros: vida = bossHp × bossHpGrowth^jefes derrotados en esta vida; brasas = vida × bossReward. */
  bossEvery: number;
  bossHp: number;
  bossHpGrowth: number;
  bossReward: number;
  /** Segundos para derrotar al jefe; si no, se va y vuelve un poco más adelante. */
  bossSeconds: number;
  /** Cada cuántos metros sale un portal a la fase de bonus, y cuánto dura. */
  bonusEvery: number;
  bonusSeconds: number;
  armory: ArmoryItemDef[];
  /** Renacer: almas = floor(sqrt(brasas ganadas en esta vida / soulsDivisor)). */
  soulsDivisor: number;
  /** Cada alma conseguida en total: +soulEmbers a las brasas y +soulProd a la producción de la mina. */
  soulEmbers: number;
  soulProd: number;
}

/** Efecto pasivo de una flor del jardín. */
export interface GardenEffect {
  /** `coins`: regalo inmediato de `seconds` segundos de ingresos; `acorns`: `value` bellotas al recogerla; `embers`: `value` brasas del suelo de la cueva (al récord de metros); el resto son bonos temporales de `seconds` segundos. */
  kind: 'prodMult' | 'costMult' | 'tapMult' | 'momentumMax' | 'coins' | 'acorns' | 'embers';
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
  /** Cruce (a lo Cookie Clicker): cuando madura una de las dos con la otra madura al lado, puede brotar esta en una casilla vacía contigua. null = se planta desde el principio. */
  recipe: [string, string] | null;
  /** Probabilidad de que brote al madurar una de sus dos flores (antes de los bonos de Mucho polen y la mariposa). */
  chance?: number;
  /** Silvestre: no se planta hasta encontrarla; brota sola, a veces, junto a una flor que madura. */
  wild?: boolean;
  /** Semilla que suelta a veces este monstruo de la cueva: hasta tenerla no se puede plantar. */
  seed?: string;
}

export interface GardenDef {
  cols: number;
  rows: number;
  shinyChance: number;
  /** Plumas en total necesarias para abrir el jardín. */
  unlockPlumas: number;
  /** Probabilidad de que brote una flor silvestre junto a una flor que madura (si no ha habido cruce). */
  wildChance: number;
  flowers: GardenFlowerDef[];
}

/** Criatura del Nido: sale de un huevo (se compra con bellotas), eclosiona con el tiempo y evoluciona alimentándola. */
export interface CreatureDef {
  id: string;
  name: string;
  flavor: string;
  /** Bellotas que cuesta el huevo. */
  eggCost: number;
  /** Solo se puede incubar con el dragón de la cueva en esta etapa o más. */
  requiresDragonStage?: number;
  /** Segundos de reloj real hasta que el huevo puede eclosionar. */
  hatchSeconds: number;
  /** Bellotas que cuesta alimentarla para pasar de cría a joven y de joven a adulta. */
  feedCosts: [number, number];
  /** Las cuatro etapas: huevo, cría, joven y adulta. */
  stages: { name: string; flavor: string }[];
  /** Ofrenda: al ser adulta se le pueden dar bellotas y da este bono durante un rato (tiempo de juego). */
  boost: { kind: 'prodMult' | 'tapMult' | 'momentumMax' | 'embersMult'; value: number; seconds: number; cost: number };
  /** Lo que da de adulta mientras está en su nido (también con el juego cerrado, hasta el tope offline). */
  resident:
    /** Brasas por segundo: `perSecond` brasas del suelo al récord de metros. */
    | { kind: 'embers'; perSecond: number }
    /** Producción de la mina ×value. */
    | { kind: 'prodMult'; value: number }
    /** 1 bellota cada `everyHours` horas de juego. */
    | { kind: 'acorns'; everyHours: number };
}

export interface NestDef {
  /** Esmeraldas en total necesarias para abrir el nido. */
  unlockPlumas: number;
  /** Nidos que se pueden llegar a tener (1 de base y el resto con ventajas). */
  maxSlots: number;
  /** Bellotas que puede acumular la cesta (Topo excavador) antes de parar. */
  basketAcornCap: number;
  /** El Topo (compañero) cava solo al llegar a este nivel de mejora: deja 1 bellota en la cesta cada `topoHours` horas. */
  topoLevel: number;
  topoHours: number;
  creatures: CreatureDef[];
}

export interface Content {
  nest: NestDef;
  accessories: AccessoryDef[];
  cave: CaveDef;
  garden: GardenDef;
  game: GameDef;
  tools: ToolDef[];
  perks: PerkDef[];
  globalUpgrades: GlobalUpgradeDef[];
  synergies: SynergyDef[];
  skins: SkinDef[];
  companions: CompanionDef[];
  relics: RelicDef[];
  achievements: AchievementDef[];
}
