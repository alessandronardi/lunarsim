import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

import { Users } from 'lucide-react';
import { processUpdate } from '../utils/gameEngine';
import { RES_DEFS } from '../constants/resources';
import { IACGauge } from '../components/IACGauge';
import { ResourceBar } from '../components/ResourceBar';
import { EnergyProjection } from '../components/EnergyProjection';
import { AlertPanel } from '../components/AlertPanel';
import { SectionCard } from '../components/SectionCard';

export function DashboardView() {
    const state = useGameStore(s => s);
    const res = state.resources;
    const caps = state.resourceCaps;
    const iac = state.iacIndex;
    const time = state.time;
    const drones = state.drones;
    const energyLow = state.energyLowHours;
    const he3Cycle = state.helium3ExportedThisCycle;
    const engineAlerts = state.engineAlerts;
    const dismissAlert = useGameStore(s => s.dismissAlert);

    // Proiezione delta/ora delle risorse effettuata dinamicamente tramite l'engine
    const rates = useMemo(() => {
        const result = processUpdate(state, 1);
        return result.resourceDelta;
    }, [state]);

    return (
        <div className="h-full overflow-y-auto p-5">
            <div className="max-w-7xl mx-auto flex flex-col gap-5">

                {/* ── RIGA 1: IAC + Proiezione + Alert ───────────────────────────── */}
                <div className="grid gap-5" style={{ gridTemplateColumns: '220px 1fr 280px' }}>

                    {/* IAC Gauge */}
                    <SectionCard title="IAC">
                        <div className="relative flex flex-col items-center">
                            <IACGauge value={iac} />
                        </div>
                    </SectionCard>

                    {/* Proiezione Energetica */}
                    <SectionCard title="Sistema Energetico">
                        <EnergyProjection
                            energy={res.energy}
                            energyCap={caps.energy ?? 1000}
                            energyDeltaPerHour={rates.energy ?? 0}
                            energyLowHours={energyLow}
                            phase={time.phase}
                        />

                        {/* Info Elio-3 */}
                        <div className="flex items-end gap-3 mt-2">
                            <div className="flex-1">
                                <p className="font-mono text-[9px] text-mc-dim uppercase mb-1">He-3 esportato (ciclo attuale)</p>
                                <div className="flex items-end gap-2">
                                    <span className="font-mono text-xl font-bold text-purple-300">{he3Cycle.toFixed(1)}</span>
                                    <span className="font-mono text-[10px] text-gray-500 mb-0.5">u / ciclo</span>
                                </div>
                                <div className="font-mono text-[9px] text-gray-600">
                                    → {Math.floor(he3Cycle) * 50} cr a fine ciclo
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Alert */}
                    <SectionCard title="Centro Allerte">
                        <AlertPanel alerts={engineAlerts} onDismiss={dismissAlert} />
                        {/* Stato droni */}
                        <div className="rounded-lg p-3 flex flex-col gap-2"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">URM Workforce</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-mono text-[10px] text-gray-400">Disponibili</span>
                                        <span className="font-mono text-[10px] text-emerald-300">{drones.available}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-mono text-[10px] text-gray-400">Totali</span>
                                        <span className="font-mono text-[10px] text-gray-200">{drones.total}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span className="font-mono text-sm font-bold text-cyan-300">
                                            {drones.total > 0 ? Math.round(((drones.total - drones.available) / drones.total) * 100) : 0}%
                                        </span>
                                    </div>
                                    <span className="font-mono text-[8px] text-gray-600">assegnati</span>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>



                {/* ── RIGA 3: Risorse vs Cap ────────────────────────── */}
                <SectionCard title="Inventario Risorse">
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {RES_DEFS.map(def => (
                            <div key={def.key} className="flex flex-col gap-2 rounded-xl p-3"
                                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <ResourceBar
                                    def={def}
                                    value={res[def.key]}
                                    cap={caps[def.key] ?? 200}
                                    deltaPerHour={rates[def.key] ?? 0}
                                />
                            </div>
                        ))}
                        {/* Barra Risorsa URM (Rapporto Disponibili / Totali) */}
                        <div className="flex flex-col gap-2 rounded-xl p-3"
                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <ResourceBar
                                def={{
                                    key: 'urm' as any,
                                    label: 'Unità URM (disponibili)',
                                    icon: <Users size={13} />,
                                    color: '#60ffdd'
                                }}
                                value={drones.available}
                                cap={drones.total}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* ── RIGA 4: Riepilogo ciclo temporale ───────────────────────────── */}
                <SectionCard title="Cronometro di Missione">
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Giorno', value: time.day, color: '#60c0ff' },
                            { label: 'Ciclo Lunare', value: `${time.day}/28`, color: '#80e0ff' },
                            { label: 'Ciclo #', value: time.cycle, color: '#a0d0ff' },
                            { label: 'Fase', value: time.phase, color: '#ccecff' },
                        ].map(item => (
                            <div key={item.label} className="rounded-xl p-4 text-center"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                                <p className="font-mono text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
