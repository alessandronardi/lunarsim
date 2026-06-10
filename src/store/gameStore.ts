import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, HexCell, ActiveView, Resources, PlacedStructure } from '../types/game';
import { dayToPhase, getGameDayInCycle, getGameCycle } from '../utils/gameFormulas';
import { processUpdate, type UpdateResult } from '../utils/gameEngine';
import { processHelium3Export, calculateIAC } from '../utils/iacCalculator';
import { RESEARCH, isResearchAvailable, type ResearchId } from '../data/research';
import { STRUCTURES } from '../data/structures';
import { findSecondaryHexId, isHexOccupied } from '../utils/hexUtils';
import { hasTerrestrialResearchBandwidth, isTerrestrialResearch } from '../utils/researchEffects';

// ── Costanti ────────────────────────────────────────────────────────────────
const GRID_RADIUS = 8;
const DEFAULT_RESOURCE_CAP = 200;
const ENERGY_LOW_HOURS_GAME_OVER = 2;  // 2 ore senza energia = game over
const BATTERY_MAX_PER_UNIT = 500;
const BATTERY_RELEASE_THRESHOLD = 50;

// ── Generazione griglia esagonale (coordinate cubiche) ──────────────────────
function generateGrid(): HexCell[] {
    const cells: HexCell[] = [];

    const terrainWeights = [
        { type: 'PIANO' as const, weight: 60 },
        { type: 'RILIEVO' as const, weight: 15 },
        { type: 'CRATERE' as const, weight: 15 },
        { type: 'OMBRA_PERMANENTE' as const, weight: 10 },
    ];

    function randomTerrain(): HexCell['terrain'] {
        const roll = Math.random() * 100;
        let cum = 0;
        for (const { type, weight } of terrainWeights) {
            cum += weight;
            if (roll < cum) return type;
        }
        return 'PIANO';
    }

    for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
        const r1 = Math.max(-GRID_RADIUS, -q - GRID_RADIUS);
        const r2 = Math.min(GRID_RADIUS, -q + GRID_RADIUS);
        for (let r = r1; r <= r2; r++) {
            const id = `${q},${r}`;
            const distFromCenter = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));

            if (q === 0 && r === 0) {
                cells.push({
                    id, q, r,
                    terrain: 'PIANO',
                    building_id: 'STR-A01',
                    assigned_drones: 0,
                    signal_strength: 100,
                    is_accessible: true,
                    has_ice_deposit: false,
                    iceHoursRemaining: 0,
                });
                continue;
            }

            const isIceCandidate = distFromCenter <= 5 && Math.random() < 0.08;

            cells.push({
                id, q, r,
                terrain: randomTerrain(),
                building_id: null,
                assigned_drones: 0,
                signal_strength: distFromCenter <= 3 ? 100 : 0,
                is_accessible: distFromCenter <= 3,
                has_ice_deposit: isIceCandidate,
                iceHoursRemaining: isIceCandidate ? 500 : 0, // 500 ore di estrazione
            });
        }
    }

    // Garantire almeno 3 depositi ghiaccio nel raggio 5
    const iceCount = cells.filter(c => c.has_ice_deposit).length;
    if (iceCount < 3) {
        let added = iceCount;
        for (const cell of cells) {
            if (added >= 3) break;
            const dist = Math.max(Math.abs(cell.q), Math.abs(cell.r), Math.abs(-cell.q - cell.r));
            if (dist > 0 && dist <= 5 && !cell.has_ice_deposit) {
                cell.has_ice_deposit = true;
                cell.iceHoursRemaining = 500;
                added++;
            }
        }
    }

    return cells;
}

// ── Calcolo segnale ── propagazione da Mainframe + ripetitori attivi
function propagateSignal(grid: HexCell[], placed: Record<string, PlacedStructure>): HexCell[] {
    const SIGNAL_RADIUS_BASE = 3;
    const SIGNAL_RADIUS_REPEATER = 2;
    const SIGNAL_RADIUS_REPEATER_RILIEVO = 3;

    const cubeDistance = (q1: number, r1: number, q2: number, r2: number) =>
        Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs((-q1 - r1) - (-q2 - r2)));

    type Source = { q: number; r: number; radius: number };
    const sources: Source[] = [{ q: 0, r: 0, radius: SIGNAL_RADIUS_BASE }];
    for (const ps of Object.values(placed)) {
        if (ps.definitionId === 'STR-A02' && !ps.inStandby && !ps.building && ps.health > 0) {
            const [sq, sr] = ps.hexId.split(',').map(Number);
            const hex = grid.find(c => c.q === sq && c.r === sr);
            const radius = hex?.terrain === 'RILIEVO' ? SIGNAL_RADIUS_REPEATER_RILIEVO : SIGNAL_RADIUS_REPEATER;
            sources.push({ q: sq, r: sr, radius });
        }
    }

    return grid.map(cell => {
        const inRange = sources.some(src => cubeDistance(cell.q, cell.r, src.q, src.r) <= src.radius);
        return { ...cell, signal_strength: inRange ? 100 : 0, is_accessible: inRange };
    });
}

// ── Stato iniziale ──────────────────────────────────────────────────────────
function createInitialState(): Omit<GameState, 'setActiveView' | 'selectHex'> {
    const now = Date.now();
    const dayInCycle = getGameDayInCycle(now, now); // 0
    return {
        ui: {
            activeView: 'DASHBOARD',
            selectedHexId: null,
        },
        resources: {
            energy: 500, bandwidth: 3, compute: 0,
            regolith: 200, metals: 300, ice: 100,
            oxygen: 0, hydrogen: 0, helium3: 0,
            credits: 500, cement: 0,
        },
        resourceCaps: {
            energy: 2000, bandwidth: 999, compute: 999,
            regolith: DEFAULT_RESOURCE_CAP,
            metals: DEFAULT_RESOURCE_CAP,
            ice: DEFAULT_RESOURCE_CAP,
            oxygen: 500, hydrogen: 500,
            helium3: DEFAULT_RESOURCE_CAP,
            credits: 99999, cement: DEFAULT_RESOURCE_CAP,
        },
        time: {
            gameStartTime: now,
            lastUpdateTime: now,
            day: Math.floor(dayInCycle),
            cycle: 0,
            phase: dayToPhase(dayInCycle),
        },
        drones: {
            total: 5, available: 5, assignments: {},
        },
        grid: generateGrid(),
        placedStructures: {
            'mainframe-0': {
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
                upgradeLevel: 1,
            },
        },
        iacIndex: 0,
        helium3ExportedThisCycle: 0,
        energyLowHours: 0,
        gameOver: false as boolean,
        research: {
            completed: [],
            active: null,
            progressHours: 0,
        },
        paused: false,
        urmAccumulator: 0,
        batteryCharge: {},
        engineAlerts: [],
    };
}

// ── Tipo per le actions dello store ─────────────────────────────────────────
type GameActions = {
    setActiveView: (view: ActiveView) => void;
    selectHex: (hexId: string | null) => void;
    updateResources: (delta: Partial<Resources>) => void;
    updateIAC: (value: number) => void;
    setGameOver: () => void;
    addDrone: () => void;
    resetGame: () => void;
    /** Aggiorna il tempo di gioco calcolando giorno/ciclo/fase dal timestamp */
    updateTime: (now: number) => { newCycleStarted: boolean };
    /** Applica il risultato di un update (atomico) */
    applyUpdateResult: (result: UpdateResult) => void;
    /** Esporta He-3 accumulato e azzera il contatore del ciclo */
    processEndOfCycle: () => void;
    /** Avvia una ricerca */
    startResearch: (id: ResearchId) => void;
    /** Cancella la ricerca in corso */
    cancelResearch: () => void;
    /** Costruisce una struttura su un hex (inizio cantiere) */
    buildStructure: (hexId: string, definitionId: string) => { success: boolean; error?: string };
    /** Aggiorna l'assegnazione URM */
    setDroneAssignment: (instanceId: string, drones: number) => void;
    /** Azzera tutte le assegnazioni URM */
    recallAllDrones: () => void;
    /** Imposta il livello di potenza */
    setStructurePower: (instanceId: string, level: number) => void;
    /** Imposta il livello di potenza su tutte le istanze di un tipo */
    setGroupPower: (definitionId: string, level: number) => void;
    /** Spegne tutte le strutture che consumano energia */
    shutdownAllPower: () => void;
    /** Pausa / Riprendi */
    togglePause: () => void;
    /** Rimuove un alert specifico */
    dismissAlert: (id: string) => void;
    /** Ripara una struttura (+20 HP, costo: 5 metalli + 5 regolite) */
    repairStructure: (instanceId: string) => { success: boolean; error?: string };
    /** Demolisce una struttura, restituendo il 30% dei materiali */
    demolishStructure: (instanceId: string) => { success: boolean; error?: string };
    /** Avvia la produzione di un drone URM nel Nucleo Base */
    startUrmProduction: () => { success: boolean; error?: string };
    /** Potenzia il livello del Nucleo Base */
    upgradeBaseCore: () => { success: boolean; error?: string };
    /** Ricalcola lo stato dal lastUpdateTime ad ora (singolo catch-up) */
    refreshState: () => void;
};

// ── Store ────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState & GameActions>()(
    persist(
        (set, get) => ({
            ...createInitialState(),

            setActiveView: (view) => {
                get().refreshState();
                set(s => ({ ui: { ...s.ui, activeView: view } }));
            },

            selectHex: (hexId) => {
                get().refreshState();
                set(s => ({ ui: { ...s.ui, selectedHexId: hexId } }));
            },

            updateResources: (delta) =>
                set(s => {
                    const next = { ...s.resources };
                    const caps = s.resourceCaps;
                    for (const key of Object.keys(delta) as (keyof Resources)[]) {
                        const raw = (next[key] ?? 0) + (delta[key] ?? 0);
                        const cap = caps[key] ?? Infinity;
                        next[key] = Math.max(0, Math.min(raw, cap));
                    }
                    return { resources: next };
                }),

            updateIAC: (value) =>
                set(() => ({ iacIndex: Math.max(0, Math.min(100, value)) })),

            setGameOver: () =>
                set(() => ({ gameOver: true })),

            addDrone: () =>
                set(s => ({
                    drones: {
                        ...s.drones,
                        total: s.drones.total + 1,
                        available: s.drones.available + 1,
                    },
                })),

            resetGame: () =>
                set(() => createInitialState() as GameState & GameActions),

            // ── Aggiorna il tempo di gioco ───────────────────────────────────
            updateTime: (now: number) => {
                let newCycleStarted = false;
                set(s => {
                    const dayInCycle = getGameDayInCycle(s.time.gameStartTime, now);
                    const newCycle = getGameCycle(s.time.gameStartTime, now);
                    if (newCycle > s.time.cycle) newCycleStarted = true;
                    return {
                        time: {
                            ...s.time,
                            lastUpdateTime: now,
                            day: Math.floor(dayInCycle),
                            cycle: newCycle,
                            phase: dayToPhase(dayInCycle),
                        },
                    };
                });
                return { newCycleStarted };
            },

            // ── Applica il risultato in modo atomico ─────────────────────────
            applyUpdateResult: (result: UpdateResult) =>
                set(s => {
                    if (s.gameOver) return s;

                    // 1. Aggiorna i cap e calcola nuove risorse
                    const updatedCaps = { ...s.resourceCaps, ...result.effectiveCaps };
                    const next = { ...s.resources };
                    for (const key of Object.keys(result.resourceDelta) as (keyof Resources)[]) {
                        const raw = (next[key] ?? 0) + (result.resourceDelta[key] ?? 0);
                        const cap = updatedCaps[key] ?? Infinity;
                        next[key] = Math.max(0, Math.min(raw, cap));
                    }

                    // 2. STR-B02 — logica carica/scarica batterie
                    const b02Instances = Object.values(result.newPlacedStructures).filter(
                        (ps: PlacedStructure) => ps.definitionId === 'STR-B02' && !ps.building && ps.health > 0
                    );
                    const totalBatteryCap = b02Instances.length * BATTERY_MAX_PER_UNIT;
                    const newBatteryCharge = { ...s.batteryCharge };

                    if (next.energy > (s.resourceCaps.energy ?? 2000) * 0.8 && totalBatteryCap > 0) {
                        const surplus = Math.min(next.energy * 0.1, totalBatteryCap * 0.1);
                        const currentCharge = Object.values(newBatteryCharge).reduce((a, b) => a + b, 0);
                        const space = totalBatteryCap - currentCharge;
                        const toCharge = Math.min(surplus, space);
                        b02Instances.forEach((ps: PlacedStructure) => {
                            newBatteryCharge[ps.instanceId] = (newBatteryCharge[ps.instanceId] ?? 0) + toCharge / b02Instances.length;
                        });
                        next.energy = Math.max(0, next.energy - toCharge);
                    }

                    if (next.energy < BATTERY_RELEASE_THRESHOLD && totalBatteryCap > 0) {
                        const totalStored = Object.values(newBatteryCharge).reduce((a, b) => a + b, 0);
                        const toRelease = Math.min(100, totalStored);
                        if (toRelease > 0) {
                            b02Instances.forEach((ps: PlacedStructure) => {
                                const share = (newBatteryCharge[ps.instanceId] ?? 0) / (totalStored || 1);
                                newBatteryCharge[ps.instanceId] = Math.max(0, (newBatteryCharge[ps.instanceId] ?? 0) - toRelease * share);
                            });
                            next.energy = Math.min((s.resourceCaps.energy ?? 2000), next.energy + toRelease);
                        }
                    }

                    // 3. Game over check — ore consecutive senza energia
                    const dtHours = (Date.now() - s.time.lastUpdateTime) / 3_600_000;
                    let newEnergyLowHours = s.energyLowHours;
                    let gameOver: boolean = s.gameOver;
                    if (next.energy <= 0) {
                        newEnergyLowHours += dtHours;
                        if (newEnergyLowHours > ENERGY_LOW_HOURS_GAME_OVER) gameOver = true;
                    } else {
                        newEnergyLowHours = 0;
                    }

                    // 4. He-3 export accumulato
                    const newHe3Exported = s.helium3ExportedThisCycle + result.helium3Exported;

                    // 5. Droni
                    const newDronesTotal = result.newDronesTotal;
                    const dronesDiff = newDronesTotal - s.drones.total;

                    // 6. Progresso ricerca
                    const research = s.research ?? { completed: [], active: null, progressHours: 0 };
                    let newResearch = { ...research, progressHours: result.newResearchProgressHours };
                    if (research.active) {
                        const def = RESEARCH[research.active];
                        if (def && result.newResearchProgressHours >= def.costHours) {
                            newResearch = { completed: [...research.completed, research.active], active: null, progressHours: 0 };
                        }
                    }

                    // Convert and append engine alerts
                    const newAlerts = [...s.engineAlerts];
                    if (result.alerts && result.alerts.length > 0) {
                        for (const msg of result.alerts) {
                            const level: 'INFO' | 'AVVISO' | 'CRITICO' = msg.includes('✖') || msg.includes('distrutta')
                                ? 'CRITICO'
                                : msg.includes('⚠')
                                ? 'AVVISO'
                                : 'INFO';
                            newAlerts.push({
                                id: `${Date.now()}-${Math.random()}`,
                                message: msg,
                                level,
                                timestamp: Date.now()
                            });
                        }
                    }
                    const trimmedAlerts = newAlerts.slice(-50);

                    return {
                        ...s,
                        resources: next,
                        resourceCaps: updatedCaps,
                        placedStructures: result.newPlacedStructures,
                        grid: result.newGrid,
                        drones: {
                            ...s.drones,
                            total: newDronesTotal,
                            available: s.drones.available + dronesDiff,
                        },
                        energyLowHours: newEnergyLowHours,
                        gameOver,
                        helium3ExportedThisCycle: newHe3Exported,
                        research: newResearch,
                        urmAccumulator: result.newUrmAccumulator,
                        batteryCharge: newBatteryCharge,
                        engineAlerts: trimmedAlerts,
                    };
                }),

            // ── Export He-3 a fine ciclo ─────────────────────────────────────
            processEndOfCycle: () =>
                set(s => {
                    const { creditsGained, helium3Consumed } = processHelium3Export(s.helium3ExportedThisCycle);
                    const newResources = { ...s.resources };
                    newResources.helium3 = Math.max(0, newResources.helium3 - helium3Consumed);
                    newResources.credits = Math.min(99999, newResources.credits + creditsGained);
                    return {
                        resources: newResources,
                        helium3ExportedThisCycle: 0,
                    };
                }),

            // ── Azioni R&D ───────────────────────────────────────────────────
            startResearch: (id: ResearchId) => {
                get().refreshState();
                const s = get();
                const def = RESEARCH[id];
                if (!def) return;

                const research = s.research ?? { completed: [], active: null, progressHours: 0 };
                if (research.active) return;
                if (research.completed.includes(id)) return;
                if (!isResearchAvailable(id, research.completed)) return;
                if (isTerrestrialResearch(id) && !hasTerrestrialResearchBandwidth(s.resources)) return;

                // Verifichiamo i costi
                const creditsAvailable = s.resources.credits;
                const computeAvailable = s.resources.compute;
                if (creditsAvailable < def.creditsCost || computeAvailable < def.computeCost) {
                    return; // risorse insufficienti
                }

                // Avvia la ricerca deducendo le risorse
                set(prev => {
                    const nextResources = { ...prev.resources };
                    nextResources.credits = Math.max(0, nextResources.credits - def.creditsCost);
                    nextResources.compute = Math.max(0, nextResources.compute - def.computeCost);
                    return {
                        resources: nextResources,
                        research: { ...research, active: id, progressHours: 0 }
                    };
                });
            },

            cancelResearch: () => {
                get().refreshState();
                const s = get();
                const activeId = s.research?.active;
                if (!activeId) return;

                const def = RESEARCH[activeId];
                if (!def) return;

                const refundCredits = Math.floor(def.creditsCost * 0.5);
                const refundCompute = Math.floor(def.computeCost * 0.5);

                set(prev => {
                    const nextResources = { ...prev.resources };
                    const caps = prev.resourceCaps;
                    nextResources.credits = Math.max(0, Math.min(nextResources.credits + refundCredits, caps.credits ?? 99999));
                    nextResources.compute = Math.max(0, Math.min(nextResources.compute + refundCompute, caps.compute ?? 999));
                    return {
                        resources: nextResources,
                        research: {
                            ...(prev.research ?? { completed: [], active: null, progressHours: 0 }),
                            active: null,
                            progressHours: 0
                        }
                    };
                });
            },

            // ── buildStructure — avvia cantiere ──────────────────────────────
            buildStructure: (hexId: string, definitionId: string): { success: boolean; error?: string } => {
                get().refreshState();
                const s = get();
                const def = STRUCTURES[definitionId];
                if (!def) return { success: false, error: 'Struttura non trovata' };

                const cell = s.grid.find(c => c.id === hexId);
                if (!cell) return { success: false, error: 'Hex non trovato' };
                if (cell.building_id || isHexOccupied(hexId, s.placedStructures))
                    return { success: false, error: 'Hex già occupato' };
                if (!cell.is_accessible) return { success: false, error: 'Fuori dal raggio di segnale' };

                let secondaryHexId: string | undefined;
                if (def.gridSize >= 2) {
                    const needAccessibleSecondary = definitionId !== 'STR-B03';
                    secondaryHexId = findSecondaryHexId(
                        s.grid,
                        hexId,
                        s.placedStructures,
                        needAccessibleSecondary,
                    ) ?? undefined;
                    if (!secondaryHexId) {
                        return {
                            success: false,
                            error: needAccessibleSecondary
                                ? 'Serve un hex libero e in segnale adiacente'
                                : 'Serve un hex libero adiacente (zona esclusione)',
                        };
                    }
                }

                // Prerequisiti struttura + research
                const completedResearch = (s.research ?? { completed: [] }).completed as ResearchId[];
                const placedIds = Object.values(s.placedStructures)
                    .filter(ps => !ps.building) // solo strutture completate
                    .map(ps => ps.definitionId);
                for (const pre of def.prerequisites) {
                    if (pre.startsWith('research:')) {
                        const rid = pre.replace('research:', '') as ResearchId;
                        if (!completedResearch.includes(rid))
                            return { success: false, error: `Ricerca richiesta: ${rid}` };
                    } else {
                        if (!placedIds.includes(pre))
                            return { success: false, error: `Struttura prerequisito mancante: ${pre}` };
                    }
                }

                // STR-C03: richiede deposito ghiaccio
                if (definitionId === 'STR-C03' && !cell.has_ice_deposit)
                    return { success: false, error: "L'estrattore richiede un deposito di ghiaccio" };

                // Risorse sufficienti?
                for (const [key, cost] of Object.entries(def.buildCost) as [keyof Resources, number][]) {
                    if ((s.resources[key] ?? 0) < cost)
                        return { success: false, error: `Risorse insufficienti: ${key} (serve ${cost})` };
                }

                // Applica costruzione — risorse sottratte subito, struttura in cantiere
                set(prev => {
                    const newRes = { ...prev.resources };
                    for (const [key, cost] of Object.entries(def.buildCost) as [keyof Resources, number][]) {
                        newRes[key] = Math.max(0, (newRes[key] ?? 0) - cost);
                    }
                    const instanceId = `${definitionId}-${Date.now()}`;
                    const isInstant = def.buildTimeHours <= 0;
                    const newPlaced: Record<string, PlacedStructure> = {
                        ...prev.placedStructures,
                        [instanceId]: {
                            instanceId,
                            definitionId,
                            hexId,
                            ...(secondaryHexId ? { secondaryHexId } : {}),
                            health: 100,
                            damaged: false,
                            inStandby: false,
                            assignedDrones: 0,
                            powerLevel: 100,
                            building: !isInstant,
                            buildProgress: isInstant ? 1 : 0,
                            buildStartTime: Date.now(),
                        },
                    };
                    const occupiedIds = new Set([hexId, secondaryHexId].filter(Boolean) as string[]);
                    let newGrid = prev.grid.map(c =>
                        occupiedIds.has(c.id) ? { ...c, building_id: definitionId } : c,
                    );
                    // Ripropaga segnale se ripetitore completato istantaneamente
                    if (definitionId === 'STR-A02' && isInstant) newGrid = propagateSignal(newGrid, newPlaced);
                    return { resources: newRes, placedStructures: newPlaced, grid: newGrid };
                });

                return { success: true };
            },

            // ── setDroneAssignment ────────────────────────────────────────────
            setDroneAssignment: (instanceId: string, drones: number) => {
                get().refreshState();
                set(s => {
                    const ps = s.placedStructures[instanceId];
                    if (!ps) return s;
                    const diff = drones - ps.assignedDrones;
                    if (s.drones.available - diff < 0) return s;
                    return {
                        placedStructures: { ...s.placedStructures, [instanceId]: { ...ps, assignedDrones: drones } },
                        drones: { ...s.drones, available: s.drones.available - diff, assignments: { ...s.drones.assignments, [instanceId]: drones } },
                    };
                });
            },

            recallAllDrones: () => {
                get().refreshState();
                set(s => {
                    const newPlaced = { ...s.placedStructures };
                    for (const id of Object.keys(newPlaced)) {
                        if (newPlaced[id].assignedDrones > 0) {
                            newPlaced[id] = { ...newPlaced[id], assignedDrones: 0 };
                        }
                    }
                    return {
                        placedStructures: newPlaced,
                        drones: { ...s.drones, available: s.drones.total, assignments: {} }
                    };
                });
            },

            setStructurePower: (instanceId: string, level: number) => {
                get().refreshState();
                set(s => {
                    const ps = s.placedStructures[instanceId];
                    if (!ps || ps.definitionId === 'STR-A01') return s;
                    return {
                        placedStructures: { ...s.placedStructures, [instanceId]: { ...ps, powerLevel: Math.max(0, Math.min(100, level)) } }
                    };
                });
            },

            setGroupPower: (definitionId: string, level: number) => {
                get().refreshState();
                set(s => {
                    if (definitionId === 'STR-A01') return s;
                    const newPlaced = { ...s.placedStructures };
                    let changed = false;
                    for (const [id, ps] of Object.entries(newPlaced)) {
                        if (ps.definitionId === definitionId) {
                            newPlaced[id] = { ...ps, powerLevel: Math.max(0, Math.min(100, level)) };
                            changed = true;
                        }
                    }
                    return changed ? { placedStructures: newPlaced } : s;
                });
            },

            shutdownAllPower: () => {
                get().refreshState();
                set(s => {
                    const newPlaced = { ...s.placedStructures };
                    let changed = false;
                    for (const [id, ps] of Object.entries(newPlaced)) {
                        const def = STRUCTURES[ps.definitionId];
                        if (def && def.energyCostPerHour > 0 && ps.powerLevel !== 0 && ps.definitionId !== 'STR-A01') {
                            newPlaced[id] = { ...ps, powerLevel: 0 };
                            changed = true;
                        }
                    }
                    return changed ? { placedStructures: newPlaced } : s;
                });
            },

            togglePause: () => {
                const s = get();
                if (s.paused) {
                    // Se riprendiamo, aggiorna il lastUpdateTime a adesso per evitare sbalzi temporali errati
                    set(prev => ({
                        time: { ...prev.time, lastUpdateTime: Date.now() },
                        paused: false
                    }));
                } else {
                    get().refreshState();
                    set({ paused: true });
                }
            },

            dismissAlert: (id: string) =>
                set(s => ({
                    engineAlerts: s.engineAlerts.filter(a => a.id !== id),
                })),

            repairStructure: (instanceId: string) => {
                get().refreshState();
                const s = get();
                const ps = s.placedStructures[instanceId];
                if (!ps) return { success: false, error: 'Struttura non trovata' };
                if (ps.building) return { success: false, error: 'Struttura ancora in costruzione' };
                if (ps.health >= 100) return { success: false, error: 'Struttura già al massimo dell\'integrità' };

                if ((s.resources.metals ?? 0) < 5 || (s.resources.regolith ?? 0) < 5) {
                    return { success: false, error: 'Risorse insufficienti per riparare (serve: 5 Metalli, 5 Regolite)' };
                }

                set(prev => {
                    const newRes = { ...prev.resources };
                    newRes.metals = Math.max(0, (newRes.metals ?? 0) - 5);
                    newRes.regolith = Math.max(0, (newRes.regolith ?? 0) - 5);

                    const newHealth = Math.min(100, ps.health + 20);
                    const newPlaced = {
                        ...prev.placedStructures,
                        [instanceId]: {
                            ...ps,
                            health: newHealth,
                            damaged: newHealth < 30
                        }
                    };

                    return {
                        resources: newRes,
                        placedStructures: newPlaced
                    };
                });

                return { success: true };
            },

            demolishStructure: (instanceId: string) => {
                get().refreshState();
                const s = get();
                const ps = s.placedStructures[instanceId];
                if (!ps) return { success: false, error: 'Struttura non trovata' };
                if (ps.definitionId === 'STR-A01') return { success: false, error: 'Impossibile demolire il Mainframe' };

                const def = STRUCTURES[ps.definitionId];
                if (!def) return { success: false, error: 'Definizione struttura non trovata' };

                const dronesToRelease = ps.assignedDrones;

                set(prev => {
                    const newRes = { ...prev.resources };
                    for (const [key, cost] of Object.entries(def.buildCost) as [keyof Resources, number][]) {
                        const refund = Math.floor(cost * 0.3);
                        const cap = prev.resourceCaps[key] ?? Infinity;
                        newRes[key] = Math.max(0, Math.min((newRes[key] ?? 0) + refund, cap));
                    }

                    const newPlaced = { ...prev.placedStructures };
                    delete newPlaced[instanceId];

                    const targetHexIds = new Set([ps.hexId, ps.secondaryHexId].filter(Boolean) as string[]);
                    let newGrid = prev.grid.map(cell =>
                        targetHexIds.has(cell.id) ? { ...cell, building_id: null } : cell
                    );

                    newGrid = propagateSignal(newGrid, newPlaced);

                    return {
                        resources: newRes,
                        placedStructures: newPlaced,
                        grid: newGrid,
                        drones: {
                            ...prev.drones,
                            available: prev.drones.available + dronesToRelease,
                        }
                    };
                });

                return { success: true };
            },

            startUrmProduction: (): { success: boolean; error?: string } => {
                get().refreshState();
                const s = get();
                const mainframe = s.placedStructures['mainframe-0'];
                if (!mainframe) return { success: false, error: 'Mainframe non trovato' };
                if (mainframe.urmBuildProgress !== undefined) {
                    return { success: false, error: 'Produzione URM già in corso' };
                }

                const costRegolith = 50;
                const costMetals = 50;
                const costCredits = 100;

                if ((s.resources.regolith ?? 0) < costRegolith ||
                    (s.resources.metals ?? 0) < costMetals ||
                    (s.resources.credits ?? 0) < costCredits) {
                    return { success: false, error: 'Risorse insufficienti (richiesto: 50 Regolite, 50 Metalli, 100 Crediti)' };
                }

                set(prev => {
                    const newRes = { ...prev.resources };
                    newRes.regolith = Math.max(0, (newRes.regolith ?? 0) - costRegolith);
                    newRes.metals = Math.max(0, (newRes.metals ?? 0) - costMetals);
                    newRes.credits = Math.max(0, (newRes.credits ?? 0) - costCredits);

                    const newPlaced = {
                        ...prev.placedStructures,
                        ['mainframe-0']: {
                            ...mainframe,
                            urmBuildProgress: 0
                        }
                    };

                    return {
                        resources: newRes,
                        placedStructures: newPlaced
                    };
                });

                return { success: true };
            },

            upgradeBaseCore: (): { success: boolean; error?: string } => {
                get().refreshState();
                const s = get();
                const mainframe = s.placedStructures['mainframe-0'];
                if (!mainframe) return { success: false, error: 'Mainframe non trovato' };
                const currentLevel = mainframe.upgradeLevel ?? 1;
                if (currentLevel >= 5) {
                    return { success: false, error: 'Livello massimo raggiunto' };
                }

                const upgradeCosts: Record<number, { regolith: number; metals: number; credits: number }> = {
                    2: { regolith: 80, metals: 80, credits: 150 },
                    3: { regolith: 150, metals: 180, credits: 300 },
                    4: { regolith: 250, metals: 300, credits: 500 },
                    5: { regolith: 400, metals: 500, credits: 800 },
                };

                const nextLevel = currentLevel + 1;
                const cost = upgradeCosts[nextLevel];
                if (!cost) return { success: false, error: 'Livello non valido' };

                if ((s.resources.regolith ?? 0) < cost.regolith ||
                    (s.resources.metals ?? 0) < cost.metals ||
                    (s.resources.credits ?? 0) < cost.credits) {
                    return { success: false, error: `Risorse insufficienti (richiesto: ${cost.regolith} Regolite, ${cost.metals} Metalli, ${cost.credits} Crediti)` };
                }

                set(prev => {
                    const newRes = { ...prev.resources };
                    newRes.regolith = Math.max(0, (newRes.regolith ?? 0) - cost.regolith);
                    newRes.metals = Math.max(0, (newRes.metals ?? 0) - cost.metals);
                    newRes.credits = Math.max(0, (newRes.credits ?? 0) - cost.credits);

                    const newPlaced = {
                        ...prev.placedStructures,
                        ['mainframe-0']: {
                            ...mainframe,
                            upgradeLevel: nextLevel
                        }
                    };

                    return {
                        resources: newRes,
                        placedStructures: newPlaced
                    };
                });

                get().refreshState();

                return { success: true };
            },

            refreshState: () => {
                const s = get();
                if (s.gameOver || s.paused) return;
                const now = Date.now();
                const dtHours = (now - s.time.lastUpdateTime) / 3_600_000;
                if (dtHours <= 0) return;

                const result = processUpdate(s, dtHours);
                s.applyUpdateResult(result);

                const { newCycleStarted } = s.updateTime(now);
                if (newCycleStarted) s.processEndOfCycle();

                const freshState = get();
                freshState.updateIAC(calculateIAC(freshState));
            },
        }),
        {
            name: 'selene-game-state-v2', // nuova chiave per evitare conflitti con vecchi salvataggi
            // Guard: in ambienti senza localStorage (test Node.js) usiamo uno
            // storage in-memory silenzioso invece di far spammare stderr al middleware.
            storage: createJSONStorage(() => {
                const _store: Record<string, string> = {};
                let cachedAvailable: boolean | null = null;
                const isAvailable = (): boolean => {
                    if (cachedAvailable !== null) return cachedAvailable;
                    try {
                        if (typeof localStorage === 'undefined' || localStorage === null) {
                            cachedAvailable = false;
                            return false;
                        }
                        const testKey = '__storage_test__';
                        localStorage.setItem(testKey, testKey);
                        localStorage.removeItem(testKey);
                        cachedAvailable = true;
                        return true;
                    } catch {
                        cachedAvailable = false;
                        return false;
                    }
                };
                return {
                    getItem: (key: string): string | null => {
                        if (isAvailable()) return localStorage.getItem(key);
                        return _store[key] ?? null;
                    },
                    setItem: (key: string, value: string): void => {
                        if (isAvailable()) { localStorage.setItem(key, value); return; }
                        _store[key] = value;
                    },
                    removeItem: (key: string): void => {
                        if (isAvailable()) { localStorage.removeItem(key); return; }
                        delete _store[key];
                    },
                };
            }),
            partialize: (state) => ({
                ui: state.ui,
                resources: state.resources,
                resourceCaps: state.resourceCaps,
                time: state.time,
                drones: state.drones,
                grid: state.grid,
                placedStructures: state.placedStructures,
                iacIndex: state.iacIndex,
                helium3ExportedThisCycle: state.helium3ExportedThisCycle,
                energyLowHours: state.energyLowHours,
                gameOver: state.gameOver,
                research: state.research,
                paused: state.paused,
                urmAccumulator: state.urmAccumulator,
                batteryCharge: state.batteryCharge,
            }),
        }
    )
);
