import { useEffect } from 'react';
import type { GamePhase } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { STRUCTURES } from '../data/structures';
import { LORE_NOTES } from '../views/EncyclopediaView';
import { RES_DEFS } from '../constants/resources';
import { structureColor } from './HexCellShape';
import { X, Layers, Clock, Users, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import type { Resources } from '../types/game';

interface StructureDetailModalProps {
    structureId: string;
    onClose: () => void;
    onBuild?: () => void;
    canBuild?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
    'Controllo & Segnale': 'Controllo & Segnale',
    'Energia': 'Energia',
    'Estrazione & Produzione': 'Estrazione & Produzione',
    'Ricerca & Elaborazione': 'Ricerca & Elaborazione',
    'Infrastruttura': 'Infrastruttura',
};

const PHASE_ICONS: Record<string, string> = {
    ALBA: '🌅',
    GIORNO: '☀️',
    TRAMONTO: '🌇',
    NOTTE: '🌑',
    PREALBA: '🌘',
};

const PHASE_LABELS: Record<string, string> = {
    ALBA: 'Alba',
    GIORNO: 'Giorno',
    TRAMONTO: 'Tramonto',
    NOTTE: 'Notte',
    PREALBA: 'Pre-alba',
};

export function StructureDetailModal({
    structureId,
    onClose,
    onBuild,
    canBuild = false
}: StructureDetailModalProps) {
    const def = STRUCTURES[structureId];
    const resources = useGameStore(s => s.resources);
    
    // Chiudi premendo ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!def) return null;

    const color = structureColor(structureId);
    const lore = LORE_NOTES[structureId];

    // Helper per trovare informazioni dettagliate sulle risorse
    const getResDef = (key: string) => {
        return RES_DEFS.find(r => r.key === key);
    };

    return (
        <div 
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scale-in {
                    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            <div 
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-slate-950/90 shadow-2xl transition-all duration-300 flex flex-col max-h-[85vh] animate-scale-in"
                style={{ 
                    borderColor: `${color}33`,
                    boxShadow: `0 0 40px ${color}15, 0 25px 50px -12px rgba(0,0,0,0.5)`
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Linea neon superiore a tema */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}dd, ${color}22)` }} />

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-white/5 bg-black/20">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2.5">
                            <span 
                                className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                                style={{ 
                                    color: color, 
                                    backgroundColor: `${color}11`, 
                                    borderColor: `${color}44` 
                                }}
                            >
                                {def.id}
                            </span>
                            <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest text-white/55 bg-white/5 uppercase">
                                TIER {def.tier === 'BASE' ? '1' : def.tier === 'AVANZATO' ? '2' : '3'}
                            </span>
                        </div>
                        <h3 className="font-title text-xl font-bold text-white tracking-wide mt-1.5">
                            {def.name}
                        </h3>
                        <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                            {CATEGORY_LABEL[def.category] || def.category}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                    {/* Descrizione Lore */}
                    <div className="relative pl-4 border-l-2 py-1 bg-white/[0.01] rounded-r-lg" style={{ borderColor: color }}>
                        <p className="font-mono text-xs italic text-gray-300 leading-relaxed">
                            "{def.description}"
                        </p>
                    </div>

                    {/* Specifiche principali */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
                            <Layers size={16} className="text-gray-500" />
                            <div>
                                <p className="font-mono text-[7px] text-gray-500 uppercase tracking-wider">Ingombro</p>
                                <p className="font-mono text-xs font-bold text-gray-200">{def.gridSize} {def.gridSize === 1 ? 'Esagono' : 'Esagoni'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
                            <Clock size={16} className="text-gray-500" />
                            <div>
                                <p className="font-mono text-[7px] text-gray-500 uppercase tracking-wider">Tempo Costruzione</p>
                                <p className="font-mono text-xs font-bold text-gray-200">
                                    {def.buildTimeHours >= 1
                                        ? `${Math.floor(def.buildTimeHours)}h ${Math.round((def.buildTimeHours % 1) * 60)}m`
                                        : `${Math.round(def.buildTimeHours * 60)}m`}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
                            <Users size={16} className="text-gray-500" />
                            <div>
                                <p className="font-mono text-[7px] text-gray-500 uppercase tracking-wider">URM Ottimali</p>
                                <p className="font-mono text-xs font-bold text-gray-200">
                                    {def.optimalDrones > 0 ? `${def.optimalDrones} Dron${def.optimalDrones === 1 ? 'e' : 'i'}` : 'Nessuno'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
                            <Zap size={16} className="text-gray-500" />
                            <div>
                                <p className="font-mono text-[7px] text-gray-500 uppercase tracking-wider">Flusso Energetico</p>
                                {def.energyCostPerHour > 0 ? (
                                    <p className="font-mono text-xs font-bold text-amber-400">-{def.energyCostPerHour} E/ora</p>
                                ) : def.energyCostPerHour === 0 && def.productionPerHour.energy ? (
                                    <p className="font-mono text-xs font-bold text-emerald-400">+{def.productionPerHour.energy} E/ora</p>
                                ) : (
                                    <p className="font-mono text-xs font-bold text-gray-400">0 (Autonomo)</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fasi Operative */}
                    <div className="flex flex-col gap-2">
                        <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold">Fasi Operative Attive</p>
                        <div className="flex items-center gap-1.5">
                            {['ALBA', 'GIORNO', 'TRAMONTO', 'NOTTE', 'PREALBA'].map(phase => {
                                const isActive = def.activePhases.includes(phase as GamePhase);
                                return (
                                    <div 
                                        key={phase} 
                                        className={`flex-1 py-1.5 rounded-lg border font-mono text-[8px] font-bold flex flex-col items-center gap-1 justify-center transition-all ${
                                            isActive 
                                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                                                : 'bg-black/40 border-white/5 text-gray-600'
                                        }`}
                                    >
                                        <span className="text-[11px]">{PHASE_ICONS[phase]}</span>
                                        <span>{PHASE_LABELS[phase]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Costo Costruzione */}
                    <div className="flex flex-col gap-2">
                        <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold">Costo di Costruzione</p>
                        <div className="flex gap-2.5 flex-wrap">
                            {Object.entries(def.buildCost).map(([resKey, value]) => {
                                const resDef = getResDef(resKey);
                                const currentStock = resources[resKey as keyof Resources] ?? 0;
                                const isAffordable = currentStock >= (value ?? 0);
                                
                                return (
                                    <div 
                                        key={resKey} 
                                        className={`rounded-xl px-3 py-2 flex items-center gap-2 border font-mono text-[10px] ${
                                            isAffordable 
                                                ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
                                                : 'bg-red-950/20 border-red-900/30 text-red-300'
                                        }`}
                                    >
                                        <span style={{ color: resDef?.color }}>{resDef?.icon}</span>
                                        <span className="font-bold">{resDef?.label}:</span>
                                        <span>{value}</span>
                                        <span className="text-[8px] opacity-60">
                                            ({isAffordable ? 'Disponibile' : `mancano ${value! - currentStock}`})
                                        </span>
                                    </div>
                                );
                            })}
                            {Object.keys(def.buildCost).length === 0 && (
                                <div className="rounded-xl px-3 py-2 bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 font-mono text-[10px]">
                                    Nessun costo (Struttura Iniziale)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Produzione / Rendimento (se presente ed esclude energy se già indicata) */}
                    {Object.entries(def.productionPerHour).filter(([k]) => k !== 'energy').length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold">Produzione Risorse</p>
                            <div className="flex gap-2 flex-wrap">
                                {Object.entries(def.productionPerHour).filter(([k]) => k !== 'energy').map(([resKey, value]) => {
                                    const resDef = getResDef(resKey);
                                    return (
                                        <div 
                                            key={resKey} 
                                            className="rounded-xl px-3 py-2 bg-emerald-950/15 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center gap-2"
                                        >
                                            <span style={{ color: resDef?.color }}>{resDef?.icon}</span>
                                            <span className="font-bold">+{value}</span>
                                            <span>{resDef?.label} / ora</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Note Tecniche e IAC (Lore) */}
                    {lore && (
                        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 mt-1">
                            <div>
                                <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                                    <ShieldCheck size={11} style={{ color }} />
                                    Note Tecniche Operative
                                </p>
                                <p className="font-mono text-[10px] text-gray-400 leading-relaxed bg-black/40 border border-white/5 rounded-lg p-2.5">
                                    {lore.techNote}
                                </p>
                            </div>
                            <div>
                                <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                                    <AlertCircle size={11} className="text-cyan-400" />
                                    Contributo Indice Autosufficienza (IAC)
                                </p>
                                <p className="font-mono text-[10px] text-gray-400 leading-relaxed bg-cyan-950/5 border border-cyan-900/10 rounded-lg p-2.5">
                                    {lore.iacNote}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex gap-3 justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl font-mono text-[10px] font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                    >
                        Chiudi
                    </button>
                    {onBuild && (
                        <button 
                            disabled={!canBuild}
                            onClick={() => {
                                onBuild();
                                onClose();
                            }}
                            className="px-4 py-2 rounded-xl font-mono text-[10px] font-bold text-white transition-all duration-200 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ 
                                background: canBuild ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${canBuild ? color : 'rgba(255,255,255,0.1)'}`,
                                boxShadow: canBuild ? `0 4px 15px ${color}33` : 'none'
                            }}
                        >
                            Costruisci
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
