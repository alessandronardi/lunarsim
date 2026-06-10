import type { StructureDefinition, GamePhase } from '../types/game';

/** Efficienza solare per fase e giorno nel ciclo (0-27) */
export function solarEfficiency(_phase: GamePhase, dayInCycle: number): number {
    return lunaCycleInfo(dayInCycle).luce;
}

/**
 * Formula bonus URM.
 * 0 URM -> 1.0 (base)
 * 1 URM -> 1.2 (+20%)
 * 2 URM -> 1.5 (+50%)
 * Ogni URM aggiuntivo -> +30%
 */
export function droneSaturation(assigned: number, _optimal: number): number {
    if (assigned === 0) return 1.0;
    if (assigned === 1) return 1.2;
    if (assigned === 2) return 1.5;
    return 1.5 + (assigned - 2) * 0.3;
}

/** Moltiplicatore bonus terreno per strutture estrattive */
export function terrainMultiplier(
    terrain: 'PIANO' | 'CRATERE' | 'RILIEVO' | 'OMBRA_PERMANENTE',
    resource: 'metals' | 'default'
): number {
    if (terrain === 'CRATERE' && resource === 'metals') return 1.5;
    if (terrain === 'OMBRA_PERMANENTE') return 0.7;
    return 1.0;
}

/** Determina la fase lunare dal giorno frazionario nel ciclo (0-27.99) */
export function dayToPhase(dayInCycle: number): GamePhase {
    const d = dayInCycle % 28;
    if (d >= 0 && d < 3) return 'ALBA';
    if (d >= 3 && d < 14) return 'GIORNO';
    if (d >= 14 && d < 17) return 'TRAMONTO';
    if (d >= 17 && d < 26) return 'NOTTE';
    return 'PREALBA'; // 26-27.99
}

/** Temperatura approssimativa in °C per fase (per UI) */
export function phaseTemperature(phase: GamePhase): number {
    switch (phase) {
        case 'ALBA': return -80;
        case 'GIORNO': return 107;
        case 'TRAMONTO': return 20;
        case 'NOTTE': return -173;
        case 'PREALBA': return -173;
    }
}

/**
 * Calcola i dati del ciclo lunare a partire dal giorno frazionario (es. 14.7).
 */
export function lunaCycleInfo(dayInCycle: number): {
    nomeFase: string;
    temperatura: number;
    luce: number;
    statoEnergia: string;
    opacitaNotte: number;
} {
    const day = dayInCycle % 28;
    let nomeFase: string;
    let temperatura: number;
    let luce: number;
    let statoEnergia = 'TRANSIZIONE';

    if (day < 3) {
        nomeFase = 'ALBA';
        temperatura = -173 + (day / 3) * 280;
        luce = day / 3;
    } else if (day < 14) {
        nomeFase = 'GIORNO PIENO';
        temperatura = 107;
        luce = 1;
    } else if (day < 17) {
        nomeFase = 'TRAMONTO';
        const t = (day - 14) / 3;
        temperatura = 107 - t * 280;
        luce = 1 - t;
    } else if (day < 26) {
        nomeFase = 'NOTTE PROFONDA';
        temperatura = -173;
        luce = 0;
    } else {
        nomeFase = 'PRE-ALBA';
        temperatura = -173;
        luce = (day - 26) / 2;
    }

    if (day >= 3 && day <= 14) statoEnergia = '100% OPERATIVO';
    else if (day > 17 && day < 26) statoEnergia = 'OFFLINE';

    let opacitaNotte = 0;
    if (day > 16 && day < 18) opacitaNotte = (day - 16) / 2;
    else if (day >= 18 && day <= 27) opacitaNotte = 1;
    else if (day > 27) opacitaNotte = 1 - (day - 27);

    return { nomeFase, temperatura, luce, statoEnergia, opacitaNotte };
}

/** Verifica se una struttura è attiva nella fase corrente */
export function isActiveInPhase(def: StructureDefinition, phase: GamePhase): boolean {
    return def.activePhases.includes(phase);
}

/**
 * Calcola giorno frazionario nel ciclo dal timestamp di gioco.
 * gameStartTime e now sono epoch ms.
 */
export function getGameDayInCycle(gameStartTime: number, now: number): number {
    const elapsedMs = now - gameStartTime;
    const totalDays = elapsedMs / 86_400_000;
    return totalDays % 28;
}

/**
 * Calcola il ciclo corrente (numero intero).
 */
export function getGameCycle(gameStartTime: number, now: number): number {
    const elapsedMs = now - gameStartTime;
    const totalDays = elapsedMs / 86_400_000;
    return Math.floor(totalDays / 28);
}
