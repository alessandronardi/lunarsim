import { AlertTriangle } from 'lucide-react';
import type { ResDef } from '../constants/resources';

interface ResourceBarProps {
    def: ResDef;
    value: number;
    cap: number;
    deltaPerHour?: number;
}

export function ResourceBar({ def, value, cap, deltaPerHour = 0 }: ResourceBarProps) {
    const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
    const isWarn = def.warnBelow !== undefined && value < def.warnBelow;
    const isOverflow = pct >= 99;
    const deltaStr = deltaPerHour === 0 ? '' : (deltaPerHour > 0 ? `+${deltaPerHour.toFixed(1)}` : deltaPerHour.toFixed(1));

    return (
        <div className="flex flex-col gap-1">
            {/* Label row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span style={{ color: isWarn ? '#ff9944' : def.color }}>{def.icon}</span>
                    <span className={`font-mono text-[11px] ${isWarn ? 'text-amber-400' : 'text-gray-300'}`}>
                        {def.label}
                    </span>
                    {isWarn && <AlertTriangle size={10} className="text-amber-400 animate-pulse" />}
                    {isOverflow && <span className="text-[9px] text-red-400 font-mono ml-1">MAX</span>}
                </div>
                <div className="flex items-center gap-2">
                    {deltaPerHour !== 0 && (
                        <span className={`font-mono text-[9px] ${deltaPerHour > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {deltaStr}/h
                        </span>
                    )}
                    <span className="font-mono text-[11px] text-gray-200">
                        {Math.floor(value)}<span className="text-gray-500">/{Math.floor(cap)}</span>
                    </span>
                </div>
            </div>
            {/* Barra */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                        width: `${pct}%`,
                        background: isWarn
                            ? 'linear-gradient(90deg, #ff6600, #ff9944)'
                            : isOverflow
                                ? `linear-gradient(90deg, ${def.color}, #ffffff88)`
                                : `linear-gradient(90deg, ${def.color}88, ${def.color})`,
                        boxShadow: isWarn ? '0 0 6px #ff664488' : `0 0 4px ${def.color}44`,
                    }}
                />
            </div>
        </div>
    );
}
