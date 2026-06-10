import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { AlertTriangle, Info, X } from 'lucide-react';

export function AlertToast() {
    const alerts = useGameStore(s => s.engineAlerts);
    const dismiss = useGameStore(s => s.dismissAlert);

    // Auto-dismiss after 8 seconds
    useEffect(() => {
        if (alerts.length === 0) return;
        const latest = alerts[alerts.length - 1];
        const timer = setTimeout(() => {
            dismiss(latest.id);
        }, 8000);
        return () => clearTimeout(timer);
    }, [alerts, dismiss]);

    if (alerts.length === 0) return null;

    // Show top 5 visible alerts in reverse chronological order
    const visibleAlerts = [...alerts].reverse().slice(0, 5);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {visibleAlerts.map(a => {
                const isCritical = a.level === 'CRITICO';
                const isWarning = a.level === 'AVVISO';
                const bg = isCritical ? 'rgba(30, 10, 10, 0.9)' : isWarning ? 'rgba(25, 18, 10, 0.9)' : 'rgba(10, 18, 25, 0.9)';
                const border = isCritical ? '1px solid rgba(255, 80, 80, 0.5)' : isWarning ? '1px solid rgba(255, 180, 80, 0.4)' : '1px solid rgba(80, 180, 255, 0.3)';
                const color = isCritical ? '#ff6060' : isWarning ? '#ffb060' : '#80c0ff';
                const icon = isCritical ? <AlertTriangle size={14} /> : isWarning ? <AlertTriangle size={14} /> : <Info size={14} />;

                return (
                    <div
                        key={a.id}
                        className="pointer-events-auto flex items-start gap-2.5 rounded-xl p-3 shadow-2xl backdrop-blur-md"
                        style={{
                            background: bg,
                            border,
                            boxShadow: isCritical ? '0 10px 30px rgba(255,0,0,0.15)' : '0 10px 30px rgba(0,0,0,0.3)',
                        }}
                    >
                        <span className="mt-0.5" style={{ color }}>{icon}</span>
                        <div className="flex-1 flex flex-col gap-0.5">
                            <span className="font-mono text-[10px] text-gray-200 leading-snug">
                                {a.message}
                            </span>
                            <span className="font-mono text-[7px] text-gray-500">
                                {new Date(a.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <button
                            onClick={() => dismiss(a.id)}
                            className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
