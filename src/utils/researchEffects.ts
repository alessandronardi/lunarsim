import type { ResearchId } from '../data/research';
import { RESEARCH } from '../data/research';

/** Moltiplicatori e costanti derivati dalle ricerche completate */
export interface ResearchModifiers {
    b04EnergyMult: number;
    nightDamageMult: number;
    c05He3Mult: number;
    c06CementMult: number;
    computeMult: number;
    urmHoursPerUnit: number;
    c02MiningMult: number;
    b03FullOutput: boolean;
    /** Bonus banda/ora da uplink potenziato (heavy_drill) */
    bandwidthBonusPerHour: number;
}

const DEFAULT_MODIFIERS: ResearchModifiers = {
    b04EnergyMult: 1,
    nightDamageMult: 1,
    c05He3Mult: 1,
    c06CementMult: 1,
    computeMult: 1,
    urmHoursPerUnit: 4,
    c02MiningMult: 1,
    b03FullOutput: false,
    bandwidthBonusPerHour: 0,
};

export function getResearchModifiers(completed: ResearchId[]): ResearchModifiers {
    const has = (id: ResearchId) => completed.includes(id);
    return {
        b04EnergyMult: has('fuel_cell') ? 1.5 : DEFAULT_MODIFIERS.b04EnergyMult,
        nightDamageMult: has('dust_heat_resistance') ? 0.5 : DEFAULT_MODIFIERS.nightDamageMult,
        c05He3Mult: has('helium3_extraction') ? 1.5 : DEFAULT_MODIFIERS.c05He3Mult,
        c06CementMult: has('advanced_regolith_conversion') ? 1.5 : DEFAULT_MODIFIERS.c06CementMult,
        computeMult: has('autonomous_lab') ? 1.2 : DEFAULT_MODIFIERS.computeMult,
        urmHoursPerUnit: has('autonomous_urm_production') ? 2 : DEFAULT_MODIFIERS.urmHoursPerUnit,
        c02MiningMult: has('heavy_drill') ? 1.3 : DEFAULT_MODIFIERS.c02MiningMult,
        b03FullOutput: has('nuclear_reactor'),
        bandwidthBonusPerHour: has('heavy_drill') ? HEAVY_DRILL_BANDWIDTH_BONUS_PER_HOUR : 0,
    };
}

/** Uplink SCC costante (Terra → colonia); permette di completare la prima ricerca terrestre */
export const BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR = 1.75;

/** Bonus banda/ora dopo heavy_drill (trivella + canale dati dedicato) */
export const HEAVY_DRILL_BANDWIDTH_BONUS_PER_HOUR = 0.8;

/** Soglia minima per avviare o proseguire una ricerca terrestre */
export const TERRESTRIAL_RESEARCH_BANDWIDTH_PER_HOUR = 1.5;

/** Consumo banda base del Nucleo (uplink SCC) */
export const MAINFRAME_BANDWIDTH_PER_HOUR = 0.25;

export function totalBandwidthProductionPerHour(completed: ResearchId[]): number {
    return BASE_SCC_UPLINK_BANDWIDTH_PER_HOUR + getResearchModifiers(completed).bandwidthBonusPerHour;
}

export function hasTerrestrialResearchBandwidth(resources: { bandwidth: number }): boolean {
    return resources.bandwidth >= TERRESTRIAL_RESEARCH_BANDWIDTH_PER_HOUR;
}

export function isTerrestrialResearch(id: ResearchId): boolean {
    return RESEARCH[id]?.branch === 'TERRESTRIAL';
}
