import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import type { ResearchId } from '../data/research';

describe('buildStructure gridSize 2', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
    });

    it('occupies primary and secondary hex on STR-D02', () => {
        const store = useGameStore.getState();
        store.resetGame();
        useGameStore.setState(s => ({
            resources: {
                ...s.resources,
                credits: 10_000,
                metals: 10_000,
                cement: 100,
            },
            research: {
                completed: ['autonomous_lab'] as ResearchId[],
                active: null,
                progressHours: 0,
            },
            placedStructures: {
                ...s.placedStructures,
                'd01-1': {
                    instanceId: 'd01-1',
                    definitionId: 'STR-D01',
                    hexId: '1,0',
                    health: 100,
                    damaged: false,
                    inStandby: false,
                    assignedDrones: 0,
                    powerLevel: 100,
                    building: false,
                    buildProgress: 1,
                    buildStartTime: 0,
                },
            },
            grid: s.grid.map(c =>
                c.id === '1,0' ? { ...c, building_id: 'STR-D01' } : c,
            ),
        }));

        const r = useGameStore.getState().buildStructure('2,0', 'STR-D02');
        expect(r.success).toBe(true);

        const after = useGameStore.getState();
        const placed = Object.values(after.placedStructures).find(ps => ps.definitionId === 'STR-D02');
        expect(placed?.hexId).toBe('2,0');
        expect(placed?.secondaryHexId).toBeTruthy();
        expect(after.grid.find(c => c.id === '2,0')?.building_id).toBe('STR-D02');
        expect(after.grid.find(c => c.id === placed!.secondaryHexId!)?.building_id).toBe('STR-D02');
    });

    it('STR-B03 allows secondary hex outside signal', () => {
        useGameStore.setState(s => ({
            resources: {
                ...s.resources,
                credits: 10_000,
                metals: 10_000,
            },
            research: {
                completed: ['nuclear_reactor'] as ResearchId[],
                active: null,
                progressHours: 0,
            },
        }));

        const grid = useGameStore.getState().grid;
        const primary = grid.find(c => c.is_accessible && !c.building_id && c.id !== '0,0');
        expect(primary).toBeDefined();

        const { q, r } = (() => {
            const [qi, ri] = primary!.id.split(',').map(Number);
            return { q: qi, r: ri };
        })();
        const outsideNeighbor = `${q + 1},${r}`;
        useGameStore.setState(s => ({
            grid: s.grid.map(c =>
                c.id === outsideNeighbor
                    ? { ...c, is_accessible: false, signal_strength: 0 }
                    : c,
            ),
        }));

        const result = useGameStore.getState().buildStructure(primary!.id, 'STR-B03');
        expect(result.success).toBe(true);
        const b03 = Object.values(useGameStore.getState().placedStructures).find(
            ps => ps.definitionId === 'STR-B03',
        );
        expect(b03?.secondaryHexId).toBe(outsideNeighbor);
    });

    it('rejects build on hex used as secondary by another structure', () => {
        useGameStore.setState(s => ({
            placedStructures: {
                ...s.placedStructures,
                'b03-1': {
                    instanceId: 'b03-1',
                    definitionId: 'STR-B03',
                    hexId: '1,0',
                    secondaryHexId: '0,1',
                    health: 100,
                    damaged: false,
                    inStandby: false,
                    assignedDrones: 0,
                    powerLevel: 100,
                    building: false,
                    buildProgress: 1,
                    buildStartTime: 0,
                },
            },
        }));

        const r = useGameStore.getState().buildStructure('0,1', 'STR-C01');
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/occupat/i);
    });
});

describe('Base Core Actions', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
    });

    it('manages URM production queue', () => {
        // 1. Resources insufficient
        useGameStore.setState(s => ({
            resources: { ...s.resources, regolith: 0, metals: 0, credits: 0 }
        }));
        let res = useGameStore.getState().startUrmProduction();
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Risorse insufficienti/);

        // 2. Resources sufficient
        useGameStore.setState(s => ({
            resources: { ...s.resources, regolith: 100, metals: 100, credits: 200 }
        }));
        res = useGameStore.getState().startUrmProduction();
        expect(res.success).toBe(true);

        // check resources deducted and progress initiated
        let after = useGameStore.getState();
        expect(after.resources.regolith).toBe(50);
        expect(after.resources.metals).toBe(50);
        expect(after.resources.credits).toBe(100);
        expect(after.placedStructures['mainframe-0'].urmBuildProgress).toBe(0);

        // 3. Double start URM production is blocked
        res = useGameStore.getState().startUrmProduction();
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/già in corso/);
    });

    it('upgrades Base Core levels', () => {
        const store = useGameStore.getState();

        // 1. Initial level
        expect(store.placedStructures['mainframe-0'].upgradeLevel).toBe(1);

        // 2. Level 2 upgrade with insufficient resources
        useGameStore.setState(s => ({
            resources: { ...s.resources, regolith: 10, metals: 10, credits: 10 }
        }));
        let res = useGameStore.getState().upgradeBaseCore();
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Risorse insufficienti/);

        // 3. Level 2 upgrade with sufficient resources
        useGameStore.setState(s => ({
            resources: { ...s.resources, regolith: 100, metals: 100, credits: 200 }
        }));
        res = useGameStore.getState().upgradeBaseCore();
        expect(res.success).toBe(true);

        let after = useGameStore.getState();
        expect(after.placedStructures['mainframe-0'].upgradeLevel).toBe(2);
        expect(after.resources.regolith).toBe(20); // 100 - 80
        expect(after.resources.metals).toBe(20);   // 100 - 80
        expect(after.resources.credits).toBe(50);   // 200 - 150

        // 4. Upgrade up to maximum level (5)
        useGameStore.setState(s => ({
            resources: { ...s.resources, regolith: 1000, metals: 1000, credits: 2000 }
        }));
        
        // Upgrade to level 3
        expect(useGameStore.getState().upgradeBaseCore().success).toBe(true);
        // Upgrade to level 4
        expect(useGameStore.getState().upgradeBaseCore().success).toBe(true);
        // Upgrade to level 5
        expect(useGameStore.getState().upgradeBaseCore().success).toBe(true);

        expect(useGameStore.getState().placedStructures['mainframe-0'].upgradeLevel).toBe(5);

        // Upgrade past level 5 should fail
        res = useGameStore.getState().upgradeBaseCore();
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Livello massimo/);
    });
});

describe('Research System', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
        useGameStore.setState({ paused: true });
    });

    it('starts research and deducts resources upfront', () => {
        useGameStore.setState(s => ({
            resources: {
                ...s.resources,
                credits: 200,
                compute: 60,
            }
        }));

        const store = useGameStore.getState();
        expect(store.research.active).toBeNull();

        store.startResearch('fuel_cell');

        const after = useGameStore.getState();
        expect(after.research.active).toBe('fuel_cell');
        expect(after.resources.credits).toBe(50);   // 200 - 150
        expect(after.resources.compute).toBe(10);   // 60 - 50
    });

    it('blocks starting research with insufficient resources', () => {
        useGameStore.setState(s => ({
            resources: {
                ...s.resources,
                credits: 100,
                compute: 60,
            }
        }));

        const store = useGameStore.getState();
        store.startResearch('fuel_cell');

        const after = useGameStore.getState();
        expect(after.research.active).toBeNull();
        expect(after.resources.credits).toBe(100);
        expect(after.resources.compute).toBe(60);
    });

    it('refunds 50% when research is cancelled', () => {
        useGameStore.setState(s => ({
            resources: {
                ...s.resources,
                credits: 200,
                compute: 60,
            }
        }));

        const store = useGameStore.getState();
        store.startResearch('fuel_cell'); // leaves 50 credits, 10 compute

        store.cancelResearch();

        const after = useGameStore.getState();
        expect(after.research.active).toBeNull();
        expect(after.resources.credits).toBe(125);  // 50 + 75 (50% of 150)
        expect(after.resources.compute).toBe(35);   // 10 + 25 (50% of 50)
    });
});
