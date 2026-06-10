import { describe, expect, it } from 'vitest';
import {
    findSecondaryHexId,
    shieldProtectedHexIds,
    isHexOccupied,
    isStructureShieldProtected,
} from './hexUtils';
import { makeHex, makeMinimalGameState } from '../test/fixtures';
import type { PlacedStructure } from '../types/game';

describe('hexUtils', () => {
    it('findSecondaryHexId picks adjacent free hex', () => {
        const state = makeMinimalGameState();
        const secondary = findSecondaryHexId(state.grid, '1,0', state.placedStructures, true);
        expect(secondary).toBe('0,1');
    });

    it('isHexOccupied detects secondary hex', () => {
        const placed: Record<string, PlacedStructure> = {
            x: {
                instanceId: 'x',
                definitionId: 'STR-B03',
                hexId: '1,0',
                secondaryHexId: '0,1',
                health: 100,
                damaged: false,
                inStandby: false,
                assignedDrones: 0,
                building: false,
                buildProgress: 1,
                buildStartTime: 0,
            },
        };
        expect(isHexOccupied('0,1', placed)).toBe(true);
        expect(isHexOccupied('1,0', placed)).toBe(true);
    });

    it('shieldProtectedHexIds covers shield hex and neighbors', () => {
        const placed: Record<string, PlacedStructure> = {
            shield: {
                instanceId: 'shield',
                definitionId: 'STR-E03',
                hexId: '1,0',
                health: 100,
                damaged: false,
                inStandby: false,
                assignedDrones: 0,
                building: false,
                buildProgress: 1,
                buildStartTime: 0,
            },
        };
        const covered = shieldProtectedHexIds(placed);
        expect(covered.has('1,0')).toBe(true);
        expect(covered.has('0,1')).toBe(true);
        expect(covered.has('2,0')).toBe(true);
    });

    it('isStructureShieldProtected when secondary hex is covered', () => {
        const covered = new Set(['2,0']);
        const ps: PlacedStructure = {
            instanceId: 'b03',
            definitionId: 'STR-B03',
            hexId: '3,0',
            secondaryHexId: '2,0',
            health: 100,
            damaged: false,
            inStandby: false,
            assignedDrones: 0,
            building: false,
            buildProgress: 1,
            buildStartTime: 0,
        };
        expect(isStructureShieldProtected(ps, covered)).toBe(true);
        expect(isStructureShieldProtected({ ...ps, hexId: '5,0', secondaryHexId: '6,0' }, covered)).toBe(false);
    });

    it('STR-B03 secondary may be outside signal', () => {
        const grid = [
            makeHex('0,0', { is_accessible: true }),
            makeHex('1,0', { is_accessible: true }),
            makeHex('2,0', { is_accessible: false, signal_strength: 0 }),
        ];
        const secondary = findSecondaryHexId(grid, '1,0', {}, false);
        expect(secondary).toBe('2,0');
    });
});
