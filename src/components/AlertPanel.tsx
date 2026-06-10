import { AlertTriangle, Shield, Check, Info } from 'lucide-react';
import type { GameAlert } from '../types/game';

interface AlertPanelProps {
    alerts: GameAlert[];
    onDismiss: (id: string) => void;
}

export function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                <Shield size={24} className="text-gray-600 mb-2" />
                <p className="font-mono text-xs text-gray-500">Tutti i sistemi nominali. Nessun alert attivo.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {alerts.map(a => {
                const isCritical = a.level === 'CRITICO';
                const isWarning = a.level === 'AVVISO';
                const bg = isCritical ? 'rgba(255,50,50,0.08)' : isWarning ? 'rgba(255,160,50,0.06)' : 'rgba(96,200,255,0.04)';
                const border = isCritical ? '1px solid rgba(255,50,50,0.2)' : isWarning ? '1px solid rgba(255,160,50,0.15)' : '1px solid rgba(96,200,255,0.12)';
                const color = isCritical ? '#ff6060' : isWarning ? '#ffb060' : '#80c0ff';
                const icon = isCritical ? <AlertTriangle size={12} /> : isWarning ? <AlertTriangle size={12} /> : <Info size={12} />;

                return (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-white/[0.02]"
                        style={{ background: bg, border }}>
                        <span style={{ color }}>{icon}</span>
                        <span className="font-mono text-[11px] text-gray-300 flex-1 leading-snug">
                            {a.message}
                        </span>
                        <span className="font-mono text-[8px] text-gray-600">
                            {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                        <button
                            onClick={() => onDismiss(a.id)}
                            className="ml-2 w-5 h-5 rounded hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                            title="Rimuovi alert"
                        >
                            <Check size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
