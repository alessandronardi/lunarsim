import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { STRUCTURES } from '../data/structures';
import { AlertTriangle, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import { HexCellShape, hexCenter, HEX_SIZE } from '../components/HexCellShape';
import { SidePanel } from '../components/SidePanel';
import { MapLegend } from '../components/MapLegend';

function MapHeader() {
    const phase = useGameStore(s => s.time.phase);
    const day = useGameStore(s => s.time.day);
    const placed = useGameStore(s => s.placedStructures);
    const drones = useGameStore(s => s.drones);

    const structureCount = Object.keys(placed).length;
    const damagedCount = Object.values(placed).filter(ps => ps.damaged || ps.health < 60).length;
    const isNight = phase === 'NOTTE' || phase === 'PREALBA';

    return (
        <div className="flex items-center gap-4 px-4 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isNight ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                <span className="font-mono text-[9px] text-gray-400 uppercase tracking-widest">{phase}</span>
            </div>
            <span className="font-mono text-[9px] text-gray-600">Giorno #{day}</span>
            <div className="flex items-center gap-1 ml-auto">
                <span className="font-mono text-[9px] text-gray-500">{structureCount} strutture</span>
                {damagedCount > 0 && (
                    <span className="font-mono text-[8px] text-red-400 flex items-center gap-0.5">
                        <AlertTriangle size={8} /> {damagedCount} vulnerabili
                    </span>
                )}
                <span className="font-mono text-[9px] text-gray-600 ml-2">URM: {drones.available}/{drones.total}</span>
            </div>
        </div>
    );
}

export function ColonyView() {
    const grid = useGameStore(s => s.grid);
    const placed = useGameStore(s => s.placedStructures);
    const selectedHexId = useGameStore(s => s.ui.selectedHexId);
    const selectHex = useGameStore(s => s.selectHex);
    const phase = useGameStore(s => s.time.phase);

    // Pan + zoom state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // Calcola bbox della griglia
    const bbox = useMemo(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of grid) {
            const [cx, cy] = hexCenter(c.q, c.r);
            minX = Math.min(minX, cx - HEX_SIZE);
            minY = Math.min(minY, cy - HEX_SIZE);
            maxX = Math.max(maxX, cx + HEX_SIZE);
            maxY = Math.max(maxY, cy + HEX_SIZE);
        }
        const pad = 24;
        return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    }, [grid]);

    // Set strutture danneggiate per overlay
    const damagedHexes = useMemo(() => {
        const set = new Set<string>();
        Object.values(placed).forEach(ps => {
            if (ps.damaged || ps.health < 60) set.add(ps.hexId);
        });
        return set;
    }, [placed]);

    // Calcola progresso e tempo di costruzione per hex on-the-fly
    const buildInfo = useMemo(() => {
        const map = new Map<string, { progress: number; remaining: string }>();
        for (const ps of Object.values(placed)) {
            if (!ps.building) continue;
            const def = STRUCTURES[ps.definitionId];
            if (!def) continue;

            const elapsed = (Date.now() - ps.buildStartTime) / 3_600_000;
            const droneSpeedup = 1 + Math.min(ps.assignedDrones * 0.2, 0.6);
            const progress = Math.min(1, (elapsed / def.buildTimeHours) * droneSpeedup);

            const remainingHours = Math.max(0, (def.buildTimeHours / droneSpeedup) - elapsed);
            const remaining = remainingHours >= 1
                ? `${Math.floor(remainingHours)}h ${Math.floor((remainingHours % 1) * 60)}m`
                : `${Math.ceil(remainingHours * 60)}m`;

            map.set(ps.hexId, { progress, remaining });
            if (ps.secondaryHexId) map.set(ps.secondaryHexId, { progress, remaining });
        }
        return map;
    }, [placed]);

    const handleHexClick = useCallback((id: string) => {
        selectHex(id === selectedHexId ? null : id);
    }, [selectHex, selectedHexId]);

    // Pan handlers
    const onMouseDown = (e: React.MouseEvent) => {
        if ((e.target as SVGElement).tagName === 'polygon') return;
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    };
    const onMouseUp = () => { isPanning.current = false; };

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.4, Math.min(3, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };

    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    return (
        <div className="h-full flex flex-col">
            <MapHeader />

            <div className="flex-1 flex overflow-hidden relative">
                {/* ── Griglia SVG ──────────────────────────────────────────── */}
                <div className="flex-1 relative overflow-hidden"
                    style={{ background: 'radial-gradient(ellipse at 50% 50%, #0a0e1a 0%, #050810 100%)' }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={onWheel}>

                    <svg
                        ref={svgRef}
                        className="w-full h-full"
                        style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}>
                        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                            {/* SVG center correction */}
                            <g transform={`translate(${-bbox.x + (typeof window !== 'undefined' ? window.innerWidth / 2 : 600) / zoom - bbox.w / 2},${-bbox.y + (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) / zoom - bbox.h / 2})`}>
                                {grid.map(cell => {
                                    const info = buildInfo.get(cell.id);
                                    return (
                                        <HexCellShape
                                            key={cell.id}
                                            cell={cell}
                                            isSelected={cell.id === selectedHexId}
                                            hasDamage={damagedHexes.has(cell.id)}
                                            phase={phase}
                                            buildProgress={info ? info.progress : null}
                                            onClick={handleHexClick}
                                        />
                                    );
                                })}
                            </g>
                        </g>
                    </svg>

                    {/* Zoom controls */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                        {[
                            { icon: <ZoomIn size={14} />, action: () => setZoom(z => Math.min(3, z * 1.2)) },
                            { icon: <ZoomOut size={14} />, action: () => setZoom(z => Math.max(0.4, z / 1.2)) },
                            { icon: <Crosshair size={14} />, action: resetView },
                        ].map((btn, i) => (
                            <button key={i} onClick={btn.action}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                                {btn.icon}
                            </button>
                        ))}
                        <div className="font-mono text-[8px] text-gray-600 text-center mt-0.5">{Math.round(zoom * 100)}%</div>
                    </div>

                    <MapLegend />
                </div>

                {/* ── Pannello laterale ──────────────────────────────────── */}
                <SidePanel
                    hexId={selectedHexId}
                    onClose={() => selectHex(null)}
                />
            </div>
        </div>
    );
}
