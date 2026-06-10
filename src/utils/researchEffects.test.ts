import { describe, expect, it } from 'vitest';
import {
    BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR,
    getResearchModifiers,
    totalBandwidthProductionPerHour,
} from './researchEffects';

describe('getResearchModifiers', () => {
    it('returns defaults with no completed research', () => {
        const m = getResearchModifiers([]);
        expect(m.b04EnergyMult).toBe(1);
        expect(m.nightDamageMult).toBe(1);
        expect(m.urmHoursPerUnit).toBe(4);
        expect(m.b03FullOutput).toBe(false);
        expect(m.bandwidthBonusPerHour).toBe(0);
        expect(totalBandwidthProductionPerHour([])).toBe(BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR);
    });

    it('applies all MVP research bonuses', () => {
        const m = getResearchModifiers([
            'fuel_cell',
            'dust_heat_resistance',
            'helium3_extraction',
            'advanced_regolith_conversion',
            'autonomous_lab',
            'autonomous_urm_production',
            'heavy_drill',
            'nuclear_reactor',
        ]);
        expect(m.b04EnergyMult).toBe(1.5);
        expect(m.nightDamageMult).toBe(0.5);
        expect(m.c05He3Mult).toBe(1.5);
        expect(m.c06CementMult).toBe(1.5);
        expect(m.computeMult).toBe(1.2);
        expect(m.urmHoursPerUnit).toBe(2);
        expect(m.c02MiningMult).toBe(1.3);
        expect(m.b03FullOutput).toBe(true);
        expect(m.bandwidthBonusPerHour).toBe(0.8);
    });
});
