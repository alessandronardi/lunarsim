
interface IACGaugeProps {
    value: number;
}

export function IACGauge({ value }: IACGaugeProps) {
    const R = 54, CIRC = 2 * Math.PI * R;
    const dash = (value / 100) * CIRC;
    const iacColor = value >= 70 ? '#00ff88' : value >= 40 ? '#f0e040' : '#ff5555';

    const label = value >= 70 ? 'AUTOSUFFICIENTE'
        : value >= 40 ? 'IN SVILUPPO'
            : value >= 20 ? 'CRITICO'
                : 'EMERGENZA';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                <svg width={140} height={140} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                    {/* Track */}
                    <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    {/* Value arc */}
                    <circle
                        cx={70} cy={70} r={R} fill="none"
                        stroke={iacColor} strokeWidth="10"
                        strokeDasharray={`${dash} ${CIRC}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1), stroke 1.2s ease', filter: `drop-shadow(0 0 6px ${iacColor}88)` }}
                    />
                    {/* Tick marks at 25/50/75 */}
                    {[25, 50, 75].map(pct => {
                        const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
                        const x1 = 70 + (R - 8) * Math.cos(angle), y1 = 70 + (R - 8) * Math.sin(angle);
                        const x2 = 70 + (R + 8) * Math.cos(angle), y2 = 70 + (R + 8) * Math.sin(angle);
                        return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />;
                    })}
                </svg>
                {/* Centro */}
                <div className="flex flex-col items-center relative z-10">
                    <span className="font-mono text-3xl font-bold leading-none" style={{ color: iacColor, textShadow: `0 0 12px ${iacColor}88` }}>
                        {value.toFixed(1)}
                    </span>
                    <span className="font-mono text-[9px] text-gray-400 tracking-widest mt-1">IAC</span>
                </div>
            </div>
            <span className="font-mono text-[10px] tracking-widest" style={{ color: iacColor }}>{label}</span>
        </div>
    );
}
