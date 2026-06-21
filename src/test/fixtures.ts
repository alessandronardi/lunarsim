import type { GameState, HexCell, PlacedStructure } from '../types/game';

export function makeHex(id: string, overrides: Partial<HexCell> = {}): HexCell {
    const [q, r] = id.split(',').map(Number);
    return {
        id,
        q,
        r,
        terrain: 'PIANO',
        building_id: null,
        assigned_drones: 0,
        signal_strength: 100,
        is_accessible: true,
        has_ice_deposit: false,
        iceHoursRemaining: 0,
        ...overrides,
    };
}

const now = Date.now();

export function makeMinimalGameState(overrides: Partial<GameState> = {}): GameState {
    const mainframe: PlacedStructure = {
        instanceId: 'mainframe-0',
        definitionId: 'STR-A01',
        hexId: '0,0',
        health: 100,
        damaged: false,
        inStandby: false,
        assignedDrones: 0,
        powerLevel: 100,
        building: false,
        buildProgress: 1,
        buildStartTime: 0,
    };

    return {
        ui: { activeView: 'DASHBOARD', selectedHexId: null },
        resources: {
            energy: 500,
            bandwidth: 3,
            compute: 0,
            regolith: 200,
            metals: 300,
            ice: 100,
            oxygen: 0,
            hydrogen: 50,
            helium3: 0,
            credits: 500,
            cement: 0,
        },
        resourceCaps: {
            energy: 2000,
            bandwidth: 999,
            compute: 999,
            regolith: 200,
            metals: 200,
            ice: 200,
            oxygen: 500,
            hydrogen: 500,
            helium3: 200,
            credits: 99999,
            cement: 200,
        },
        time: {
            gameStartTime: now,
            lastUpdateTime: now,
            day: 5,
            cycle: 0,
            phase: 'GIORNO',
        },
        drones: { total: 5, available: 5, assignments: {} },
        grid: [
            makeHex('0,0', { building_id: 'STR-A01' }),
            makeHex('1,0'),
            makeHex('0,1'),
            makeHex('-1,0'),
        ],
        placedStructures: { 'mainframe-0': mainframe },
        iacIndex: 0,
        helium3ExportedThisCycle: 0,
        energyLowHours: 0,
        gameOver: false,
        research: { completed: [], active: null, progressHours: 0 },
        paused: false,
        urmAccumulator: 0,
        batteryCharge: {},
        engineAlerts: [],
        commsLog: [],
        ...overrides,
    };
}
