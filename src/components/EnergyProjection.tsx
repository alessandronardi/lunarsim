import { Activity, BatteryLow } from 'lucide-react';

interface EnergyProjectionProps {
    energy: number;
    energyCap: number;
    energyDeltaPerHour: number;
    energyLowHours: number;
    phase: string;
}

export function EnergyProjection({
    energy,
    energyCap,
    energyDeltaPerHour,
    energyLowHours,
    phase
}: EnergyProjectionProps) {
    const avgDelta = energyDeltaPerHour;
    const hoursToEmpty = avgDelta < 0 ? Math.floor(energy / Math.abs(avgDelta)) : Infinity;
    const hoursToFull = avgDelta > 0 ? Math.floor((energyCap - energy) / avgDelta) : Infinity;

    const status = avgDelta < -2 ? 'CONSUMO CRITICO' : avgDelta < 0 ? 'IN CONSUMO' : avgDelta > 0 ? 'IN RICARICA' : 'STABILE';
    const statusColor = avgDelta < -2 ? '#ff4444' : avgDelta < 0 ? '#ff9944' : avgDelta > 0 ? '#00ff88' : '#808080';

    return (
        <div className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: statusColor }} />
                <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">Proiezione Energetica</span>
                <span className="ml-auto font-mono text-[10px] font-bold" style={{ color: statusColor }}>{status}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-0.5 rounded-lg p-2"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="font-mono text-[9px] text-gray-500 uppercase">Δ/h</span>
                    <span className="font-mono text-sm font-bold" style={{ color: statusColor }}>
                        {avgDelta === 0 ? '±0' : (avgDelta > 0 ? '+' : '') + avgDelta.toFixed(1)}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-lg p-2"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="font-mono text-[9px] text-gray-500 uppercase">
                        {avgDelta < 0 ? 'Esaurim.' : 'Ricarica'}
                    </span>
                    <span className="font-mono text-sm font-bold text-gray-200">
                        {hoursToEmpty === Infinity && hoursToFull === Infinity ? '∞'
                            : avgDelta < 0 && hoursToEmpty < Infinity ? `${hoursToEmpty}h`
                                : hoursToFull < Infinity ? `${hoursToFull}h`
                                    : '∞'}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-lg p-2"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="font-mono text-[9px] text-gray-500 uppercase">Fase</span>
                    <span className="font-mono text-[10px] font-bold text-blue-300">{phase}</span>
                </div>
            </div>

            {/* Emergenza batteria */}
            {energyLowHours > 0 && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 animate-pulse"
                    style={{ background: 'rgba(255,50,50,0.12)', border: '1px solid rgba(255,50,50,0.3)' }}>
                    <BatteryLow size={14} className="text-red-400" />
                    <span className="font-mono text-xs text-red-300">
                        Energia critica da {energyLowHours.toFixed(1)} ore continue
                    </span>
                </div>
            )}
        </div>
    );
}
