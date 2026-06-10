import type { GameState, PlacedStructure, HexCell, Resources } from '../types/game';
import { STRUCTURES } from '../data/structures';
import { solarEfficiency, droneSaturation, terrainMultiplier } from './gameFormulas';
import {
    getResearchModifiers,
    BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR,
    MAINFRAME_BANDWIDTH_PER_HOUR,
    TERRESTRIAL_RESEARCH_BANDWIDTH_PER_HOUR,
    isTerrestrialResearch,
    hasTerrestrialResearchBandwidth,
} from './researchEffects';
import { isStructureShieldProtected, shieldProtectedHexIds } from './hexUtils';

// ── Costanti ─────────────────────────────────────────────────────────────────
const NIGHT_DAMAGE_PER_HOUR = 0.5;  // HP persi per ora su strutture non protette di notte
const B04_ENERGY_THRESHOLD = 30;     // soglia attivazione automatica cella H₂

// ── Tipi ─────────────────────────────────────────────────────────────────────
export type ResourceDelta = Partial<Resources>;

export interface UpdateResult {
    resourceDelta: ResourceDelta;
    newPlacedStructures: Record<string, PlacedStructure>;
    newGrid: HexCell[];
    newDronesTotal: number;
    helium3Exported: number;
    alerts: string[];
    gameOverBreach: boolean;
    effectiveCaps: Partial<Resources>;
    newUrmAccumulator: number;
    newResearchProgressHours: number; // ore totali di progresso ricerca
}

// ── Helper ───────────────────────────────────────────────────────────────────
function getHex(grid: HexCell[], hexId: string): HexCell | undefined {
    return grid.find(c => c.id === hexId);
}

function countActiveE01(placed: Record<string, PlacedStructure>): number {
    return Object.values(placed).filter(
        ps => ps.definitionId === 'STR-E01' && !ps.inStandby && !ps.building && ps.health > 0
    ).length;
}

function addDelta(delta: ResourceDelta, key: keyof Resources, value: number) {
    delta[key] = (delta[key] ?? 0) + value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: processa un aggiornamento con delta-time
// dtHours = ore reali trascorse dall'ultimo update
// ═══════════════════════════════════════════════════════════════════════════════
export function processUpdate(state: GameState, dtHours: number): UpdateResult {
    const { time, resources, placedStructures, grid } = state;
    const phase = time.phase;

    // Giorno frazionario per solarEfficiency
    const elapsedMs = (state.time.lastUpdateTime - state.time.gameStartTime);
    const totalDays = elapsedMs / 86_400_000;
    const dayInCycle = totalDays % 28;

    const delta: ResourceDelta = {};
    const alerts: string[] = [];
    let newDronesTotal = state.drones.total;
    let helium3Exported = 0;
    let urmAccumulator = state.urmAccumulator;

    // Cloniamo le strutture per mutarle
    const newPlaced = structuredClone(placedStructures) as Record<string, PlacedStructure>;
    
    // Griglia clonata lazy
    let clonedGrid: HexCell[] | null = null;
    const getClonedGrid = (): HexCell[] => {
        if (!clonedGrid) {
            clonedGrid = grid.map(c => ({ ...c }));
        }
        return clonedGrid;
    };

    // Cap dinamici: base 200, ×2 per ogni STR-E01 attivo
    const e01Count = countActiveE01(newPlaced);
    const capMultiplier = Math.pow(2, e01Count);

    const effectiveCaps: Partial<Resources> = {
        regolith: 200 * capMultiplier,
        metals: 200 * capMultiplier,
        ice: 200 * capMultiplier,
        oxygen: 500 * capMultiplier,
        hydrogen: 500 * capMultiplier,
        helium3: 200 * capMultiplier,
        cement: 200 * capMultiplier,
    };

    const energyNow = resources.energy;
    const completedResearch = (state.research ?? { completed: [] }).completed;
    const mods = getResearchModifiers(completedResearch);
    const coveredHexes = shieldProtectedHexIds(newPlaced);
    const urmHoursPerUnit = mods.urmHoursPerUnit;

    const activeResearch = state.research?.active;
    const terrestrialResearchActive = activeResearch && isTerrestrialResearch(activeResearch);

    // ── Avanza produzione URM nel Nucleo Base ───────────────────────────────
    const URM_BUILD_TIME_HOURS = 2.0;
    for (const [instanceId, ps] of Object.entries(newPlaced)) {
        if (ps.definitionId === 'STR-A01' && ps.urmBuildProgress !== undefined) {
            const newUrmProgress = ps.urmBuildProgress + (dtHours / URM_BUILD_TIME_HOURS);
            if (newUrmProgress >= 1) {
                newPlaced[instanceId] = {
                    ...ps,
                    urmBuildProgress: undefined
                };
                newDronesTotal += 1;
                alerts.push('✦ Nuovo URM creato nel Nucleo Base');
            } else {
                newPlaced[instanceId] = {
                    ...ps,
                    urmBuildProgress: newUrmProgress
                };
            }
        }
    }

    // ── Banda: calcolata come rate istantaneo (non cumulativo) ──────────
    const mainframe = Object.values(newPlaced).find(ps => ps.definitionId === 'STR-A01');
    const mainframeLevel = mainframe?.upgradeLevel ?? 1;
    const getBaseCoreBandwidthProduction = (lvl: number) => {
        if (lvl <= 1) return 0;
        if (lvl === 2) return 1.5;
        if (lvl === 3) return 3.0;
        if (lvl === 4) return 5.0;
        return 7.0; // level 5
    };
    const mainframeBandwidthProduction = getBaseCoreBandwidthProduction(mainframeLevel);
    const droneBandwidthConsumption = newDronesTotal * 0.2;

    const bandwidthProduction = BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR + mods.bandwidthBonusPerHour + mainframeBandwidthProduction;
    const bandwidthConsumption = MAINFRAME_BANDWIDTH_PER_HOUR
        + droneBandwidthConsumption
        + (terrestrialResearchActive ? TERRESTRIAL_RESEARCH_BANDWIDTH_PER_HOUR : 0);
    const netBandwidth = Math.max(0, bandwidthProduction - bandwidthConsumption);
    // Il delta porta la bandwidth dal valore corrente al valore calcolato
    addDelta(delta, 'bandwidth', netBandwidth - resources.bandwidth);

    if (resources.bandwidth > 0 && netBandwidth === 0 && !state.gameOver) {
        alerts.push('⚠ Banda di trasmissione esaurita! Potenzia il Nucleo Base o riduci le unità URM.');
    }

    // ── Pre-elaborazione celle e centrali idrogeno (attivazione automatica) ───
    for (const ps of Object.values(newPlaced)) {
        if (ps.definitionId === 'STR-B04' && !ps.building) {
            ps.inStandby = !(energyNow < B04_ENERGY_THRESHOLD && resources.hydrogen > 0);
        }
        if (ps.definitionId === 'STR-B00' && !ps.building) {
            ps.inStandby = !(energyNow < 150 && resources.hydrogen > 0);
        }
        if (ps.definitionId === 'STR-B06' && !ps.building) {
            ps.inStandby = !(energyNow < 150 && resources.hydrogen > 0 && resources.oxygen > 0);
        }
    }

    // Mappa per tracciare il tempo operativo effettivo di ciascuna struttura in questo tick.
    // Di base, se una struttura non è in costruzione, è attiva per l'intero dtHours.
    const operationalTimes: Record<string, number> = {};
    for (const id of Object.keys(newPlaced)) {
        operationalTimes[id] = dtHours;
    }

    // ── Avanza costruzioni in corso ─────────────────────────────────────────
    for (const [instanceId, ps] of Object.entries(newPlaced)) {
        if (!ps.building) continue;
        const def = STRUCTURES[ps.definitionId];
        if (!def || def.buildTimeHours <= 0) {
            // Completamento istantaneo se buildTimeHours è 0
            newPlaced[instanceId] = { ...ps, building: false, buildProgress: 1 };
            operationalTimes[instanceId] = dtHours;
            continue;
        }

        // Calcola droni bonus: -20% tempo per URM, max -60%
        const droneSpeedup = 1 + Math.min(ps.assignedDrones * 0.2, 0.6);
        const progressIncrement = (dtHours / def.buildTimeHours) * droneSpeedup;
        const newProgress = Math.min(1, ps.buildProgress + progressIncrement);

        if (newProgress >= 1) {
            const remainingBuildTime = ((1 - ps.buildProgress) * def.buildTimeHours) / droneSpeedup;
            newPlaced[instanceId] = { ...ps, building: false, buildProgress: 1 };
            operationalTimes[instanceId] = Math.max(0, dtHours - remainingBuildTime);
            alerts.push(`✓ ${def.name} completato su ${ps.hexId}`);
        } else {
            newPlaced[instanceId] = { ...ps, buildProgress: newProgress };
            operationalTimes[instanceId] = 0;
        }
    }

    // ── Processa ogni struttura operativa ────────────────────────────────────
    for (const [instanceId, ps] of Object.entries(newPlaced)) {
        if (ps.health <= 0 || ps.building) continue;

        const def = STRUCTURES[ps.definitionId];
        if (!def) continue;

        const hex = getHex(clonedGrid ?? grid, ps.hexId);
        const powerMultiplier = (ps.powerLevel ?? 100) / 100;
        const isActive = !ps.inStandby && def.activePhases.includes(phase) && powerMultiplier > 0;

        const opDt = operationalTimes[instanceId] ?? dtHours;

        // ──── Consumo energetico (sempre, anche se non in fase attiva) ───────
        if (ps.definitionId === 'STR-E03') {
            if (phase === 'NOTTE' || phase === 'PREALBA') {
                addDelta(delta, 'energy', -def.energyCostPerHour * powerMultiplier * opDt);
            }
        } else {
            addDelta(delta, 'energy', -def.energyCostPerHour * powerMultiplier * opDt);
        }

        if (!isActive) continue;

        // ──── Moltiplicatore droni ──────────────────────────────────────────
        const assigned = ps.assignedDrones;
        const droneMultiplier = def.optimalDrones === 0
            ? 1
            : droneSaturation(assigned, def.optimalDrones);

        const effMult = droneMultiplier * powerMultiplier * opDt;

        // ──── Produzione per struttura ──────────────────────────────────────
        switch (ps.definitionId) {

            // --- CAT-A ---
            case 'STR-A01':
                addDelta(delta, 'compute', (def.productionPerHour.compute ?? 0) * mods.computeMult * powerMultiplier * opDt);
                break;

            case 'STR-A02':
                break;

            // --- CAT-B ---
            case 'STR-B01': {
                const solar = solarEfficiency(phase, dayInCycle);
                const yield_ = (def.productionPerHour.energy ?? 0) * solar * effMult;
                addDelta(delta, 'energy', yield_);
                break;
            }

            case 'STR-B02':
                break;

            case 'STR-B03': {
                const base = def.productionPerHour.energy ?? 60;
                const output = mods.b03FullOutput
                    ? base
                    : (assigned < 2 ? base * 0.6 : base);
                addDelta(delta, 'energy', output * powerMultiplier * opDt);
                break;
            }

            case 'STR-B04': {
                if (ps.inStandby) break;
                if (resources.hydrogen <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'energy', (def.productionPerHour.energy ?? 0) * mods.b04EnergyMult * effMult);
                addDelta(delta, 'hydrogen', -2 * powerMultiplier * opDt);
                break;
            }

            // --- CAT-C ---
            case 'STR-C01': {
                const terrain = hex?.terrain ?? 'PIANO';
                addDelta(delta, 'regolith', (def.productionPerHour.regolith ?? 0) * effMult * terrainMultiplier(terrain, 'default'));
                addDelta(delta, 'metals', (def.productionPerHour.metals ?? 0) * effMult * terrainMultiplier(terrain, 'metals'));
                break;
            }

            case 'STR-C02': {
                const terrain = hex?.terrain ?? 'PIANO';
                const mineMult = effMult * mods.c02MiningMult;
                addDelta(delta, 'regolith', (def.productionPerHour.regolith ?? 0) * mineMult * terrainMultiplier(terrain, 'default'));
                addDelta(delta, 'metals', (def.productionPerHour.metals ?? 0) * mineMult * terrainMultiplier(terrain, 'metals'));
                break;
            }

            case 'STR-C03': {
                const hexCell = getHex(clonedGrid ?? grid, ps.hexId);
                if (!hexCell?.has_ice_deposit) {
                    newPlaced[instanceId].inStandby = true;
                    alerts.push(`STR-C03 su ${ps.hexId}: deposito ghiaccio esaurito`);
                    break;
                }

                let iceYield = def.productionPerHour.ice ?? 8;
                if (hex?.terrain === 'OMBRA_PERMANENTE') iceYield *= 1.5;
                if (phase === 'GIORNO' && hex?.terrain !== 'OMBRA_PERMANENTE') iceYield *= 0.7;

                addDelta(delta, 'ice', iceYield * effMult);

                // Decrementa il deposito
                const actualGrid = getClonedGrid();
                const hexIdx = actualGrid.findIndex(c => c.id === ps.hexId);
                if (hexIdx >= 0) {
                    actualGrid[hexIdx].iceHoursRemaining -= opDt * powerMultiplier;
                    if (actualGrid[hexIdx].iceHoursRemaining <= 0) {
                        actualGrid[hexIdx].has_ice_deposit = false;
                        actualGrid[hexIdx].iceHoursRemaining = 0;
                        alerts.push(`⚠ Deposito ghiaccio esaurito su hex ${ps.hexId}`);
                    }
                }
                break;
            }

            case 'STR-C04': {
                if (resources.ice <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'oxygen', (def.productionPerHour.oxygen ?? 0) * effMult);
                addDelta(delta, 'hydrogen', (def.productionPerHour.hydrogen ?? 0) * effMult);
                addDelta(delta, 'ice', -3 * powerMultiplier * opDt);
                break;
            }

            case 'STR-C05': {
                const he3Base = def.productionPerHour.helium3 ?? 5;
                const he3Rate = (phase === 'NOTTE' || phase === 'PREALBA' ? he3Base * 0.5 : he3Base) * mods.c05He3Mult;
                addDelta(delta, 'helium3', he3Rate * effMult);
                helium3Exported += he3Rate * effMult;
                break;
            }

            case 'STR-C06': {
                if (resources.regolith <= 10) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'cement', (def.productionPerHour.cement ?? 0) * mods.c06CementMult * effMult);
                addDelta(delta, 'regolith', -8 * powerMultiplier * opDt);
                break;
            }

            // --- CAT-D ---
            case 'STR-D01':
                addDelta(delta, 'compute', (def.productionPerHour.compute ?? 0) * mods.computeMult * effMult);
                break;

            case 'STR-D02': {
                let computeOut = (def.productionPerHour.compute ?? 0) * mods.computeMult * effMult;
                if (phase === 'NOTTE' || phase === 'PREALBA') computeOut *= 1.2;
                addDelta(delta, 'compute', computeOut);
                break;
            }

            // --- CAT-E ---
            case 'STR-E01':
                break;

            case 'STR-E02': {
                // +1 URM ogni urmHoursPerUnit ore reali (con accumulator)
                urmAccumulator += opDt / urmHoursPerUnit * droneMultiplier * powerMultiplier;
                while (urmAccumulator >= 1) {
                    urmAccumulator -= 1;
                    newDronesTotal += 1;
                    alerts.push('✦ Nuovo URM prodotto dall\'Officina');
                }
                break;
            }

            case 'STR-E03':
                break;

            case 'STR-B00': {
                if (ps.inStandby) break;
                if (resources.hydrogen <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'energy', (def.productionPerHour.energy ?? 8) * effMult);
                addDelta(delta, 'hydrogen', -0.5 * powerMultiplier * opDt);
                break;
            }

            case 'STR-E04': {
                if (resources.ice <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'oxygen', (def.productionPerHour.oxygen ?? 8) * effMult);
                addDelta(delta, 'ice', -5 * powerMultiplier * opDt);
                break;
            }

            case 'STR-E05': {
                if (resources.oxygen <= 0 || resources.ice <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'compute', (def.productionPerHour.compute ?? 40) * effMult);
                addDelta(delta, 'credits', (def.productionPerHour.credits ?? 30) * effMult);
                addDelta(delta, 'oxygen', -6 * powerMultiplier * opDt);
                addDelta(delta, 'ice', -4 * powerMultiplier * opDt);
                break;
            }

            case 'STR-B05': {
                addDelta(delta, 'energy', (def.productionPerHour.energy ?? 35) * effMult);
                break;
            }

            case 'STR-C07': {
                if (resources.regolith <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'metals', (def.productionPerHour.metals ?? 15) * effMult);
                addDelta(delta, 'helium3', (def.productionPerHour.helium3 ?? 2) * effMult);
                helium3Exported += (def.productionPerHour.helium3 ?? 2) * effMult;
                addDelta(delta, 'regolith', -20 * powerMultiplier * opDt);
                break;
            }

            case 'STR-E06': {
                if (resources.hydrogen <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'credits', (def.productionPerHour.credits ?? 100) * effMult);
                addDelta(delta, 'hydrogen', -10 * powerMultiplier * opDt);
                break;
            }

            case 'STR-C08': {
                if (resources.regolith <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'hydrogen', (def.productionPerHour.hydrogen ?? 6) * effMult);
                addDelta(delta, 'regolith', -15 * powerMultiplier * opDt);
                break;
            }

            case 'STR-B06': {
                if (ps.inStandby) break;
                if (resources.hydrogen <= 0 || resources.oxygen <= 0) {
                    newPlaced[instanceId].inStandby = true;
                    break;
                }
                addDelta(delta, 'energy', (def.productionPerHour.energy ?? 150) * effMult);
                addDelta(delta, 'hydrogen', -8 * powerMultiplier * opDt);
                addDelta(delta, 'oxygen', -4 * powerMultiplier * opDt);
                break;
            }
        }

        // ──── Danni notturni ────────────────────────────────────────────────
        if (phase === 'NOTTE' || phase === 'PREALBA') {
            const isProtected = isStructureShieldProtected(ps, coveredHexes);
            if (!isProtected && ps.definitionId !== 'STR-A01') {
                const dmg = NIGHT_DAMAGE_PER_HOUR * mods.nightDamageMult * opDt;
                newPlaced[instanceId].health = Math.max(0, ps.health - dmg);
                newPlaced[instanceId].damaged = newPlaced[instanceId].health < 30;

                if (ps.health >= 60 && newPlaced[instanceId].health < 60) {
                    alerts.push(`⚠ ${def.name} su ${ps.hexId}: health < 60% — non protetto!`);
                }
                if (newPlaced[instanceId].health === 0) {
                    alerts.push(`✖ ${def.name} su ${ps.hexId}: distrutta dal freddo`);
                }
            }
        }

        // ── Danni da supporto vitale (solo per STR-E05) ───────────────────
        if (ps.definitionId === 'STR-E05') {
            if (resources.oxygen <= 0 || resources.ice <= 0) {
                const dmg = 8 * opDt; // 8 HP di danno all'ora
                newPlaced[instanceId].health = Math.max(0, ps.health - dmg);
                newPlaced[instanceId].damaged = newPlaced[instanceId].health < 30;
                alerts.push(`⚠ Modulo Abitativo su ${ps.hexId}: supporto vitale compromesso per mancanza di aria/acqua!`);
                if (ps.health > 0 && newPlaced[instanceId].health === 0) {
                    alerts.push(`✖ Modulo Abitativo su ${ps.hexId}: evacuato permanentemente per asfissia`);
                }
            }
        }
    }

    // ── Verifica game over ────────────────────────────────────────────────────
    const energyAfter = (resources.energy + (delta.energy ?? 0));
    const gameOverBreach = energyAfter <= 0;

    // ── Applica cap effettivi (nessun overflow) ──────────────────────────────
    for (const key of Object.keys(effectiveCaps) as (keyof Resources)[]) {
        const cap = effectiveCaps[key];
        if (cap !== undefined && delta[key] !== undefined) {
            const projected = (resources[key] ?? 0) + (delta[key] ?? 0);
            if (projected > cap) {
                delta[key] = cap - (resources[key] ?? 0);
            }
        }
    }

    // ── Progresso ricerca ────────────────────────────────────────────────────
    const research = state.research ?? { completed: [], active: null, progressHours: 0 };
    let newResearchProgressHours = research.progressHours;
    if (research.active) {
        const terrestrialBlocked =
            isTerrestrialResearch(research.active) && !hasTerrestrialResearchBandwidth(resources);
        if (terrestrialBlocked) {
            alerts.push('⚠ Banda insufficiente — ricerca terrestre sospesa');
        } else {
            const d02Active = Object.values(newPlaced).some(
                (ps: PlacedStructure) => ps.definitionId === 'STR-D02' && !ps.inStandby && !ps.building && ps.health > 0
            );
            const researchSpeed = d02Active ? 1.5 : 1;
            newResearchProgressHours += dtHours * researchSpeed;
        }
    }

    return {
        resourceDelta: delta,
        newPlacedStructures: newPlaced,
        newGrid: clonedGrid ?? grid,
        newDronesTotal,
        helium3Exported,
        alerts,
        gameOverBreach,
        effectiveCaps,
        newUrmAccumulator: urmAccumulator,
        newResearchProgressHours,
    };
}

export function getStructureActualRates(ps: PlacedStructure, state: GameState): Partial<Resources> {
    if (ps.health <= 0 || ps.building) return {};

    const def = STRUCTURES[ps.definitionId];
    if (!def) return {};

    const completedResearch = (state.research ?? { completed: [] }).completed;
    const mods = getResearchModifiers(completedResearch);
    const phase = state.time.phase;

    // Giorno frazionario per solarEfficiency
    const elapsedMs = (state.time.lastUpdateTime - state.time.gameStartTime);
    const totalDays = elapsedMs / 86_400_000;
    const dayInCycle = totalDays % 28;

    const powerMultiplier = (ps.powerLevel ?? 100) / 100;
    const isActive = !ps.inStandby && def.activePhases.includes(phase) && powerMultiplier > 0;

    const rates: Partial<Resources> = {};

    // Consumo energetico (avviene sempre se health > 0 e non building, anche se inattiva)
    if (ps.definitionId === 'STR-E03') {
        if (phase === 'NOTTE' || phase === 'PREALBA') {
            rates.energy = -def.energyCostPerHour * powerMultiplier;
        }
    } else if (def.energyCostPerHour > 0) {
        rates.energy = -def.energyCostPerHour * powerMultiplier;
    }

    if (!isActive) return rates;

    const droneMultiplier = def.optimalDrones === 0
        ? 1
        : droneSaturation(ps.assignedDrones, def.optimalDrones);

    const effMult = droneMultiplier * powerMultiplier;

    // Produzione per struttura
    switch (ps.definitionId) {
        // --- CAT-A ---
        case 'STR-A01':
            rates.compute = (def.productionPerHour.compute ?? 0) * mods.computeMult * powerMultiplier;
            break;

        case 'STR-A02':
            break;

        // --- CAT-B ---
        case 'STR-B01': {
            const solar = solarEfficiency(phase, dayInCycle);
            rates.energy = (def.productionPerHour.energy ?? 0) * solar * effMult;
            break;
        }

        case 'STR-B02':
            break;

        case 'STR-B03': {
            const base = def.productionPerHour.energy ?? 60;
            const output = mods.b03FullOutput
                ? base
                : (ps.assignedDrones < 2 ? base * 0.6 : base);
            rates.energy = output * powerMultiplier;
            break;
        }

        case 'STR-B04': {
            rates.energy = (def.productionPerHour.energy ?? 0) * mods.b04EnergyMult * effMult;
            rates.hydrogen = -2 * powerMultiplier;
            break;
        }

        // --- CAT-C ---
        case 'STR-C01': {
            const hex = state.grid.find(c => c.id === ps.hexId);
            const terrain = hex?.terrain ?? 'PIANO';
            rates.regolith = (def.productionPerHour.regolith ?? 0) * effMult * terrainMultiplier(terrain, 'default');
            rates.metals = (def.productionPerHour.metals ?? 0) * effMult * terrainMultiplier(terrain, 'metals');
            break;
        }

        case 'STR-C02': {
            const hex = state.grid.find(c => c.id === ps.hexId);
            const terrain = hex?.terrain ?? 'PIANO';
            const mineMult = effMult * mods.c02MiningMult;
            rates.regolith = (def.productionPerHour.regolith ?? 0) * mineMult * terrainMultiplier(terrain, 'default');
            rates.metals = (def.productionPerHour.metals ?? 0) * mineMult * terrainMultiplier(terrain, 'metals');
            break;
        }

        case 'STR-C03': {
            const hex = state.grid.find(c => c.id === ps.hexId);
            if (!hex?.has_ice_deposit) break;

            let iceYield = def.productionPerHour.ice ?? 8;
            if (hex?.terrain === 'OMBRA_PERMANENTE') iceYield *= 1.5;
            if (phase === 'GIORNO' && hex?.terrain !== 'OMBRA_PERMANENTE') iceYield *= 0.7;

            rates.ice = iceYield * effMult;
            break;
        }

        case 'STR-C04': {
            rates.oxygen = (def.productionPerHour.oxygen ?? 0) * effMult;
            rates.hydrogen = (def.productionPerHour.hydrogen ?? 0) * effMult;
            rates.ice = -3 * powerMultiplier;
            break;
        }

        case 'STR-C05': {
            const he3Base = def.productionPerHour.helium3 ?? 5;
            const he3Rate = (phase === 'NOTTE' || phase === 'PREALBA' ? he3Base * 0.5 : he3Base) * mods.c05He3Mult;
            rates.helium3 = he3Rate * effMult;
            break;
        }

        case 'STR-C06': {
            rates.cement = (def.productionPerHour.cement ?? 0) * mods.c06CementMult * effMult;
            rates.regolith = -8 * powerMultiplier;
            break;
        }

        // --- CAT-D ---
        case 'STR-D01':
            rates.compute = (def.productionPerHour.compute ?? 0) * mods.computeMult * effMult;
            break;

        case 'STR-D02': {
            let computeOut = (def.productionPerHour.compute ?? 0) * mods.computeMult * effMult;
            if (phase === 'NOTTE' || phase === 'PREALBA') computeOut *= 1.2;
            rates.compute = computeOut;
            break;
        }

        // --- CAT-E ---
        case 'STR-E01':
            break;

        case 'STR-E02': {
            // Not a resource production in resources dict, but we return {} or empty as it manages urmAccumulator directly
            break;
        }

        case 'STR-E03':
            break;

        case 'STR-B00': {
            rates.energy = (def.productionPerHour.energy ?? 8) * effMult;
            rates.hydrogen = -0.5 * powerMultiplier;
            break;
        }

        case 'STR-E04': {
            rates.oxygen = (def.productionPerHour.oxygen ?? 8) * effMult;
            rates.ice = -5 * powerMultiplier;
            break;
        }

        case 'STR-E05': {
            rates.compute = (def.productionPerHour.compute ?? 40) * effMult;
            rates.credits = (def.productionPerHour.credits ?? 30) * effMult;
            rates.oxygen = -6 * powerMultiplier;
            rates.ice = -4 * powerMultiplier;
            break;
        }

        case 'STR-B05': {
            rates.energy = (def.productionPerHour.energy ?? 35) * effMult;
            break;
        }

        case 'STR-C07': {
            rates.metals = (def.productionPerHour.metals ?? 15) * effMult;
            rates.helium3 = (def.productionPerHour.helium3 ?? 2) * effMult;
            rates.regolith = -20 * powerMultiplier;
            break;
        }

        case 'STR-E06': {
            rates.credits = (def.productionPerHour.credits ?? 100) * effMult;
            rates.hydrogen = -10 * powerMultiplier;
            break;
        }

        case 'STR-C08': {
            rates.hydrogen = (def.productionPerHour.hydrogen ?? 6) * effMult;
            rates.regolith = -15 * powerMultiplier;
            break;
        }

        case 'STR-B06': {
            rates.energy = (def.productionPerHour.energy ?? 150) * effMult;
            rates.hydrogen = -8 * powerMultiplier;
            rates.oxygen = -4 * powerMultiplier;
            break;
        }
    }

    return rates;
}
