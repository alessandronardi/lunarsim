import { describe, expect, it } from 'vitest';
import { processUpdate, getStructureActualRates } from './gameEngine';
import { makeMinimalGameState, makeHex } from '../test/fixtures';
import type { GameState, PlacedStructure } from '../types/game';

describe('processUpdate', () => {
    it('applies helium3_extraction bonus to STR-C05 output', () => {
        const c05: PlacedStructure = {
            instanceId: 'c05',
            definitionId: 'STR-C05',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 2,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const placed = {
            'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
            c05,
        };
        const base = makeMinimalGameState({
            research: { completed: [], active: null, progressHours: 0 },
            placedStructures: placed,
        });
        const boosted = makeMinimalGameState({
            research: { completed: ['helium3_extraction'], active: null, progressHours: 0 },
            placedStructures: placed,
        });

        const r0 = processUpdate(base, 1);
        const r1 = processUpdate(boosted, 1);
        expect((r1.resourceDelta.helium3 ?? 0)).toBeGreaterThan((r0.resourceDelta.helium3 ?? 0));
    });

    it('reduces night damage with dust_heat_resistance', () => {
        const miner: PlacedStructure = {
            instanceId: 'c01',
            definitionId: 'STR-C01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const nightState = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'NOTTE',
            },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                c01: miner,
            },
        });
        const protectedState = makeMinimalGameState({
            ...nightState,
            research: { completed: ['dust_heat_resistance'], active: null, progressHours: 0 },
        });

        const r0 = processUpdate(nightState, 2);
        const r1 = processUpdate(protectedState, 2);
        const h0 = r0.newPlacedStructures.c01.health;
        const h1 = r1.newPlacedStructures.c01.health;
        expect(h1).toBeGreaterThan(h0);
    });

    it('terrestrial research costs more bandwidth per hour than idle uplink', () => {
        const idle = processUpdate(
            makeMinimalGameState({ research: { completed: [], active: null, progressHours: 0 } }),
            1,
        );
        const active = processUpdate(
            makeMinimalGameState({
                research: { completed: [], active: 'heavy_drill', progressHours: 0 },
            }),
            1,
        );
        expect(active.resourceDelta.bandwidth ?? 0).toBeLessThan(idle.resourceDelta.bandwidth ?? 0);
    });

    it('produces bandwidth from SCC uplink even without heavy_drill', () => {
        const state = makeMinimalGameState({
            research: { completed: [], active: null, progressHours: 0 },
            resources: { ...makeMinimalGameState().resources, bandwidth: 0 },
            drones: { total: 0, available: 0, assignments: {} }
        });
        const result = processUpdate(state, 1);
        // 1.75 uplink − 0.25 mainframe
        expect(result.resourceDelta.bandwidth).toBeCloseTo(1.5, 1);
    });

    it('produces more bandwidth with heavy_drill completed', () => {
        const base = processUpdate(
            makeMinimalGameState({ research: { completed: [], active: null, progressHours: 0 } }),
            1,
        );
        const boosted = processUpdate(
            makeMinimalGameState({
                research: { completed: ['heavy_drill'], active: null, progressHours: 0 },
            }),
            1,
        );
        expect(boosted.resourceDelta.bandwidth ?? 0).toBeGreaterThan(base.resourceDelta.bandwidth ?? 0);
    });

    it('stalls terrestrial research when bandwidth is below threshold', () => {
        const state = makeMinimalGameState({
            research: { completed: [], active: 'heavy_drill', progressHours: 0 },
            resources: { ...makeMinimalGameState().resources, bandwidth: 1 },
        });
        const result = processUpdate(state, 1);
        expect(result.newResearchProgressHours).toBe(0);
        expect(result.alerts.some(a => a.includes('Banda insufficiente'))).toBe(true);
    });

    it('applies fuel_cell bonus to STR-B04 energy output', () => {
        const b04: PlacedStructure = {
            instanceId: 'b04',
            definitionId: 'STR-B04',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 2,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const night = (research: GameState['research']) =>
            makeMinimalGameState({
                time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
                resources: { ...makeMinimalGameState().resources, hydrogen: 50, energy: 20 },
                placedStructures: { b04 },
                research,
            });

        const base = processUpdate(night({ completed: [], active: null, progressHours: 0 }), 1);
        const boosted = processUpdate(night({ completed: ['fuel_cell'], active: null, progressHours: 0 }), 1);
        expect(boosted.resourceDelta.energy ?? 0).toBeGreaterThan(base.resourceDelta.energy ?? 0);
    });

    it('applies heavy_drill bonus to STR-C02 mining', () => {
        const c02: PlacedStructure = {
            instanceId: 'c02',
            definitionId: 'STR-C02',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 5,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const placed = { c02 };
        const base = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                resources: { ...makeMinimalGameState().resources, regolith: 0 },
            }),
            1,
        );
        const boosted = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                resources: { ...makeMinimalGameState().resources, regolith: 0 },
                research: { completed: ['heavy_drill'], active: null, progressHours: 0 },
            }),
            1,
        );
        expect(boosted.resourceDelta.regolith ?? 0).toBeGreaterThan(base.resourceDelta.regolith ?? 0);
    });

    it('applies nuclear_reactor full STR-B03 output without enough URM drones', () => {
        const b03: PlacedStructure = {
            instanceId: 'b03',
            definitionId: 'STR-B03',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const placed = { b03 };
        const partial = processUpdate(
            makeMinimalGameState({ placedStructures: placed }),
            1,
        );
        const full = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                research: { completed: ['nuclear_reactor'], active: null, progressHours: 0 },
            }),
            1,
        );
        expect(full.resourceDelta.energy ?? 0).toBeGreaterThan(partial.resourceDelta.energy ?? 0);
        expect(partial.resourceDelta.energy).toBeCloseTo(36, 0);
        expect(full.resourceDelta.energy).toBeCloseTo(60, 0);
    });

    it('applies advanced_regolith_conversion bonus to STR-C06 cement', () => {
        const c06: PlacedStructure = {
            instanceId: 'c06',
            definitionId: 'STR-C06',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 3,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const placed = {
            'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
            c06,
        };
        const base = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                resources: { ...makeMinimalGameState().resources, regolith: 100 },
            }),
            1,
        );
        const boosted = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                resources: { ...makeMinimalGameState().resources, regolith: 100 },
                research: { completed: ['advanced_regolith_conversion'], active: null, progressHours: 0 },
            }),
            1,
        );
        expect(boosted.resourceDelta.cement ?? 0).toBeGreaterThan(base.resourceDelta.cement ?? 0);
    });

    it('applies autonomous_lab +20% compute from STR-A01', () => {
        const base = processUpdate(
            makeMinimalGameState({ research: { completed: [], active: null, progressHours: 0 } }),
            1,
        );
        const boosted = processUpdate(
            makeMinimalGameState({
                research: { completed: ['autonomous_lab'], active: null, progressHours: 0 },
            }),
            1,
        );
        expect(boosted.resourceDelta.compute ?? 0).toBeGreaterThan(base.resourceDelta.compute ?? 0);
    });

    it('doubles STR-E02 URM rate with autonomous_urm_production', () => {
        const e02: PlacedStructure = {
            instanceId: 'e02',
            definitionId: 'STR-E02',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 3,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const placed = { e02 };
        const baseTotal = makeMinimalGameState().drones.total;
        const slow = processUpdate(
            makeMinimalGameState({ placedStructures: placed, urmAccumulator: 0 }),
            2,
        );
        const fast = processUpdate(
            makeMinimalGameState({
                placedStructures: placed,
                urmAccumulator: 0,
                research: { completed: ['autonomous_urm_production'], active: null, progressHours: 0 },
            }),
            2,
        );
        expect(slow.newDronesTotal).toBe(baseTotal);
        expect(fast.newDronesTotal).toBe(baseTotal + 1);
    });

    it('STR-E03 shields adjacent hex from night damage', () => {
        const shield: PlacedStructure = {
            instanceId: 'e03',
            definitionId: 'STR-E03',
            hexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const miner: PlacedStructure = {
            instanceId: 'c01',
            definitionId: 'STR-C01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const nightState = makeMinimalGameState({
            time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                e03: shield,
                c01: miner,
            },
        });
        const unshielded = makeMinimalGameState({
            time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                c01: miner,
            },
        });
        const rShielded = processUpdate(nightState, 2);
        const rBare = processUpdate(unshielded, 2);
        expect(rShielded.newPlacedStructures.c01.health).toBe(100);
        expect(rBare.newPlacedStructures.c01.health).toBeLessThan(100);
    });

    it('2-hex structure avoids night damage when secondary hex is shielded', () => {
        const shield: PlacedStructure = {
            instanceId: 'e03',
            definitionId: 'STR-E03',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const reactor: PlacedStructure = {
            instanceId: 'b03',
            definitionId: 'STR-B03',
            hexId: '3,0',
            secondaryHexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const nightState = makeMinimalGameState({
            time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                e03: shield,
                b03: reactor,
            },
        });
        const result = processUpdate(nightState, 2);
        expect(result.newPlacedStructures.b03.health).toBe(100);
    });

    it('STR-B00 Micro Fuel Cell consumes hydrogen and produces energy at night', () => {
        const b00: PlacedStructure = {
            instanceId: 'b00',
            definitionId: 'STR-B00',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 1,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const nightState = makeMinimalGameState({
            time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
            resources: { ...makeMinimalGameState().resources, hydrogen: 10, energy: 50 },
            placedStructures: { b00 },
        });
        const result = processUpdate(nightState, 2);
        expect(result.resourceDelta.energy).toBeCloseTo(19.2, 1); // 8 * 1.2 (drone mult) * 2 ore = 19.2
        expect(result.resourceDelta.hydrogen).toBe(-1); // -0.5 * 2 ore
    });

    it('STR-C08 Regolith Pyrolyzer extracts hydrogen from regolith', () => {
        const c08: PlacedStructure = {
            instanceId: 'c08',
            definitionId: 'STR-C08',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 2,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const state = makeMinimalGameState({
            resources: { ...makeMinimalGameState().resources, regolith: 100, hydrogen: 0 },
            placedStructures: { c08 },
        });
        const result = processUpdate(state, 1);
        expect(result.resourceDelta.hydrogen).toBeCloseTo(9, 1); // 6 * 1.5 (drone mult) = 9
        expect(result.resourceDelta.regolith).toBe(-15);
    });

    it('STR-B06 Hydrogen Combustion Plant generates massive energy from hydrogen and oxygen at night', () => {
        const b06: PlacedStructure = {
            instanceId: 'b06',
            definitionId: 'STR-B06',
            hexId: '1,0',
            secondaryHexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 3,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const nightState = makeMinimalGameState({
            time: { ...makeMinimalGameState().time, phase: 'NOTTE' },
            resources: { ...makeMinimalGameState().resources, hydrogen: 50, oxygen: 50, energy: 20 },
            placedStructures: { b06 },
        });
        const result = processUpdate(nightState, 1);
        expect(result.resourceDelta.energy).toBeCloseTo(270, 1); // 150 * 1.8 (drone mult) = 270
        expect(result.resourceDelta.hydrogen).toBe(-8);
        expect(result.resourceDelta.oxygen).toBe(-4);
    });

    it('STR-E05 Habitation Module takes damage when oxygen or water runs out', () => {
        const e05: PlacedStructure = {
            instanceId: 'e05',
            definitionId: 'STR-E05',
            hexId: '1,0',
            secondaryHexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const starvingState = makeMinimalGameState({
            resources: { ...makeMinimalGameState().resources, oxygen: 0, ice: 10 },
            placedStructures: { e05 },
        });
        const result = processUpdate(starvingState, 2);
        // 8 HP/ora * 2 ore = 16 HP persi
        expect(result.newPlacedStructures.e05.health).toBe(84);
        expect(result.alerts.some(a => a.includes('supporto vitale'))).toBe(true);
    });

    it('STR-E06 Commercial Spaceport generates credits consuming hydrogen', () => {
        const e06: PlacedStructure = {
            instanceId: 'e06',
            definitionId: 'STR-E06',
            hexId: '1,0',
            secondaryHexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 2,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const state = makeMinimalGameState({
            resources: { ...makeMinimalGameState().resources, hydrogen: 30, credits: 100 },
            placedStructures: { e06 },
        });
        const result = processUpdate(state, 1);
        expect(result.resourceDelta.credits).toBeCloseTo(150, 1); // 100 * 1.5 (drone mult) = 150
        expect(result.resourceDelta.hydrogen).toBe(-10);
    });

    it('mainframe URM production increments build progress and produces drone', () => {
        const state = makeMinimalGameState({
            placedStructures: {
                'mainframe-0': {
                    ...makeMinimalGameState().placedStructures['mainframe-0'],
                    urmBuildProgress: 0.0,
                }
            },
            drones: { total: 5, available: 5, assignments: {} }
        });
        
        // 1 hour progress (needs 2 hours total)
        const result1 = processUpdate(state, 1);
        expect(result1.newPlacedStructures['mainframe-0'].urmBuildProgress).toBeCloseTo(0.5, 1);
        expect(result1.newDronesTotal).toBe(5);

        // 2 hour progress (completes production)
        const result2 = processUpdate(state, 2);
        expect(result2.newPlacedStructures['mainframe-0'].urmBuildProgress).toBeUndefined();
        expect(result2.newDronesTotal).toBe(6);
        expect(result2.alerts.some(a => a.includes('Nuovo URM creato'))).toBe(true);
    });

    it('drones consume bandwidth', () => {
        const state = makeMinimalGameState({
            drones: { total: 10, available: 10, assignments: {} },
            resources: { ...makeMinimalGameState().resources, bandwidth: 0 }
        });
        const result = processUpdate(state, 1);
        // 1.75 base - 0.25 mainframe - (10 * 0.2) drone consumption = -0.5 net. Capped at 0.
        // Delta should bring it to 0
        expect(result.resourceDelta.bandwidth).toBe(0);
    });

    it('upgraded mainframe produces bandwidth', () => {
        const state = makeMinimalGameState({
            placedStructures: {
                'mainframe-0': {
                    ...makeMinimalGameState().placedStructures['mainframe-0'],
                    upgradeLevel: 3, // +3.0 bandwidth
                }
            },
            resources: { ...makeMinimalGameState().resources, bandwidth: 0 },
            drones: { total: 0, available: 0, assignments: {} } // 0 drones
        });
        const result = processUpdate(state, 1);
        // 1.75 base - 0.25 mainframe + 3.0 mainframeLevel - 0 drone = +4.5 net.
        expect(result.resourceDelta.bandwidth).toBeCloseTo(4.5, 1);
    });

    it('scales STR-B01 energy yield with URM drone assignments', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const dayState = (assignedDrones: number) =>
            makeMinimalGameState({
                time: {
                    ...makeMinimalGameState().time,
                    phase: 'GIORNO',
                    lastUpdateTime: 5 * 86_400_000, // day 5 (GIORNO)
                    gameStartTime: 0,
                },
                placedStructures: {
                    'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                    b01: { ...b01, assignedDrones },
                },
            });

        const r0 = processUpdate(dayState(0), 1);
        const r1 = processUpdate(dayState(1), 1);
        const r2 = processUpdate(dayState(2), 1);

        // Base output for STR-B01: 20 energy/hour
        // Mainframe energy consumption: -10 energy/hour
        // Drone saturation multipliers: 0 drones -> 1.0; 1 drone -> 1.2; 2 drones -> 1.5
        // Total expected net: r0 = 10, r1 = 14, r2 = 20
        expect(r0.resourceDelta.energy).toBeCloseTo(10, 1);
        expect(r1.resourceDelta.energy).toBeCloseTo(14, 1);
        expect(r2.resourceDelta.energy).toBeCloseTo(20, 1);
    });

    it('scales STR-B01 energy yield during PREALBA based on base lux level', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        const preDawnState = (assignedDrones: number) =>
            makeMinimalGameState({
                time: {
                    ...makeMinimalGameState().time,
                    phase: 'PREALBA',
                    lastUpdateTime: 27 * 86_400_000, // day 27 (PREALBA, 50% lux)
                    gameStartTime: 0,
                },
                placedStructures: {
                    'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                    b01: { ...b01, assignedDrones },
                },
            });

        const r0 = processUpdate(preDawnState(0), 1);
        const r2 = processUpdate(preDawnState(2), 1);

        // At day 27, lux is 50%
        // Base output for STR-B01: 20 * 0.5 = 10 energy/hour
        // Mainframe energy consumption: -10 energy/hour
        // 0 drones (mult 1.0) -> Yield 10 - Mainframe 10 = 0 net
        // 2 drones (mult 1.5) -> Yield 15 - Mainframe 10 = 5 net
        expect(r0.resourceDelta.energy).toBeCloseTo(0, 1);
        expect(r2.resourceDelta.energy).toBeCloseTo(5, 1);
    });

    it('does not produce resources or consume energy for a structure under construction that does not complete', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: true,
            buildProgress: 0.0,
            buildStartTime: 0,
        };
        const state = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'GIORNO',
                lastUpdateTime: 5 * 86_400_000,
                gameStartTime: 0,
            },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                b01,
            },
        });

        // Simula 0.5 ore. STR-B01 richiede 2 ore per essere costruita, quindi non si completa.
        const result = processUpdate(state, 0.5);

        // La produzione del pannello solare (normalmente +20 energy/h, netta +10/h con mainframe)
        // non dovrebbe avvenire, quindi il delta energetico del mainframe è solo -10 energy * 0.5 = -5
        expect(result.resourceDelta.energy).toBeCloseTo(-5, 1);
        expect(result.newPlacedStructures.b01.building).toBe(true);
        expect(result.newPlacedStructures.b01.buildProgress).toBeCloseTo(0.25, 2);
    });

    it('only produces resources for the fraction of the tick after a structure completes construction', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            powerLevel: 100,
            building: true,
            buildProgress: 0.5, // 50% completato. Su 2 ore, serve 1 ora per finire.
            buildStartTime: 0,
        };
        const state = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'GIORNO',
                lastUpdateTime: 5 * 86_400_000,
                gameStartTime: 0,
            },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                b01,
            },
        });

        // Simula 1.5 ore. La costruzione finisce dopo 1 ora.
        // Sarà attiva/operativa per le rimanenti 0.5 ore.
        // Consumo mainframe: -10 energy/h * 1.5h = -15 energy.
        // Produzione solare: +20 energy/h * 0.5h = +10 energy.
        // Delta netto previsto: -15 + 10 = -5 energy.
        const result = processUpdate(state, 1.5);

        expect(result.resourceDelta.energy).toBeCloseTo(-5, 1);
        expect(result.newPlacedStructures.b01.building).toBe(false);
        expect(result.newPlacedStructures.b01.buildProgress).toBe(1.0);
        expect(result.alerts.some(a => a.includes('completato'))).toBe(true);
    });
});

describe('getStructureActualRates', () => {
    it('returns empty rates if the structure is building or has 0 health', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 1,
            powerLevel: 100,
            building: true,
            buildProgress: 0.5,
            buildStartTime: 0,
        };
        const state = makeMinimalGameState();
        
        // Building structure should return no rates
        expect(getStructureActualRates(b01, state)).toEqual({});

        // 0 health structure should return no rates
        const deadB01 = { ...b01, building: false, health: 0 };
        expect(getStructureActualRates(deadB01, state)).toEqual({});
    });

    it('calculates solar panel STR-B01 actual rates under daytime and nighttime conditions', () => {
        const b01: PlacedStructure = {
            instanceId: 'b01',
            definitionId: 'STR-B01',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 2, // optimal is 2
            powerLevel: 100,
            building: false,
            buildProgress: 1.0,
            buildStartTime: 0,
        };

        const dayState = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'GIORNO',
                lastUpdateTime: 5 * 86_400_000,
                gameStartTime: 0,
            }
        });

        const nightState = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'NOTTE',
                lastUpdateTime: 14 * 86_400_000,
                gameStartTime: 0,
            }
        });

        const preDawnState = makeMinimalGameState({
            time: {
                ...makeMinimalGameState().time,
                phase: 'PREALBA',
                lastUpdateTime: 27 * 86_400_000, // day 27 (lux is 50%)
                gameStartTime: 0,
            }
        });

        const dayRates = getStructureActualRates(b01, dayState);
        const nightRates = getStructureActualRates(b01, nightState);
        const preDawnRates = getStructureActualRates(b01, preDawnState);

        // Day output: base 20 * solar 1.0 * droneMult 1.5 * power 1.0 = 30.0
        expect(dayRates.energy).toBeCloseTo(30.0, 1);
        
        // Night output: solar panel is inactive during night
        expect(nightRates.energy).toBeUndefined();

        // Pre-dawn output: base 20 * solar 0.5 * droneMult 1.5 * power 1.0 = 15.0
        expect(preDawnRates.energy).toBeCloseTo(15.0, 1);
    });

    it('handles ice extractor STR-C03 terrain and phase multipliers', () => {
        const c03: PlacedStructure = {
            instanceId: 'c03',
            definitionId: 'STR-C03',
            hexId: '1,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 3, // optimal is 3
            powerLevel: 100,
            building: false,
            buildProgress: 1.0,
            buildStartTime: 0,
        };

        const makeState = (phase: string, terrain: string, hasIce: boolean) => {
            const cell = makeHex('1,0', {
                terrain: terrain as any,
                is_accessible: true,
                building_id: 'c03',
                has_ice_deposit: hasIce,
                iceHoursRemaining: 100,
            });
            return makeMinimalGameState({
                time: {
                    ...makeMinimalGameState().time,
                    phase: phase as any,
                },
                grid: [cell],
            });
        };

        // Case 1: No ice deposit -> should produce nothing
        const noIceState = makeState('GIORNO', 'PIANO', false);
        expect(getStructureActualRates(c03, noIceState).ice).toBeUndefined();

        // Case 2: GIORNO, PIANO, has ice -> base 8 * droneMult 1.5 * power 1.0 * daytime penalty 0.7 = 8.4
        const dayPianoState = makeState('GIORNO', 'PIANO', true);
        expect(getStructureActualRates(c03, dayPianoState).ice).toBeCloseTo(8.4, 1);

        // Case 3: GIORNO, OMBRA_PERMANENTE, has ice -> base 8 * droneMult 1.5 * power 1.0 * permanent shadow bonus 1.5 = 18.0
        const dayShadowState = makeState('GIORNO', 'OMBRA_PERMANENTE', true);
        expect(getStructureActualRates(c03, dayShadowState).ice).toBeCloseTo(18.0, 1);

        // Case 4: NOTTE, PIANO, has ice -> base 8 * droneMult 1.5 = 12.0
        const nightPianoState = makeState('NOTTE', 'PIANO', true);
        expect(getStructureActualRates(c03, nightPianoState).ice).toBeCloseTo(12.0, 1);
    });
});

