
export function MapLegend() {
    return (
        <div className="absolute bottom-3 left-3 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none"
            style={{
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
            }}>
            <p className="font-mono text-[7px] uppercase tracking-widest text-gray-600 mb-0.5">Legenda</p>
            {[
                { color: '#1a1f30', label: 'Piano' },
                { color: '#0d0d1a', label: 'Cratere' },
                { color: '#252538', label: 'Rilievo' },
                { color: '#080c18', label: 'Ombra permanente' },
            ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border border-gray-700" style={{ background: color }} />
                    <span className="font-mono text-[7px] text-gray-500">{label}</span>
                </div>
            ))}
            <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-3 h-1 rounded-full" style={{ background: 'rgba(96,200,255,0.25)' }} />
                <span className="font-mono text-[7px] text-gray-500">Segnale attivo</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(100,180,255,0.7)' }} />
                <span className="font-mono text-[7px] text-gray-500">Deposito ghiaccio</span>
            </div>
        </div>
    );
}
