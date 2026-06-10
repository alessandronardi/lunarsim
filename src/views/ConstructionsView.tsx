import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ChevronDown, ChevronRight, Users, PowerOff, Zap, Mountain } from 'lucide-react';
import { STRUCTURES } from '../data/structures';
import { droneSaturation } from '../utils/gameFormulas';
import { RES_DEFS } from '../constants/resources';
import { SectionCard } from '../components/SectionCard';
import { getStructureActualRates } from '../utils/gameEngine';
import type { Resources } from '../types/game';

export function ConstructionsView() {
    const state = useGameStore(s => s);
    const structures = state.placedStructures;
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Statistiche strutture
    const totalStructures = Object.keys(structures).length;
    const activeStructures = Object.values(structures).filter(s => !s.inStandby && s.health > 0).length;
    const damagedCount = Object.values(structures).filter(s => s.health < 60 && s.health > 0).length;

    return (
        <div className="h-full overflow-y-auto p-5">
            <div className="max-w-7xl mx-auto flex flex-col gap-5">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex items-start gap-4 rounded-2xl p-5"
                    style={{
                        background: 'rgba(8,16,32,0.65)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                    }}>
                    <div className="flex-1 flex flex-col gap-1">
                        <h2 className="font-title font-bold text-lg text-mc-cyan tracking-widest uppercase">
                            Gestione Costruzioni
                        </h2>
                        <p className="font-mono text-[10px] text-gray-500">
                            Monitora l'integrità delle strutture, alloca droni URM per la produzione ed effettua riparazioni.
                        </p>
                    </div>
                </div>

                {/* ── STATISTICHE ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Strutture Totali', value: totalStructures, color: '#80c0ff' },
                        { label: 'Operative', value: activeStructures, color: '#00ff88' },
                        { label: 'Danneggiate', value: damagedCount, color: damagedCount > 0 ? '#ff9944' : '#404040' },
                    ].map(item => (
                        <div key={item.label} className="rounded-xl p-4 flex flex-col gap-1"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{item.label}</span>
                            <span className="font-mono text-3xl font-bold" style={{ color: item.color, textShadow: `0 0 10px ${item.color}44` }}>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── DETTAGLIO COSTRUZIONI ────────────────────────────────────── */}
                <SectionCard title="Stato Colonia">
                    {/* Lista strutture con health bar (Gruppate) */}
                    {totalStructures > 0 ? (() => {
                        const groups: Record<string, typeof structures[string][]> = {};
                        for (const ps of Object.values(structures)) {
                            if (!groups[ps.definitionId]) groups[ps.definitionId] = [];
                            groups[ps.definitionId].push(ps);
                        }

                        return (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-1 px-1">
                                    <span className="font-mono text-[10px] text-gray-400 font-bold">DETTAGLIO STRUTTURE (GRUPPI)</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => useGameStore.getState().recallAllDrones()}
                                            className="px-2 py-1 flex items-center gap-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                        >
                                            <Users size={10} />
                                            <span className="font-mono text-[9px] uppercase font-bold tracking-wider">Richiamo URM</span>
                                        </button>
                                        <button
                                            onClick={() => useGameStore.getState().shutdownAllPower()}
                                            className="px-2 py-1 flex items-center gap-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                                        >
                                            <PowerOff size={10} />
                                            <span className="font-mono text-[9px] uppercase font-bold tracking-wider">Shutdown Globale</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(groups).map(([defId, instances]) => {
                                        const def = STRUCTURES[defId];
                                        const avgHealth = instances.reduce((sum, ps) => sum + ps.health, 0) / instances.length;
                                        const healthColor = avgHealth > 60 ? '#00ff88' : avgHealth > 30 ? '#f0e040' : '#ff4444';

                                        // Calcola power medio del gruppo.
                                        const avgPower = instances.reduce((acc, ps) => acc + (ps.powerLevel ?? 100), 0) / instances.length;

                                        // Mostriamo e permettiamo di regolare il power SOLO se la struttura consuma energia.
                                        const canAdjustPower = def && def.energyCostPerHour > 0 && defId !== 'STR-A01';

                                        // Calcolo URM totali del gruppo
                                        const totalDrones = instances.reduce((acc, ps) => acc + (ps.assignedDrones ?? 0), 0);
                                        const isExpanded = !!expandedGroups[defId];

                                        return (
                                            <div key={defId} className="flex flex-col gap-1.5 rounded-lg transition-colors duration-200"
                                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>

                                                {/* INTESTAZIONE GRUPPO (Clickabile) */}
                                                <button
                                                    onClick={() => setExpandedGroups((prev: Record<string, boolean>) => ({ ...prev, [defId]: !prev[defId] }))}
                                                    className="flex flex-col items-stretch text-left p-3 hover:bg-white/5 transition-colors focus:outline-none rounded-t-lg"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                                                            <div>
                                                                <p className="font-mono text-[11px] font-bold text-gray-200">
                                                                    {def?.name ?? defId}
                                                                    <span className="ml-2 text-cyan-300/60 font-medium">x{instances.length}</span>
                                                                </p>
                                                                <p className="font-mono text-[8px] text-gray-500 uppercase">Media Integrità</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 min-w-[60px]">
                                                            <div className="flex items-center gap-2">
                                                                {instances.some(ps => ps.damaged) && <span className="text-[8px] text-red-400">DANNEGG.</span>}
                                                                {instances.some(ps => ps.inStandby && (ps.powerLevel ?? 100) > 0) && <span className="text-[8px] text-amber-400">STANDBY</span>}
                                                                {canAdjustPower && avgPower === 0 && <span className="text-[8px] text-gray-500">SPENTO</span>}
                                                                {totalDrones > 0 && (
                                                                    <div className="flex items-center gap-1 bg-cyan-900/40 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                                                                        <Users size={8} />
                                                                        <span className="font-mono text-[8px] font-bold">{totalDrones}</span>
                                                                    </div>
                                                                )}
                                                                <span className="font-mono text-[9px]" style={{ color: healthColor }}>{Math.floor(avgHealth)}%</span>
                                                            </div>
                                                            <div className="w-16 h-0.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                                                <div className="h-full rounded-full" style={{ width: `${avgHealth}%`, background: healthColor }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {canAdjustPower && (
                                                        <div className="flex items-center gap-2 mt-2 w-full pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
                                                            <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest w-10">Power</span>
                                                            <input
                                                                type="range"
                                                                min="0" max="100" step="10"
                                                                value={avgPower}
                                                                onChange={(e) => useGameStore.getState().setGroupPower(defId, Number(e.target.value))}
                                                                className="flex-1 h-1 appearance-none rounded-full bg-gray-800 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 focus:outline-none"
                                                            />
                                                            <span className="font-mono text-[9px] text-cyan-300 w-8 text-right">{Math.round(avgPower)}%</span>
                                                        </div>
                                                    )}
                                                </button>

                                                {/* CORPO ESPANSO: Singole unità */}
                                                {isExpanded && (
                                                    <div className="flex flex-col gap-1 px-3 pb-3 border-t border-white/5 pt-2">

                                                        {/* --- SINTETICO GRUPPO --- */}
                                                        {(def.energyCostPerHour > 0 || Object.keys(def.productionPerHour || {}).length > 0) && (
                                                            <div className="flex flex-col gap-1.5 p-2 rounded bg-black/20 mb-1 border border-white/5">
                                                                <span className="font-mono text-[8px] text-gray-400 uppercase">Resa Nominale del Gruppo</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {def.energyCostPerHour > 0 && (() => {
                                                                        const totalNominal = instances.reduce((acc, ps) => acc + (ps.building ? 0 : (def.energyCostPerHour * ((ps.powerLevel ?? 100) / 100))), 0);
                                                                        const consumptionActual = instances.reduce((acc, ps) => {
                                                                            const actualRates = getStructureActualRates(ps, state);
                                                                            const val = actualRates.energy ?? 0;
                                                                            return acc + (val < 0 ? Math.abs(val) : 0);
                                                                        }, 0);
                                                                        return (
                                                                            <div className="flex items-center gap-1 text-[9px]">
                                                                                <Zap size={8} className="text-yellow-400" />
                                                                                <span className="text-gray-300">
                                                                                    -{totalNominal.toFixed(1)}/h
                                                                                    {consumptionActual !== totalNominal && (
                                                                                        <span className="text-gray-500 font-medium ml-1">
                                                                                            (reale: -{consumptionActual.toFixed(1)}/h)
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    {Object.entries(def.productionPerHour || {}).map(([resName, val]) => {
                                                                        const rDef = RES_DEFS.find(r => r.key === resName);
                                                                        const total = instances.reduce((acc, ps) => {
                                                                            if (ps.building) return acc;
                                                                            const pwr = (ps.powerLevel ?? 100) / 100;
                                                                            let rate = val * pwr;
                                                                            if (defId === 'STR-B03') {
                                                                                const completedResearch = (state.research ?? { completed: [] }).completed;
                                                                                const hasFullOutput = completedResearch.includes('nuclear_reactor');
                                                                                rate = hasFullOutput ? val * pwr : (ps.assignedDrones < 2 ? val * 0.6 * pwr : val * pwr);
                                                                            } else {
                                                                                const droneMultiplier = def.optimalDrones === 0 ? 1 : droneSaturation(ps.assignedDrones, def.optimalDrones);
                                                                                rate = val * pwr * droneMultiplier;
                                                                            }
                                                                            return acc + rate;
                                                                        }, 0);
                                                                        
                                                                        const totalActual = instances.reduce((acc, ps) => {
                                                                            const actualRates = getStructureActualRates(ps, state);
                                                                            const actualVal = actualRates[resName as keyof Resources] ?? 0;
                                                                            return acc + (actualVal > 0 ? actualVal : 0);
                                                                        }, 0);

                                                                        return (
                                                                            <div key={resName} className="flex items-center gap-1 text-[9px]">
                                                                                {rDef ? <span style={{ color: rDef.color }}>{rDef.icon}</span> : <Mountain size={8} />}
                                                                                <span className="text-gray-300">
                                                                                    +{total.toFixed(1)}/h
                                                                                    {Math.abs(totalActual - total) > 0.01 && (
                                                                                        <span className="text-gray-500 font-medium ml-1">
                                                                                            (reale: +{totalActual.toFixed(1)}/h)
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {instances.map(ps => {
                                                            const pwr = (ps.powerLevel ?? 100) / 100;
                                                            return (
                                                                <div key={ps.instanceId} className="flex flex-col gap-1 text-[9px] font-mono py-1.5 border-b border-white/5 last:border-0 relative">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-500">HEX {ps.hexId}</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    disabled={ps.assignedDrones <= 0}
                                                                                    onClick={() => useGameStore.getState().setDroneAssignment(ps.instanceId, ps.assignedDrones - 1)}
                                                                                    className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 flex justify-center items-center text-gray-400"
                                                                                >-</button>
                                                                                <span className="text-cyan-400 w-3 text-center">{ps.assignedDrones}</span>
                                                                                <button
                                                                                    disabled={useGameStore.getState().drones.available <= 0}
                                                                                    onClick={() => useGameStore.getState().setDroneAssignment(ps.instanceId, ps.assignedDrones + 1)}
                                                                                    className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 flex justify-center items-center text-gray-400"
                                                                                >+</button>
                                                                                <span className="text-gray-600 ml-1">URM</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-gray-500 flex items-center gap-1.5">
                                                                            HP: <span className={ps.health > 60 ? 'text-emerald-400' : 'text-red-400'}>{Math.round(ps.health)}%</span>
                                                                            {ps.health < 100 && !ps.building && (
                                                                                <button
                                                                                    onClick={() => useGameStore.getState().repairStructure(ps.instanceId)}
                                                                                    className="px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800 hover:border-cyan-400 text-cyan-400 font-bold transition-all text-[8px]"
                                                                                    title="Ripara: 5 Metalli, 5 Regolite"
                                                                                >
                                                                                    🔧 Ripara
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* --- SINTETICO SINGOLA STRUTTURA --- */}
                                                                    {(def.energyCostPerHour > 0 || Object.keys(def.productionPerHour || {}).length > 0) && (
                                                                        <div className="flex flex-wrap gap-2 mt-0.5 opacity-80 pl-8">
                                                                            {ps.building ? (
                                                                                <span className="text-amber-500 text-[8px] uppercase tracking-wider font-bold">🔨 In costruzione</span>
                                                                            ) : (
                                                                                <>
                                                                                    {def.energyCostPerHour > 0 && (() => {
                                                                                        const nominalVal = def.energyCostPerHour * pwr;
                                                                                        const actualRates = getStructureActualRates(ps, state);
                                                                                        const actualVal = actualRates.energy ?? 0;
                                                                                        const actualConsumption = actualVal < 0 ? Math.abs(actualVal) : 0;
                                                                                        return (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <Zap size={8} className="text-yellow-400" />
                                                                                                <span className="text-gray-400">
                                                                                                    -{nominalVal.toFixed(1)}/h
                                                                                                    {Math.abs(actualConsumption - nominalVal) > 0.01 && (
                                                                                                        <span className="text-gray-500 font-medium ml-1">
                                                                                                            (reale: -{actualConsumption.toFixed(1)}/h)
                                                                                                        </span>
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                    {Object.entries(def.productionPerHour || {}).map(([resName, val]) => {
                                                                                        const rDef = RES_DEFS.find(r => r.key === resName);
                                                                                        let nominalRate = val * pwr;
                                                                                        if (ps.definitionId === 'STR-B03') {
                                                                                            const completedResearch = (state.research ?? { completed: [] }).completed;
                                                                                            const hasFullOutput = completedResearch.includes('nuclear_reactor');
                                                                                            nominalRate = hasFullOutput ? val * pwr : (ps.assignedDrones < 2 ? val * 0.6 * pwr : val * pwr);
                                                                                        } else {
                                                                                            const droneMultiplier = def.optimalDrones === 0 ? 1 : droneSaturation(ps.assignedDrones, def.optimalDrones);
                                                                                            nominalRate = val * pwr * droneMultiplier;
                                                                                        }
                                                                                        
                                                                                        const actualRates = getStructureActualRates(ps, state);
                                                                                        const actualRate = actualRates[resName as keyof Resources] ?? 0;
                                                                                        
                                                                                        return (
                                                                                            <div key={resName} className="flex items-center gap-1">
                                                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: rDef?.color || '#fff' }} />
                                                                                                <span className="text-gray-400">
                                                                                                    +{nominalRate.toFixed(1)}/h
                                                                                                    {Math.abs(actualRate - nominalRate) > 0.01 && (
                                                                                                        <span className="text-gray-500 font-medium ml-1">
                                                                                                            (reale: +{actualRate.toFixed(1)}/h)
                                                                                                        </span>
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="text-center p-8 text-mc-dim font-mono text-sm opacity-40">
                            Nessuna struttura costruita sulla colonia.
                        </div>
                    )}
                </SectionCard>

            </div>
        </div>
    );
}
