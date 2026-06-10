import { memo } from 'react';
import type { HexCell } from '../types/game';

export const HEX_SIZE = 24; // px center-to-vertex
const SQRT3 = Math.sqrt(3);

export function hexCenter(q: number, r: number): [number, number] {
    // Flat-top: x = size * 3/2 * q,  y = size * sqrt(3) * (r + q/2)
    const x = HEX_SIZE * 1.5 * q;
    const y = HEX_SIZE * SQRT3 * (r + q / 2);
    return [x, y];
}

export function hexCorners(cx: number, cy: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i;
        const angleRad = (Math.PI / 180) * angleDeg;
        pts.push(`${cx + HEX_SIZE * Math.cos(angleRad)},${cy + HEX_SIZE * Math.sin(angleRad)}`);
    }
    return pts.join(' ');
}

export const TERRAIN_COLOR: Record<HexCell['terrain'], string> = {
    PIANO: '#1a1f30',
    CRATERE: '#0d0d1a',
    RILIEVO: '#252538',
    OMBRA_PERMANENTE: '#080c18',
};

export const TERRAIN_STROKE: Record<HexCell['terrain'], string> = {
    PIANO: '#2a2f45',
    CRATERE: '#18182e',
    RILIEVO: '#343450',
    OMBRA_PERMANENTE: '#10141f',
};

export function structureColor(id: string): string {
    const cat = id.slice(4, 5); // A,B,C,D,E
    const palette: Record<string, string> = {
        A: '#60c0ff', B: '#ffdd44', C: '#66ee88',
        D: '#cc88ff', E: '#ff8844',
    };
    return palette[cat] ?? '#aaa';
}

interface HexCellProps {
    cell: HexCell;
    isSelected: boolean;
    hasDamage: boolean;
    phase: string;
    buildProgress: number | null;   // 0.0-1.0, null se non in costruzione
    onClick: (id: string) => void;
}

export const HexCellShape = memo(function HexCellShape({
    cell,
    isSelected,
    hasDamage,
    phase,
    buildProgress,
    onClick
}: HexCellProps) {
    const [cx, cy] = hexCenter(cell.q, cell.r);
    const points = hexCorners(cx, cy);
    const hasSignal = cell.is_accessible;
    const hasBuilding = !!cell.building_id;
    const buildingCat = cell.building_id ? cell.building_id.slice(4, 5) : null;
    const isNight = phase === 'NOTTE' || phase === 'PREALBA';
    const dmgOverlay = hasDamage && hasBuilding && isNight;

    return (
        <g
            className="hex-cell"
            style={{ cursor: 'pointer' }}
            onClick={() => onClick(cell.id)}
        >
            {/* Base hex */}
            <polygon
                points={points}
                fill={TERRAIN_COLOR[cell.terrain]}
                stroke={isSelected ? '#00d4ff' : TERRAIN_STROKE[cell.terrain]}
                strokeWidth={isSelected ? 1.5 : 0.5}
            />

            {/* Signal overlay */}
            {hasSignal && !hasBuilding && (
                <polygon points={points} fill="rgba(96,200,255,0.07)" stroke="none" />
            )}

            {/* Ice deposit indicator */}
            {cell.has_ice_deposit && !hasBuilding && (
                <circle cx={cx} cy={cy} r={3} fill="rgba(100,180,255,0.7)" stroke="none" />
            )}

            {/* Building (completata) */}
            {hasBuilding && buildProgress === null && (
                <>
                    {/* Background circle */}
                    <circle
                        cx={cx} cy={cy} r={HEX_SIZE * 0.55}
                        fill={`${structureColor(cell.building_id!)}22`}
                        stroke={structureColor(cell.building_id!)}
                        strokeWidth={1}
                    />
                    {/* Category letter */}
                    <text
                        x={cx} y={cy - 4}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={7} fontFamily="monospace"
                        fill={structureColor(cell.building_id!)}
                        fontWeight="bold"
                    >
                        {buildingCat}
                    </text>
                    <text
                        x={cx} y={cy + 5}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={5.5} fontFamily="monospace"
                        fill={`${structureColor(cell.building_id!)}cc`}
                    >
                        {cell.building_id!.slice(5)}
                    </text>
                </>
            )}

            {/* Cantiere in costruzione */}
            {hasBuilding && buildProgress !== null && (
                <>
                    {/* Cerchio di track grigio */}
                    <circle
                        cx={cx} cy={cy} r={HEX_SIZE * 0.45}
                        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2}
                    />
                    {/* Arco di progresso arancione */}
                    <circle
                        cx={cx} cy={cy} r={HEX_SIZE * 0.45}
                        fill="none" stroke="#f0a040" strokeWidth={2}
                        strokeDasharray={`${buildProgress * 2 * Math.PI * HEX_SIZE * 0.45} ${2 * Math.PI * HEX_SIZE * 0.45}`}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                    />
                    {/* Percentuale al centro */}
                    <text
                        x={cx} y={cy}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={6} fontFamily="monospace"
                        fill="#f0a040" fontWeight="bold"
                    >
                        {Math.floor(buildProgress * 100)}%
                    </text>
                </>
            )}

            {/* Damage overlay (night + damaged) */}
            {dmgOverlay && (
                <polygon points={points} fill="rgba(255,60,60,0.15)" stroke="rgba(255,60,60,0.5)" strokeWidth={0.8} />
            )}

            {/* Selection glow */}
            {isSelected && (
                <polygon points={points} fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.8)" strokeWidth={2} />
            )}
        </g>
    );
});
