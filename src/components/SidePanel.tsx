import { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Resources } from '../types/game';
import { droneSaturation } from '../utils/gameFormulas';
import { findSecondaryHexId } from '../utils/hexUtils';
import { STRUCTURES, PROGRESSION_ORDER } from '../data/structures';
import { AlertTriangle, Wrench, ShieldAlert } from 'lucide-react';
import { structureColor } from './HexCellShape';
import { StructureDetailModal } from './StructureDetailModal';
import { getStructureActualRates } from '../utils/gameEngine';


interface SidePanelProps {
    hexId: string | null;
    onClose: () => void;
}

export function SidePanel({ hexId, onClose }: SidePanelProps) {
    const grid = useGameStore(s => s.grid);
    const state = useGameStore(s => s);
    const placed = useGameStore(s => s.placedStructures);
    const resources = useGameStore(s => s.resources);
    const drones = useGameStore(s => s.drones);
    const research = useGameStore(s => s.research ?? { completed: [], active: null, progressHours: 0 });
    const phase = useGameStore(s => s.time.phase);
    const buildStr = useGameStore(s => s.buildStructure);
    const setDroneAss = useGameStore(s => s.setDroneAssignment);
    const repairStr = useGameStore(s => s.repairStructure);
    const demolishStr = useGameStore(s => s.demolishStructure);
    const startUrmProd = useGameStore(s => s.startUrmProduction);
    const upgradeBaseCore = useGameStore(s => s.upgradeBaseCore);

    const [buildError, setBuildError] = useState<string | null>(null);
    const [buildOk, setBuildOk] = useState(false);
    const [confirmDemolish, setConfirmDemolish] = useState(false);
    const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);


    const cell = hexId ? grid.find(c => c.id === hexId) : null;

    // Struttura su questo hex (se esiste)
    const psHere = hexId
        ? Object.values(placed).find(ps => ps.hexId === hexId || ps.secondaryHexId === hexId)
        : undefined;
    const defHere = psHere ? STRUCTURES[psHere.definitionId] : null;

    // Progresso costruzione
    const buildInfo = useMemo(() => {
        if (!psHere || !psHere.building) return null;
        const def = STRUCTURES[psHere.definitionId];
        if (!def) return null;

        const elapsed = (Date.now() - psHere.buildStartTime) / 3_600_000;
        const droneSpeedup = 1 + Math.min(psHere.assignedDrones * 0.2, 0.6);
        const progress = Math.min(1, (elapsed / def.buildTimeHours) * droneSpeedup);

        const remainingHours = Math.max(0, (def.buildTimeHours / droneSpeedup) - elapsed);
        const remaining = remainingHours >= 1
            ? `${Math.floor(remainingHours)}h ${Math.floor((remainingHours % 1) * 60)}m`
            : `${Math.ceil(remainingHours * 60)}m`;

        return { progress, remaining };
    }, [psHere]);

    // Lista strutture costruibili qui
    const buildable = useMemo(() => {
        if (!cell || !cell.is_accessible || cell.building_id) return [];
        const completedResearch = research.completed;
        const placedIds = Object.values(placed).map(ps => ps.definitionId);

        return PROGRESSION_ORDER.filter(id => {
            const def = STRUCTURES[id];
            if (!def || def.buildCost === undefined) return false;
            // Prerequisiti
            for (const pre of def.prerequisites) {
                if (pre.startsWith('research:')) {
                    if (!completedResearch.includes(pre.replace('research:', '') as never)) return false;
                } else {
                    if (!placedIds.includes(pre)) return false;
                }
            }
            if ((id as string) === 'STR-A01') return false;
            if (def.gridSize >= 2 && hexId) {
                const needAccessibleSecondary = id !== 'STR-B03';
                if (!findSecondaryHexId(grid, hexId, placed, needAccessibleSecondary)) return false;
            }
            return true;
        });
    }, [cell, placed, research.completed, grid, hexId]);

    // Affordabilità riparazione
    const canAffordRepair = useMemo(() => {
        return (resources.metals ?? 0) >= 5 && (resources.regolith ?? 0) >= 5;
    }, [resources]);

    // Refund demolizione
    const refundInfo = useMemo(() => {
        if (!psHere) return [];
        const def = STRUCTURES[psHere.definitionId];
        if (!def) return [];
        return Object.entries(def.buildCost).map(([k, v]) => ({
            resource: k,
            amount: Math.floor((v ?? 0) * 0.3)
        })).filter(r => r.amount > 0);
    }, [psHere]);

    // Affordabilità costruzione
    const canAfford = useCallback((id: string) => {
        const def = STRUCTURES[id];
        if (!def) return false;
        return Object.entries(def.buildCost).every(
            ([k, v]) => (resources[k as keyof Resources] ?? 0) >= (v ?? 0)
        );
    }, [resources]);

    const handleBuild = (id: string) => {
        if (!hexId) return;
        setBuildError(null);
        setBuildOk(false);
        const r = buildStr(hexId, id);
        if (r.success) {
            setBuildOk(true);
            setTimeout(() => setBuildOk(false), 2000);
        } else {
            setBuildError(r.error ?? 'Errore sconosciuto');
        }
    };

    const handleRepair = () => {
        if (!psHere) return;
        const res = repairStr(psHere.instanceId);
        if (!res.success) {
            setBuildError(res.error ?? 'Errore di riparazione');
        } else {
            setBuildError(null);
        }
    };

    const handleStartUrmProd = () => {
        setBuildError(null);
        const r = startUrmProd();
        if (!r.success) {
            setBuildError(r.error ?? 'Errore di produzione URM');
        }
    };

    const handleUpgradeBaseCore = () => {
        setBuildError(null);
        const r = upgradeBaseCore();
        if (!r.success) {
            setBuildError(r.error ?? 'Errore di potenziamento');
        }
    };

    const handleDemolish = () => {
        if (!psHere) return;
        const res = demolishStr(psHere.instanceId);
        if (!res.success) {
            setBuildError(res.error ?? 'Errore di demolizione');
        } else {
            setBuildError(null);
            setConfirmDemolish(false);
            onClose();
        }
    };

    const isNight = phase === 'NOTTE' || phase === 'PREALBA';

    // Costi upgrade Nucleo Base
    const upgradeCosts: Record<number, { regolith: number; metals: number; credits: number }> = {
        2: { regolith: 80, metals: 80, credits: 150 },
        3: { regolith: 150, metals: 180, credits: 300 },
        4: { regolith: 250, metals: 300, credits: 500 },
        5: { regolith: 400, metals: 500, credits: 800 },
    };

    const currentLevel = psHere?.upgradeLevel ?? 1;
    const nextLevel = currentLevel + 1;
    const upgradeCost = upgradeCosts[nextLevel];
    const canAffordUpgrade = upgradeCost &&
        (resources.regolith ?? 0) >= upgradeCost.regolith &&
        (resources.metals ?? 0) >= upgradeCost.metals &&
        (resources.credits ?? 0) >= upgradeCost.credits;

    const canAffordUrm =
        (resources.regolith ?? 0) >= 50 &&
        (resources.metals ?? 0) >= 50 &&
        (resources.credits ?? 0) >= 100;

    const urmProgressInfo = useMemo(() => {
        if (!psHere || psHere.urmBuildProgress === undefined) return null;
        const progress = psHere.urmBuildProgress;
        const remainingHours = Math.max(0, 2.0 * (1 - progress));
        const remaining = remainingHours >= 1
            ? `${Math.floor(remainingHours)}h ${Math.floor((remainingHours % 1) * 60)}m`
            : `${Math.ceil(remainingHours * 60)}m`;
        return { progress, remaining };
    }, [psHere?.urmBuildProgress]);

    if (!hexId || !cell) {
        return (
            <div className="w-72 flex-shrink-0 flex items-center justify-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-mono text-[10px] text-gray-700 text-center px-4">
                    Seleziona un hex<br />sulla mappa per i dettagli
                </p>
            </div>
        );
    }

    return (
        <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                    <p className="font-mono text-[8px] text-gray-600 uppercase tracking-widest">Hex Selezionato</p>
                    <p className="font-mono text-sm font-bold text-cyan-300">{hexId}</p>
                </div>
                <button onClick={onClose}
                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors">
                    ✕
                </button>
            </div>

            {/* Terreno e segnale */}
            <div className="px-4 py-3 flex flex-col gap-1.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-gray-600">Terreno</span>
                    <span className="font-mono text-[9px] text-gray-300">{cell.terrain}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-gray-600">Segnale</span>
                    <span className={`font-mono text-[9px] font-bold ${cell.is_accessible ? 'text-emerald-400' : 'text-red-500'}`}>
                        {cell.is_accessible ? '● ATTIVO' : '○ ASSENTE'}
                    </span>
                </div>
                {cell.has_ice_deposit && (
                    <div className="flex justify-between">
                        <span className="font-mono text-[9px] text-gray-600">Giacimento ghiaccio</span>
                        <span className="font-mono text-[9px] text-blue-300">
                            {cell.iceHoursRemaining.toFixed(0)} ore rimaste
                        </span>
                    </div>
                )}
            </div>

            {/* Struttura esistente */}
            {psHere && defHere && (
                <div className="px-4 py-3 flex flex-col gap-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-gray-600">Struttura</p>
                    <div className="rounded-lg p-3 flex flex-col gap-2"
                        style={{
                            background: `${structureColor(psHere.definitionId)}11`,
                            border: `1px solid ${structureColor(psHere.definitionId)}33`,
                        }}>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold" style={{ color: structureColor(psHere.definitionId) }}>
                                {psHere.definitionId}
                            </span>
                            <span className="font-mono text-[9px] text-gray-400">{defHere.name}</span>
                        </div>

                        {/* Costruzione in corso */}
                        {psHere.building && buildInfo && (
                            <div className="flex flex-col gap-2 rounded p-2.5 my-1"
                                style={{ background: 'rgba(240,160,64,0.06)', border: '1px solid rgba(240,160,64,0.2)' }}>
                                <span className="font-mono text-[8px] text-amber-400 uppercase tracking-widest font-bold">
                                    🔨 In Costruzione
                                </span>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                        style={{ width: `${buildInfo.progress * 100}%` }} />
                                </div>
                                <div className="flex justify-between font-mono text-[8px]">
                                    <span className="text-gray-500">{Math.floor(buildInfo.progress * 100)}% completato</span>
                                    <span className="text-amber-300">⏱ {buildInfo.remaining}</span>
                                </div>
                            </div>
                        )}

                        {/* Health bar (solo se non in costruzione) */}
                        {!psHere.building && (
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="font-mono text-[8px] text-gray-600">Integrità</span>
                                    <span className={`font-mono text-[8px] font-bold ${psHere.health >= 70 ? 'text-emerald-400' : psHere.health >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {psHere.health.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${psHere.health}%`,
                                            background: psHere.health >= 70 ? '#22dd77' : psHere.health >= 40 ? '#eebb00' : '#ee4444',
                                        }} />
                                </div>
                            </div>
                        )}

                        {/* Alert notte */}
                        {isNight && !psHere.building && psHere.health < 60 && (
                            <div className="flex items-center gap-1.5 rounded px-2 py-1"
                                style={{ background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)' }}>
                                <AlertTriangle size={10} className="text-red-400 flex-shrink-0" />
                                <span className="font-mono text-[8px] text-red-300">Struttura vulnerabile in NOTTE</span>
                            </div>
                        )}

                        {/* Badge stato */}
                        <div className="flex gap-1.5 flex-wrap">
                            {psHere.building && (
                                <span className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/40">IN COSTR.</span>
                            )}
                            {psHere.inStandby && !psHere.building && (
                                <span className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">STANDBY</span>
                            )}
                            {psHere.damaged && !psHere.building && (
                                <span className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-700/40">DANNEG.</span>
                            )}
                        </div>

                        {/* Droni assegnati */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="font-mono text-[8px] text-gray-600">
                                    {psHere.building ? 'URM per velocizzare' : 'URM assegnati'}
                                </span>
                                <span className="font-mono text-[8px] text-gray-300">
                                    {psHere.assignedDrones}/{defHere.optimalDrones} ottimale
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={psHere.assignedDrones === 0}
                                    onClick={() => setDroneAss(psHere.instanceId, Math.max(0, psHere.assignedDrones - 1))}
                                    className="w-6 h-6 rounded font-mono text-xs text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors flex items-center justify-center"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                    −
                                </button>
                                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${defHere.optimalDrones > 0 ? (psHere.assignedDrones / defHere.optimalDrones) * 100 : 0}%`,
                                            background: 'linear-gradient(90deg,#60c0ff,#a070ff)',
                                        }} />
                                </div>
                                <button
                                    disabled={drones.available === 0 || psHere.assignedDrones >= defHere.optimalDrones * 2}
                                    onClick={() => setDroneAss(psHere.instanceId, psHere.assignedDrones + 1)}
                                    className="w-6 h-6 rounded font-mono text-xs text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors flex items-center justify-center"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                    +
                                </button>
                                <span className="font-mono text-[8px] text-gray-600 ml-1">{psHere.assignedDrones}</span>
                            </div>
                        </div>

                        {/* Flussi di risorse (solo se non in costruzione) */}
                        {!psHere.building && (defHere.energyCostPerHour > 0 || Object.keys(defHere.productionPerHour).length > 0) && (
                            <div className="flex flex-col gap-2 mt-1">
                                {defHere.energyCostPerHour > 0 && (() => {
                                    const pwr = (psHere.powerLevel ?? 100) / 100;
                                    const nominalVal = defHere.energyCostPerHour * pwr;
                                    const actualRates = getStructureActualRates(psHere, state);
                                    const actualVal = actualRates.energy ?? 0;
                                    const actualConsumption = actualVal < 0 ? Math.abs(actualVal) : 0;
                                    const hasDiff = Math.abs(actualConsumption - nominalVal) > 0.01;
                                    return (
                                        <div>
                                            <p className="font-mono text-[8px] text-gray-600 mb-0.5">Consumo energetico/ora</p>
                                            <span className="font-mono text-[8px] text-yellow-500">
                                                -{nominalVal.toFixed(1)} energy
                                                {hasDiff && (
                                                    <span className="text-gray-500 font-medium ml-1">
                                                        (reale: -{actualConsumption.toFixed(1)})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })()}

                                {Object.keys(defHere.productionPerHour).length > 0 && (
                                    <div>
                                        <p className="font-mono text-[8px] text-gray-600 mb-0.5">Produzione/ora</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(defHere.productionPerHour).map(([k, v]) => {
                                                const pwr = (psHere.powerLevel ?? 100) / 100;
                                                let rate = v * pwr;
                                                if (psHere.definitionId === 'STR-B03') {
                                                    const hasFullOutput = research.completed.includes('nuclear_reactor' as never);
                                                    rate = hasFullOutput ? v * pwr : (psHere.assignedDrones < 2 ? v * 0.6 * pwr : v * pwr);
                                                } else {
                                                    const droneMultiplier = defHere.optimalDrones === 0 ? 1 : droneSaturation(psHere.assignedDrones, defHere.optimalDrones);
                                                    rate = v * pwr * droneMultiplier;
                                                }
                                                const actualRates = getStructureActualRates(psHere, state);
                                                const actualRate = actualRates[k as keyof Resources] ?? 0;
                                                const hasDiff = Math.abs(actualRate - rate) > 0.01;
                                                return (
                                                    <span key={k} className="font-mono text-[8px] text-emerald-400">
                                                        +{rate.toFixed(1)} {k}
                                                        {hasDiff && (
                                                            <span className="text-gray-500 font-medium ml-1">
                                                                (reale: +{actualRate.toFixed(1)})
                                                            </span>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* Modifiche speciali Nucleo Base (STR-A01): Produzione URM e Upgrade Banda */}
                        {psHere.definitionId === 'STR-A01' && (
                            <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-2">
                                {/* Sezione Livello e Upgrade Banda */}
                                <div className="flex flex-col gap-1.5 p-2.5 rounded bg-blue-950/20 border border-blue-900/20">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-[8px] text-cyan-400 font-bold uppercase tracking-widest">
                                            ⚙️ NUCLEO BASE: LIV. {currentLevel}
                                        </span>
                                        <span className="font-mono text-[9px] text-gray-300">
                                            Banda: +{(currentLevel === 1 ? 0 : 1.5 * (currentLevel - 1)).toFixed(1)}/h
                                        </span>
                                    </div>
                                    
                                    {currentLevel < 5 && upgradeCost ? (
                                        <div className="flex flex-col gap-1.5 mt-1">
                                            <p className="font-mono text-[8px] text-gray-500">
                                                Prossimo livello (Liv. {nextLevel}): +{(1.5 * (nextLevel - 1)).toFixed(1)} Banda/h
                                            </p>
                                            <div className="flex justify-between font-mono text-[7px] text-gray-400">
                                                <span>Metalli: {upgradeCost.metals} | Regolite: {upgradeCost.regolith} | Crediti: {upgradeCost.credits}</span>
                                            </div>
                                            <button
                                                onClick={handleUpgradeBaseCore}
                                                disabled={!canAffordUpgrade}
                                                className="py-1 rounded font-mono text-[9px] font-bold text-center transition-all bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-300 disabled:opacity-30 disabled:hover:bg-cyan-500/10 disabled:hover:border-cyan-500/30"
                                            >
                                                Migliora Livello
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="font-mono text-[8px] text-emerald-400 text-center mt-1">
                                            ✓ Livello massimo raggiunto
                                        </p>
                                    )}
                                </div>

                                {/* Sezione Produzione URM */}
                                <div className="flex flex-col gap-1.5 p-2.5 rounded bg-emerald-950/10 border border-emerald-900/20">
                                    <span className="font-mono text-[8px] text-emerald-400 font-bold uppercase tracking-widest">
                                        🤖 MONTAGGIO URM
                                    </span>
                                    
                                    {urmProgressInfo ? (
                                        <div className="flex flex-col gap-1 rounded p-1.5 bg-emerald-950/20 border border-emerald-800/30">
                                            <span className="font-mono text-[8px] text-emerald-400 font-bold">
                                                Assemblaggio URM...
                                            </span>
                                            <div className="h-1 rounded-full overflow-hidden bg-white/5">
                                                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${urmProgressInfo.progress * 100}%` }} />
                                            </div>
                                            <div className="flex justify-between font-mono text-[7px]">
                                                <span className="text-gray-500">{Math.floor(urmProgressInfo.progress * 100)}% completato</span>
                                                <span className="text-emerald-300">⏱ {urmProgressInfo.remaining}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1 mt-1">
                                            <p className="font-mono text-[8px] text-gray-500">
                                                Costo: 50 Regolite | 50 Metalli | 100 Crediti
                                            </p>
                                            <p className="font-mono text-[7px] text-gray-600 leading-snug">
                                                Ogni URM attivo nel SCC consuma 0.2 Banda/h per mantenere il collegamento satellitare costante.
                                            </p>
                                            <button
                                                onClick={handleStartUrmProd}
                                                disabled={!canAffordUrm}
                                                className="py-1 rounded font-mono text-[9px] font-bold text-center transition-all bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/20 text-emerald-300 disabled:opacity-30 disabled:hover:bg-emerald-500/10 disabled:hover:border-emerald-500/30"
                                            >
                                                Costruisci URM
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Azioni Struttura: Ripara e Demolisci */}
                        <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                            {/* Bottone Ripara */}
                            {!psHere.building && psHere.health < 100 && (
                                <button
                                    onClick={handleRepair}
                                    disabled={!canAffordRepair}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded font-mono text-[9px] font-bold transition-all"
                                    style={{
                                        background: canAffordRepair ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        border: canAffordRepair ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                                        color: canAffordRepair ? '#60c0ff' : '#666'
                                    }}
                                    title="Ripara +20 HP. Costo: 5 Metalli, 5 Regolite"
                                >
                                    🔧 Ripara
                                </button>
                            )}

                            {/* Bottone Demolisci */}
                            {psHere.definitionId !== 'STR-A01' && (
                                <button
                                    onClick={() => setConfirmDemolish(true)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded font-mono text-[9px] font-bold bg-red-950/20 border border-red-900/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 transition-all"
                                >
                                    🗑 Smantella
                                </button>
                            )}
                        </div>

                        {/* Box costi riparazione */}
                        {!psHere.building && psHere.health < 100 && (
                            <div className="flex justify-between font-mono text-[7px] text-gray-500 mt-0.5">
                                <span>Costo ripara: 5 metals, 5 regolith</span>
                                <span className={canAffordRepair ? 'text-emerald-500' : 'text-red-500'}>
                                    {canAffordRepair ? 'Disponibile' : 'Risorse insuff.'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Dialog Conferma Demolizione */}
                    {confirmDemolish && (
                        <div className="rounded-lg p-3 flex flex-col gap-2 mt-2 bg-red-950/40 border border-red-500/30 animate-flicker">
                            <div className="flex gap-1.5 items-center">
                                <ShieldAlert size={12} className="text-red-400" />
                                <span className="font-mono text-[9px] text-red-200 font-bold uppercase">Conferma Smantellamento</span>
                            </div>
                            <p className="font-mono text-[8px] text-gray-400 leading-snug">
                                Sei sicuro di voler smantellare questa struttura? L'operazione è istantanea.
                            </p>
                            {refundInfo.length > 0 && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-[7px] text-gray-500">Rimborso materiali (30%):</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {refundInfo.map(r => (
                                            <span key={r.resource} className="font-mono text-[8px] text-emerald-400">
                                                +{r.amount} {r.resource}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={handleDemolish}
                                    className="flex-1 py-1 rounded bg-red-500 hover:bg-red-600 font-mono text-[9px] font-bold text-white transition-colors"
                                >
                                    Sì, Smantella
                                </button>
                                <button
                                    onClick={() => setConfirmDemolish(false)}
                                    className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 font-mono text-[9px] font-bold text-gray-300 transition-colors"
                                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Costruzione */}
            {!psHere && cell.is_accessible && (
                <div className="px-4 py-3 flex flex-col gap-2 flex-1">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                        <Wrench size={9} />
                        Costruisci
                    </p>

                    {buildable.length === 0 && (
                        <p className="font-mono text-[9px] text-gray-700 text-center py-4">
                            Nessuna struttura disponibile
                        </p>
                    )}

                    {buildable.map(id => {
                        const def = STRUCTURES[id];
                        const affordable = canAfford(id);
                        const color = structureColor(id);

                        return (
                            <div key={id}
                                onClick={() => setSelectedStructureId(id)}
                                className="rounded-lg p-3 flex flex-col gap-2 transition-all cursor-pointer hover:scale-[1.01] hover:bg-white/[0.04] active:scale-[0.99]"
                                style={{
                                    background: affordable ? `${color}0d` : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${affordable ? `${color}33` : 'rgba(255,255,255,0.06)'}`,
                                    opacity: affordable ? 1 : 0.55,
                                }}
                                title="Clicca per i dettagli della struttura"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-mono text-[8px] font-bold" style={{ color }}>
                                            {id}
                                        </span>
                                        <p className="font-mono text-[9px] text-gray-300">{def.name}</p>
                                    </div>
                                    <button
                                        disabled={!affordable}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuild(id);
                                        }}
                                        className="rounded px-2.5 py-1 font-mono text-[9px] font-bold transition-colors disabled:opacity-30"
                                        style={affordable ? { background: `${color}22`, border: `1px solid ${color}66`, color } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
                                        Costruisci
                                    </button>
                                </div>

                                {/* Costo */}
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(def.buildCost).map(([k, v]) => {
                                        const have = resources[k as keyof Resources] ?? 0;
                                        return (
                                            <span key={k} className={`font-mono text-[8px] ${have >= (v ?? 0) ? 'text-gray-400' : 'text-red-400'}`}>
                                                {k}: {v} {have < (v ?? 0) ? `(hai ${have})` : '✓'}
                                            </span>
                                        );
                                    })}
                                    {Object.keys(def.buildCost).length === 0 && (
                                        <span className="font-mono text-[8px] text-gray-600">Nessun costo</span>
                                    )}
                                </div>

                                {/* Tempo di costruzione */}
                                <div className="flex items-center gap-1">
                                    <span className="font-mono text-[7px] text-gray-500">⏱</span>
                                    <span className="font-mono text-[7px] text-gray-400">
                                        {def.buildTimeHours >= 1
                                            ? `${Math.floor(def.buildTimeHours)}h ${Math.round((def.buildTimeHours % 1) * 60)}m`
                                            : `${Math.round(def.buildTimeHours * 60)}m`}
                                    </span>
                                    <span className="font-mono text-[7px] text-gray-600">costruzione</span>
                                </div>

                                {/* Tag categoria */}
                                <span className="font-mono text-[7px] text-gray-600">{def.category} · Tier {def.tier === 'BASE' ? '1' : def.tier === 'AVANZATO' ? '2' : '3'}</span>
                            </div>
                        );
                    })}

                    {buildError && (
                        <div className="rounded p-2 font-mono text-[9px] text-red-300"
                            style={{ background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.2)' }}>
                            ⚠ {buildError}
                        </div>
                    )}
                    {buildOk && (
                        <div className="rounded p-2 font-mono text-[9px] text-emerald-300"
                            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)' }}>
                            ✓ Struttura in cantiere
                        </div>
                    )}
                </div>
            )}

            {/* Hex fuori segnale */}
            {!psHere && !cell.is_accessible && (
                <div className="px-4 py-6 text-center">
                    <p className="font-mono text-[9px] text-gray-700 flex flex-col items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <span>
                            Questo hex è fuori dalla copertura di segnale.<br />
                            Costruisci un ripetitore (STR-A02) nelle vicinanze.
                        </span>
                    </p>
                </div>
            )}
            {/* Modal esplicativo dei dettagli della struttura */}
            {selectedStructureId && (
                <StructureDetailModal
                    structureId={selectedStructureId}
                    onClose={() => setSelectedStructureId(null)}
                    onBuild={() => handleBuild(selectedStructureId)}
                    canBuild={canAfford(selectedStructureId)}
                />
            )}
        </div>
    );
}
