import type { ResearchId } from '../data/research';
// Tipi base
export type StructureTier = 'BASE' | 'AVANZATO' | 'END-GAME';

export type StructureCategory =
    | 'Controllo & Segnale'
    | 'Energia'
    | 'Estrazione & Produzione'
    | 'Ricerca & Elaborazione'
    | 'Infrastruttura';

export type GamePhase = 'ALBA' | 'GIORNO' | 'TRAMONTO' | 'NOTTE' | 'PREALBA';
export type ActiveView = 'DASHBOARD' | 'GRIGLIA' | 'EDIFICI' | 'RICERCA' | 'ENCICLOPEDIA';

// Risorse
export interface Resources {
    energy: number;
    bandwidth: number;
    compute: number;
    regolith: number;
    metals: number;
    ice: number;
    oxygen: number;
    hydrogen: number;
    helium3: number;
    credits: number;
    cement: number;
}

// Singola cella della griglia esagonale
export interface HexCell {
    id: string;           // formato "q,r"
    q: number;
    r: number;
    terrain: 'PIANO' | 'CRATERE' | 'RILIEVO' | 'OMBRA_PERMANENTE';
    building_id: string | null;
    assigned_drones: number;
    signal_strength: number; // 0, 50 o 100
    is_accessible: boolean;
    has_ice_deposit: boolean;
    iceHoursRemaining: number; // ore reali di estrazione prima dell'esaurimento
}

// Definizione struttura (catalogo)
export interface StructureDefinition {
    id: string;
    name: string;
    description: string;    // testo narrativo UI
    tier: StructureTier;
    category: StructureCategory;
    gridSize: number;       // 1 o 2 hex
    optimalDrones: number;
    activePhases: GamePhase[];
    prerequisites: string[];
    buildCost: Partial<Resources>;
    buildTimeHours: number;     // ore reali per costruzione
    productionPerHour: Partial<Resources>; // output per ora reale a efficienza 100%
    energyCostPerHour: number;  // consumo energia per ora reale
    health: number;   // 0–100
    damaged: boolean; // true se health < 30
    inStandby: boolean;
}

// Struttura effettivamente piazzata sulla mappa
export interface PlacedStructure {
    instanceId: string;   // unico per ogni istanza
    definitionId: string; // riferimento a StructureDefinition.id
    hexId: string;
    /** Secondo hex per strutture gridSize 2 (es. STR-B03, STR-D02) */
    secondaryHexId?: string;
    health: number;
    damaged: boolean;
    inStandby: boolean;
    assignedDrones: number;
    powerLevel?: number; // 0-100
    // Costruzione
    building: boolean;       // true se in cantiere
    buildProgress: number;   // 0.0 → 1.0
    buildStartTime: number;  // timestamp ms di inizio costruzione
    // Potenziamento e produzione droni (specifico del Nucleo Base STR-A01)
    upgradeLevel?: number;   // livello corrente (default 1)
    urmBuildProgress?: number; // progresso costruzione URM (0.0 -> 1.0), undefined se non in coda
}

// Stato R&D
export interface ResearchState {
    completed: ResearchId[];
    active: ResearchId | null;
    progressHours: number; // ore accumulate sulla ricerca attiva
}

export interface GameAlert {
    id: string;         // uuid o timestamp per chiave React
    message: string;
    level: 'INFO' | 'AVVISO' | 'CRITICO';
    timestamp: number;  // epoch ms
}

// Stato globale del gioco
export interface GameState {
    ui: {
        activeView: ActiveView;
        selectedHexId: string | null;
    };
    resources: Resources;
    resourceCaps: Partial<Resources>;
    time: {
        gameStartTime: number;  // timestamp epoch ms di inizio partita
        lastUpdateTime: number; // timestamp epoch ms dell'ultimo update dell'engine
        day: number;            // giorno corrente nel ciclo (0-27), calcolato
        cycle: number;          // ciclo corrente, calcolato
        phase: GamePhase;       // fase corrente, calcolata
    };
    drones: {
        total: number;
        available: number;
        assignments: Record<string, number>; // instanceId → droni assegnati
    };
    grid: HexCell[];
    placedStructures: Record<string, PlacedStructure>; // instanceId → struttura
    iacIndex: number; // 0–100
    helium3ExportedThisCycle: number;
    energyLowHours: number; // ore di energia ≤ 0 consecutive (per game over)
    gameOver: boolean;
    research: ResearchState;
    paused: boolean;
    // Accumulator per produzione URM frazionaria
    urmAccumulator: number;
    batteryCharge: Record<string, number>; // instanceId STR-B02 → carica accumulata
    engineAlerts: GameAlert[];  // buffer circolare, max 50
}
