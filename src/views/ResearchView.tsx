import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { RESEARCH, RESEARCH_LIST, type ResearchId, type ResearchDefinition } from '../data/research';
import { STRUCTURES } from '../data/structures';
import { CheckCircle, Lock, FlaskConical, Zap, Radio, X, ChevronRight, Coins, Cpu } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

function getStatus(
    id: ResearchId,
    completed: ResearchId[],
    active: ResearchId | null,
): NodeStatus {
    if (completed.includes(id)) return 'COMPLETED';
    if (active === id) return 'IN_PROGRESS';
    const def = RESEARCH[id];
    if (!def.prerequisites.every(p => completed.includes(p))) return 'LOCKED';
    return 'AVAILABLE';
}

// ── Colori per stato ──────────────────────────────────────────────────────────
const STATUS_STYLE: Record<NodeStatus, { border: string; bg: string; label: string; labelColor: string }> = {
    LOCKED: { border: 'rgba(255,255,255,0.06)', bg: 'rgba(0,0,0,0.3)', label: 'BLOCCATA', labelColor: '#444' },
    AVAILABLE: { border: 'rgba(96,192,255,0.35)', bg: 'rgba(8,20,40,0.75)', label: 'DISPONIBILE', labelColor: '#60c0ff' },
    IN_PROGRESS: { border: 'rgba(240,224,64,0.6)', bg: 'rgba(20,18,0,0.85)', label: 'IN CORSO…', labelColor: '#f0e040' },
    COMPLETED: { border: 'rgba(0,255,136,0.4)', bg: 'rgba(0,20,12,0.75)', label: 'COMPLETATA', labelColor: '#00ff88' },
};

// ── Componente: barra progresso ricerca attiva ────────────────────────────────
function ActiveResearchBar({
    active, progress, d02Active,
    onCancel,
}: {
    active: ResearchId | null;
    progress: number;
    d02Active: boolean;
    onCancel: () => void;
}) {
    if (!active) return null;
    const def = RESEARCH[active];
    if (!def) return null;
    const pct = Math.min(100, (progress / def.costHours) * 100);

    return (
        <div className="relative rounded-2xl px-5 py-4 flex items-center gap-5 overflow-hidden"
            style={{
                background: 'rgba(20,18,0,0.85)',
                border: '1px solid rgba(240,224,64,0.5)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 30px rgba(240,224,64,0.08), inset 0 1px 0 rgba(240,224,64,0.1)',
            }}>
            {/* Animated glow sweep */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${pct}%`, background: 'rgba(240,224,64,0.04)',
                    transition: 'width 1s ease',
                }} />
            </div>

            <span className="text-2xl">{def.icon}</span>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-sm font-bold text-yellow-300">{def.name}</span>
                    <span className="font-mono text-xs text-yellow-500">
                        {progress.toFixed(1)}/{def.costHours} ore
                        {d02Active && <span className="ml-1 text-purple-300">(×1.5 D02)</span>}
                    </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #a08020, #f0e040)',
                            boxShadow: '0 0 8px rgba(240,224,64,0.6)',
                        }} />
                </div>
                <p className="font-mono text-[9px] text-gray-500 mt-1">
                    Ramo: {def.branch === 'LUNAR' ? '🌙 Lunare' : '🌍 Terrestre'}
                </p>
            </div>

            <button
                onClick={onCancel}
                className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                title="Annulla ricerca (i progressi saranno persi)">
                <X size={10} />
                Annulla
            </button>
        </div>
    );
}

// ── Componente: singolo nodo tech ─────────────────────────────────────────────
function TechNode({
    def, status, progressPct,
    onStart,
    completed,
    bandwidth,
}: {
    def: ResearchDefinition;
    status: NodeStatus;
    progressPct: number;
    onStart: (id: ResearchId) => void;
    completed: ResearchId[];
    bandwidth: number;
}) {
    const st = STATUS_STYLE[status];
    const isLocked = status === 'LOCKED';
    const isCompleted = status === 'COMPLETED';
    const isInProgress = status === 'IN_PROGRESS';
    const isAvailable = status === 'AVAILABLE';
    const bandwidthBlocked = isAvailable && def.branch === 'TERRESTRIAL' && bandwidth < 1.5;
    const bandwidthStalled = isInProgress && def.branch === 'TERRESTRIAL' && bandwidth < 1.5;

    const currentCredits = useGameStore(s => s.resources.credits);
    const currentCompute = useGameStore(s => s.resources.compute);
    const resourcesBlocked = isAvailable && (currentCredits < def.creditsCost || currentCompute < def.computeCost);

    const unlockedBuildings = useMemo(() => {
        return Object.values(STRUCTURES).filter(struct =>
            struct.prerequisites.includes(`research:${def.id}`)
        );
    }, [def.id]);

    return (
        <div
            className="relative flex flex-col gap-3 rounded-xl p-4 transition-all duration-300"
            style={{
                background: st.bg,
                border: `1px solid ${st.border}`,
                backdropFilter: 'blur(16px)',
                opacity: isLocked ? 0.45 : 1,
                boxShadow: isInProgress
                    ? '0 0 20px rgba(240,224,64,0.15), inset 0 1px 0 rgba(240,224,64,0.08)'
                    : isCompleted
                        ? '0 0 12px rgba(0,255,136,0.08), inset 0 1px 0 rgba(0,255,136,0.06)'
                        : 'none',
            }}>

            {/* Header */}
            <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{def.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-sm font-bold ${isLocked ? 'text-gray-600' : 'text-gray-100'}`}>
                            {def.name}
                        </span>
                        <span className="font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                            style={{ color: st.labelColor, background: `${st.border}` }}>
                            {st.label}
                        </span>
                    </div>
                    <p className={`font-mono text-[10px] leading-relaxed mt-1 ${isLocked ? 'text-gray-700' : 'text-gray-400'}`}>
                        {def.description}
                    </p>
                </div>

                {/* Status icon */}
                {isCompleted && <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />}
                {isLocked && <Lock size={14} className="text-gray-700 flex-shrink-0 mt-0.5" />}
            </div>

            {/* Progress bar (solo IN_PROGRESS) */}
            {isInProgress && (
                <>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#a08020,#f0e040)', boxShadow: '0 0 6px rgba(240,224,64,0.6)' }} />
                    </div>
                    {bandwidthStalled && (
                        <span className="font-mono text-[9px] text-amber-500">In pausa — banda &lt; 1.5</span>
                    )}
                </>
            )}

            {/* Effetti */}
            <div className="flex flex-col gap-1">
                {def.effects.map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                        <ChevronRight size={10} className={`flex-shrink-0 mt-0.5 ${isLocked ? 'text-gray-700' : 'text-cyan-500'}`} />
                        <span className={`font-mono text-[9px] leading-tight ${isLocked ? 'text-gray-700' : 'text-cyan-300'}`}>{e}</span>
                    </div>
                ))}
            </div>

            {/* Sblocchi Costruzioni */}
            {unlockedBuildings.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-gray-800/40 pt-2">
                    <span className="font-mono text-[8px] tracking-wider text-gray-500 uppercase">Sblocca Costruzioni:</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {unlockedBuildings.map(b => (
                            <span
                                key={b.id}
                                className={`font-mono text-[9px] px-2 py-0.5 rounded border ${
                                    isCompleted
                                        ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'
                                        : isLocked
                                            ? 'bg-gray-900/50 border-gray-800/50 text-gray-600'
                                            : 'bg-cyan-950/20 border-cyan-800/30 text-cyan-400'
                                }`}
                                title={b.description}
                            >
                                🏢 {b.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Costo una tantum */}
            {!isCompleted && (
                <div className="flex items-center gap-3 border-t border-gray-800/40 pt-2">
                    <div className="flex items-center gap-1" title="Costo Crediti">
                        <Coins size={10} className={isLocked ? 'text-gray-700' : 'text-amber-500/80'} />
                        <span className={`font-mono text-[10px] ${isLocked ? 'text-gray-700' : 'text-gray-300'}`}>
                            {def.creditsCost} <span className="text-[8px] text-gray-500">Crediti</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1" title="Costo Calcolo (Compute)">
                        <Cpu size={10} className={isLocked ? 'text-gray-700' : 'text-cyan-500/80'} />
                        <span className={`font-mono text-[10px] ${isLocked ? 'text-gray-700' : 'text-gray-300'}`}>
                            {def.computeCost} <span className="text-[8px] text-gray-500">Calcolo</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Prerequisiti non soddisfatti */}
            {isLocked && def.prerequisites.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[8px] text-gray-700">Richiede:</span>
                    {def.prerequisites.map(p => (
                        <span key={p} className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${completed.includes(p) ? 'text-emerald-600 bg-emerald-900/30' : 'text-gray-700 bg-gray-900/50'}`}>
                            {RESEARCH[p]?.name ?? p}
                        </span>
                    ))}
                </div>
            )}

            {/* Costo tempo e bottone */}
            <div className="flex items-center justify-between mt-1 border-t border-mc-border/20 pt-2">
                <div className="flex items-center gap-1.5">
                    {def.branch === 'LUNAR'
                        ? <Zap size={10} className={isLocked ? 'text-gray-700' : 'text-emerald-400'} />
                        : <Radio size={10} className={isLocked ? 'text-gray-700' : 'text-blue-400'} />}
                    <span className={`font-mono text-[9px] ${isLocked ? 'text-gray-700' : 'text-gray-400'}`}>
                        {def.costHours} ore • Tier {def.tier}
                    </span>
                </div>

                {bandwidthBlocked && (
                    <span className="font-mono text-[9px] text-amber-500">Banda &lt; 1.5</span>
                )}
                {isAvailable && !bandwidthBlocked && (
                    <button
                        disabled={resourcesBlocked}
                        onClick={() => onStart(def.id)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold transition-all duration-200 ${
                            resourcesBlocked
                                ? 'bg-red-950/20 border border-red-900/30 text-red-500/50 cursor-not-allowed'
                                : 'bg-[rgba(96,192,255,0.12)] border border-[rgba(96,192,255,0.4)] text-[#60c0ff] hover:bg-[rgba(96,192,255,0.22)]'
                        }`}
                        style={{
                            cursor: resourcesBlocked ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <FlaskConical size={10} />
                        {resourcesBlocked ? 'Risorse Insufficienti' : 'Avvia'}
                    </button>
                )}
            </div>

            {/* Flavor text (solo COMPLETED) */}
            {isCompleted && (
                <p className="font-mono text-[8px] italic text-gray-600 border-t border-gray-800 pt-2">
                    {def.flavor}
                </p>
            )}
        </div>
    );
}

// ── Colonna ramo ──────────────────────────────────────────────────────────────
function BranchColumn({
    title, icon, nodes, completed, active, progress,
    onStart, bandwidth,
}: {
    title: string; icon: React.ReactNode;
    nodes: ResearchDefinition[];
    completed: ResearchId[];
    active: ResearchId | null;
    progress: number;
    onStart: (id: ResearchId) => void;
    bandwidth: number;
}) {
    // Raggruppa per tier per la visualizzazione
    const tiers = [1, 2, 3] as const;

    return (
        <div className="flex flex-col gap-4">
            {/* Header ramo */}
            <div className="flex items-center gap-2 pb-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {icon}
                <span className="font-mono text-xs font-bold text-gray-300 uppercase tracking-widest">{title}</span>
                <span className="ml-auto font-mono text-[9px] text-gray-600">
                    {completed.filter(id => RESEARCH[id]?.branch === (title.includes('Lunare') ? 'LUNAR' : 'TERRESTRIAL')).length}/
                    {nodes.length} completate
                </span>
            </div>

            {/* Nodi per tier */}
            {tiers.map(tier => {
                const tierNodes = nodes.filter(n => n.tier === tier);
                if (tierNodes.length === 0) return null;
                return (
                    <div key={tier} className="flex flex-col gap-2">
                        {/* Tier label */}
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[8px] text-gray-700 uppercase tracking-widest">TIER {tier}</span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                        </div>
                        {/* Cards */}
                        <div className={`grid gap-3 ${tierNodes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {tierNodes.map(def => {
                                const status = getStatus(def.id, completed, active);
                                const progressPct = status === 'IN_PROGRESS'
                                    ? Math.min(100, (progress / def.costHours) * 100)
                                    : 0;
                                return (
                                    <TechNode
                                        key={def.id}
                                        def={def}
                                        status={status}
                                        progressPct={progressPct}
                                        onStart={onStart}
                                        completed={completed}
                                        bandwidth={bandwidth}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Vista R&D principale ──────────────────────────────────────────────────────
export function ResearchView() {
    const research = useGameStore(s => s.research ?? { completed: [], active: null, progressHours: 0 });
    const structures = useGameStore(s => s.placedStructures);
    const bandwidth = useGameStore(s => s.resources.bandwidth);
    const startRes = useGameStore(s => s.startResearch);
    const cancelRes = useGameStore(s => s.cancelResearch);

    const d02Active = useMemo(
        () => Object.values(structures).some(ps => ps.definitionId === 'STR-D02' && !ps.inStandby && ps.health > 0),
        [structures],
    );

    const lunarNodes = useMemo(() => RESEARCH_LIST.filter(r => r.branch === 'LUNAR'), []);
    const terrestrialNodes = useMemo(() => RESEARCH_LIST.filter(r => r.branch === 'TERRESTRIAL'), []);

    const totalCompleted = research.completed.length;
    const totalNodes = RESEARCH_LIST.length;

    return (
        <div className="h-full overflow-y-auto p-5">
            <div className="max-w-7xl mx-auto flex flex-col gap-5">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-start gap-4 rounded-2xl p-5"
                    style={{
                        background: 'rgba(8,16,32,0.65)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                    }}>
                    <div className="flex-1 flex flex-col gap-1">
                        <h2 className="font-title font-bold text-lg text-mc-cyan tracking-widest uppercase">
                            Centro Ricerche
                        </h2>
                        <p className="font-mono text-[10px] text-gray-500">
                            Avanza la tecnologia della colonia per migliorare produzione, resistenza e autonomia.
                            {d02Active && (
                                <span className="ml-2 text-purple-300 font-bold">
                                    ● STR-D02 attivo — velocità ricerca ×1.5
                                </span>
                            )}
                            <span className="ml-2 text-blue-300">
                                Banda: {bandwidth.toFixed(1)} (uplink SCC 1.75/ora · ricerche terrestri ≥ 1.5 e −1.5/ora)
                            </span>
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-2xl font-bold text-cyan-300">
                            {totalCompleted}<span className="text-gray-600 text-lg">/{totalNodes}</span>
                        </span>
                        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">Ricerche Completate</span>
                        {/* Mini progress bar globale */}
                        <div className="w-32 h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${(totalCompleted / totalNodes) * 100}%`, background: 'linear-gradient(90deg, #00c870, #00ff88)' }} />
                        </div>
                    </div>
                </div>

                {/* ── Ricerca attiva ──────────────────────────────────────────── */}
                <ActiveResearchBar
                    active={research.active}
                    progress={research.progressHours}
                    d02Active={d02Active}
                    onCancel={cancelRes}
                />

                {/* ── Alberi di ricerca ────────────────────────────────────────── */}
                <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 420px' }}>

                    {/* Ramo Lunare */}
                    <div className="rounded-2xl p-5 flex flex-col gap-5"
                        style={{
                            background: 'rgba(8,16,32,0.65)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                        }}>
                        <BranchColumn
                            title="Ramo Lunare"
                            icon={<span className="text-sm">🌙</span>}
                            nodes={lunarNodes}
                            completed={research.completed}
                            active={research.active}
                            progress={research.progressHours}
                            onStart={startRes}
                            bandwidth={bandwidth}
                        />
                    </div>

                    {/* Ramo Terrestre */}
                    <div className="rounded-2xl p-5 flex flex-col gap-5"
                        style={{
                            background: 'rgba(8,16,32,0.65)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                        }}>
                        <BranchColumn
                            title="Ramo Terrestre"
                            icon={<span className="text-sm">🌍</span>}
                            nodes={terrestrialNodes}
                            completed={research.completed}
                            active={research.active}
                            progress={research.progressHours}
                            onStart={startRes}
                            bandwidth={bandwidth}
                        />
                    </div>
                </div>

                {/* ── Legenda effetti ricerche completate ─────────────────────── */}
                {research.completed.length > 0 && (
                    <div className="rounded-2xl p-5"
                        style={{
                            background: 'rgba(0,20,12,0.5)',
                            border: '1px solid rgba(0,255,136,0.1)',
                            backdropFilter: 'blur(20px)',
                        }}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-700 mb-3 flex items-center gap-2">
                            <span className="w-4 h-px bg-emerald-800 inline-block" />
                            Modificatori Attivi
                            <span className="flex-1 h-px bg-emerald-900 inline-block" />
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {research.completed.map(id => {
                                const def = RESEARCH[id];
                                return (
                                    <div key={id} className="flex items-start gap-2 rounded-lg px-3 py-2"
                                        style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.08)' }}>
                                        <span className="text-sm flex-shrink-0">{def.icon}</span>
                                        <div>
                                            <p className="font-mono text-[9px] text-emerald-400 font-bold">{def.name}</p>
                                            {def.effects.map((e, i) => (
                                                <p key={i} className="font-mono text-[8px] text-emerald-700">{e}</p>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
