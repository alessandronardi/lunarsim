import { describe, expect, it } from 'vitest';
import { calculateIAC, processHelium3Export } from './iacCalculator';
import { makeMinimalGameState } from '../test/fixtures';

describe('iacCalculator', () => {
    it('calculateIAC returns value between 0 and 100', () => {
        const iac = calculateIAC(makeMinimalGameState());
        expect(iac).toBeGreaterThanOrEqual(0);
        expect(iac).toBeLessThanOrEqual(100);
    });

    it('processHelium3Export converts at 1:50', () => {
        const { creditsGained, helium3Consumed } = processHelium3Export(10.7);
        expect(creditsGained).toBe(500);
        expect(helium3Consumed).toBe(10);
    });

    it('boosts food proxy component of IAC when STR-E04 Greenhouse is active', () => {
        const baseState = makeMinimalGameState({
            resources: { ...makeMinimalGameState().resources, oxygen: 100, hydrogen: 100 },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0'],
                e04: {
                    instanceId: 'e04',
                    definitionId: 'STR-E04',
                    hexId: '1,0',
                    health: 100,
                    damaged: false,
                    inStandby: false,
                    assignedDrones: 2,
                    powerLevel: 100,
                    building: false,
                    buildProgress: 1,
                    buildStartTime: 0,
                }
            }
        });
        const stateWithoutGreenhouse = makeMinimalGameState({
            resources: { ...makeMinimalGameState().resources, oxygen: 100, hydrogen: 100 },
            placedStructures: {
                'mainframe-0': makeMinimalGameState().placedStructures['mainframe-0']
            }
        });
        const iacWith = calculateIAC(baseState);
        const iacWithout = calculateIAC(stateWithoutGreenhouse);
        expect(iacWith).toBeGreaterThan(iacWithout);
    });
});
