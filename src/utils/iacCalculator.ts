import type { GameState } from '../types/game';

/**
 * Calcola l'IAC (Indice di Autosufficienza Coloniale) da 0 a 100.
 * Media pesata di 6 componenti.
 */
export function calculateIAC(state: GameState): number {
    const r = state.resources;
    const ps = state.placedStructures;

    // ── 1. Autonomia Energetica (25%) ─────────────────────────────────────────
    const energyCap = state.resourceCaps.energy ?? 2000;
    const energyScore = Math.min(1, r.energy / (energyCap * 0.5));

    // ── 2. Autosufficienza Idrica (15%) ──────────────────────────────────────
    const hasIceExtractor = Object.values(ps).some(
        s => s.definitionId === 'STR-C03' && !s.inStandby && !s.building && s.health > 0
    );
    const iceCap = state.resourceCaps.ice ?? 200;
    const waterScore = hasIceExtractor
        ? Math.min(1, r.ice / (iceCap * 0.3) + 0.3)
        : Math.min(0.5, r.ice / iceCap);

    // ── 3. Produzione Alimentare — proxy ossigeno/idrogeno (15%) ──────────────
    const hasElectrolyzer = Object.values(ps).some(
        s => s.definitionId === 'STR-C04' && !s.inStandby && !s.building && s.health > 0
    );
    const hasGreenhouse = Object.values(ps).some(
        s => s.definitionId === 'STR-E04' && !s.inStandby && !s.building && s.health > 0
    );
    const oxygenCap = state.resourceCaps.oxygen ?? 500;
    const hydrogenCap = state.resourceCaps.hydrogen ?? 500;
    let foodProxy = hasElectrolyzer
        ? Math.min(1, (r.oxygen / oxygenCap + r.hydrogen / hydrogenCap) / 2 + 0.3)
        : Math.min(0.2, (r.oxygen + r.hydrogen) / (oxygenCap + hydrogenCap));

    if (hasGreenhouse) {
        foodProxy = Math.min(1, foodProxy + 0.3);
    }

    // ── 4. Capacità Mineraria (20%) ────────────────────────────────────────────
    const miningTarget = 300;
    const miningScore = Math.min(1, (r.regolith + r.metals) / miningTarget);

    // ── 5. Ricerca Autonoma (15%) ─────────────────────────────────────────────
    const computeCap = state.resourceCaps.compute ?? 999;
    const computeScore = Math.min(1, r.compute / (computeCap * 0.2));

    // ── 6. Export Strategico — Elio-3 (10%) ──────────────────────────────────
    const exportTarget = 20;
    const exportScore = Math.min(1, state.helium3ExportedThisCycle / exportTarget);

    // ── Media pesata ──────────────────────────────────────────────────────────
    const iac =
        energyScore * 25 +
        waterScore * 15 +
        foodProxy * 15 +
        miningScore * 20 +
        computeScore * 15 +
        exportScore * 10;

    return Math.max(0, Math.min(100, iac));
}

/**
 * Calcola il bilancio He-3 a fine ciclo: converte in crediti al tasso 1:50.
 */
export function processHelium3Export(helium3Amount: number): {
    creditsGained: number;
    helium3Consumed: number;
} {
    const creditsGained = Math.floor(helium3Amount) * 50;
    const helium3Consumed = Math.floor(helium3Amount);
    return { creditsGained, helium3Consumed };
}
