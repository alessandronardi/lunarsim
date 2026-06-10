import { useRef, useMemo, useEffect, useState, memo } from 'react';
import { useGameStore } from '../store/gameStore';
import { DAYS_PER_CYCLE } from '../constants/time';

// ── Costanti visuali ─────────────────────────────────────────────────────────
const BG_TOTAL_DAYS = 28; // alias locale per leggibilità

// Stelle pre-calcolate su sfera celeste
const STELLE = Array.from({ length: 280 }, (_, i) => ({
    theta: (Math.sin(i * 127.1) * 0.5 + 0.5) * 360,
    phi: (Math.sin(i * 311.7) * 0.5 + 0.5) * 180 - 90,
    r: 0.6 + Math.abs(Math.sin(i * 53.3)) * 1.2,
    opacita: 0.5 + Math.abs(Math.sin(i * 71.9)) * 0.5,
    periodo: 1.8 + Math.abs(Math.sin(i * 43.1)) * 1.4,
}));

// ── RNG deterministica ────────────────────────────────────────────────────────
function rng(seed: number) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// ── Hook: calcolo fase dal giorno frazionario ─────────────────────────────────
function useFaseLunare(giorno: number) {
    return useMemo(() => {
        let nomeFase: string;
        let temperatura: number;
        let luce: number;
        let statoEnergia = 'TRANSIZIONE';

        if (giorno < 3) {
            nomeFase = 'ALBA'; temperatura = -173 + (giorno / 3) * 280; luce = giorno / 3;
        } else if (giorno < 14) {
            nomeFase = 'GIORNO PIENO'; temperatura = 107; luce = 1;
        } else if (giorno < 17) {
            nomeFase = 'TRAMONTO';
            const t = (giorno - 14) / 3;
            temperatura = 107 - t * 280; luce = 1 - t;
        } else if (giorno < 26) {
            nomeFase = 'NOTTE PROFONDA'; temperatura = -173; luce = 0;
        } else {
            nomeFase = 'PRE-ALBA'; temperatura = -173; luce = (giorno - 26) / 2;
        }

        if (giorno >= 3 && giorno <= 14) statoEnergia = '100% OPERATIVO';
        else if (giorno > 17 && giorno < 26) statoEnergia = 'OFFLINE';

        let opacitaNotte = 0;
        if (giorno > 16 && giorno < 18) opacitaNotte = (giorno - 16) / 2;
        else if (giorno >= 18 && giorno <= 27) opacitaNotte = 1;
        else if (giorno > 27) opacitaNotte = 1 - (giorno - 27);

        const sunAngle = (giorno / BG_TOTAL_DAYS) * 360;
        const sunAngleRad = (sunAngle * Math.PI) / 180;
        const sunX = 50 - Math.sin(sunAngleRad) * 130;
        const sunY = 10 - Math.cos(sunAngleRad) * 10;

        return { nomeFase, temperatura, opacitaNotte, luce, statoEnergia, sunX, sunY, intensitaCalore: Math.max(0, luce) };
    }, [giorno]);
}

// ── Hook: canvas superficie lunare (mount-once) ───────────────────────────────
function useSurfaceLunare(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;

        const sfondo = ctx.createRadialGradient(W * 0.45, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.7);
        sfondo.addColorStop(0, '#3c3c47'); sfondo.addColorStop(0.5, '#2a2a33'); sfondo.addColorStop(1, '#1a1a22');
        ctx.fillStyle = sfondo; ctx.fillRect(0, 0, W, H);

        const r1 = rng(42);
        for (let i = 0; i < 18; i++) {
            const x = r1() * W, y = r1() * H, r = r1() * 380 + 120;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        }

        const img = ctx.getImageData(0, 0, W, H); const d = img.data; const r2 = rng(7);
        for (let i = 0; i < d.length; i += 4) {
            const n = (r2() - 0.5) * 20;
            d[i] = Math.min(255, Math.max(0, d[i] + n));
            d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
            d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);

        const r3 = rng(99);
        const disegnaCratere = (x: number, y: number, r: number) => {
            const go = ctx.createRadialGradient(x + r * 0.2, y + r * 0.2, r * 0.05, x, y, r);
            go.addColorStop(0, 'rgba(10,10,15,0)'); go.addColorStop(0.6, 'rgba(10,10,15,0.22)'); go.addColorStop(1, 'rgba(5,5,10,0.55)');
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = go; ctx.fill();
            const lx = x - r * 0.5, ly = y - r * 0.5;
            const gc = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.4);
            gc.addColorStop(0, 'rgba(210,210,220,0.16)'); gc.addColorStop(1, 'rgba(210,210,220,0)');
            ctx.beginPath(); ctx.arc(lx, ly, r * 0.4, 0, Math.PI * 2); ctx.fillStyle = gc; ctx.fill();
        };
        for (let i = 0; i < 28; i++)  disegnaCratere(r3() * W, r3() * H, r3() * 90 + 50);
        for (let i = 0; i < 110; i++) disegnaCratere(r3() * W, r3() * H, r3() * 38 + 9);
        for (let i = 0; i < 320; i++) disegnaCratere(r3() * W, r3() * H, r3() * 9 + 2);

        const r4 = rng(123);
        for (let i = 0; i < 7; i++) {
            const cx = r4() * W, cy = r4() * H, nr = Math.floor(r4() * 8) + 6;
            for (let j = 0; j < nr; j++) {
                const ang = (j / nr) * Math.PI * 2 + r4() * 0.4, len = r4() * 320 + 100;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
                const gr = ctx.createLinearGradient(0, 0, len, 0);
                gr.addColorStop(0, 'rgba(185,185,195,0.13)'); gr.addColorStop(1, 'rgba(185,185,195,0)');
                ctx.fillStyle = gr; ctx.fillRect(0, -(r4() * 6 + 2) / 2, len, r4() * 6 + 2); ctx.restore();
            }
        }
    }, [canvasRef]);
}

// ── Hook: canvas Terra (mount-once) ──────────────────────────────────────────
function useTerraCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;

        const ocean = ctx.createLinearGradient(0, 0, 0, H);
        ocean.addColorStop(0, '#12294f'); ocean.addColorStop(0.3, '#1a3f78');
        ocean.addColorStop(0.5, '#1e4f8c'); ocean.addColorStop(0.7, '#1a3f78'); ocean.addColorStop(1, '#12294f');
        ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H);

        const continenti = [
            { blobs: [{ cx: 0.12, cy: 0.28, rx: 0.09, ry: 0.13 }, { cx: 0.10, cy: 0.40, rx: 0.07, ry: 0.09 }, { cx: 0.16, cy: 0.22, rx: 0.05, ry: 0.07 }] },
            { blobs: [{ cx: 0.14, cy: 0.60, rx: 0.05, ry: 0.10 }, { cx: 0.16, cy: 0.72, rx: 0.04, ry: 0.09 }] },
            { blobs: [{ cx: 0.38, cy: 0.28, rx: 0.05, ry: 0.07 }, { cx: 0.40, cy: 0.22, rx: 0.03, ry: 0.04 }] },
            { blobs: [{ cx: 0.40, cy: 0.48, rx: 0.06, ry: 0.07 }, { cx: 0.41, cy: 0.60, rx: 0.05, ry: 0.09 }, { cx: 0.39, cy: 0.72, rx: 0.03, ry: 0.05 }] },
            { blobs: [{ cx: 0.54, cy: 0.24, rx: 0.14, ry: 0.13 }, { cx: 0.62, cy: 0.32, rx: 0.08, ry: 0.09 }, { cx: 0.48, cy: 0.30, rx: 0.06, ry: 0.08 }] },
            { blobs: [{ cx: 0.54, cy: 0.44, rx: 0.04, ry: 0.08 }] },
            { blobs: [{ cx: 0.68, cy: 0.46, rx: 0.05, ry: 0.06 }] },
            { blobs: [{ cx: 0.70, cy: 0.62, rx: 0.07, ry: 0.06 }, { cx: 0.74, cy: 0.66, rx: 0.03, ry: 0.03 }] },
            { blobs: [{ cx: 0.22, cy: 0.12, rx: 0.04, ry: 0.05 }] },
            { blobs: [{ cx: 0.30, cy: 0.18, rx: 0.02, ry: 0.02 }] },
            { blobs: [{ cx: 0.74, cy: 0.30, rx: 0.02, ry: 0.04 }] },
        ];

        const disegnaContinente = (offX: number, blobs: { cx: number, cy: number, rx: number, ry: number }[]) => {
            blobs.forEach(({ cx, cy, rx, ry }) => {
                const x = offX + cx * (W / 2), y = cy * H;
                ctx.beginPath(); ctx.ellipse(x, y, rx * (W / 2), ry * H, 0, 0, Math.PI * 2); ctx.fillStyle = '#3a6b35'; ctx.fill();
                ctx.beginPath(); ctx.ellipse(x - rx * (W / 2) * 0.1, y - ry * H * 0.1, rx * (W / 2) * 0.75, ry * H * 0.75, 0.2, 0, Math.PI * 2); ctx.fillStyle = '#4a7c40'; ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + rx * (W / 2) * 0.1, y + ry * H * 0.1, rx * (W / 2) * 0.4, ry * H * 0.4, -0.2, 0, Math.PI * 2); ctx.fillStyle = '#8a7a50'; ctx.fill();
            });
        };
        for (let rep = 0; rep < 2; rep++) continenti.forEach(({ blobs }) => disegnaContinente(rep * (W / 2), blobs));

        for (let rep = 0; rep < 2; rep++) {
            const offX = rep * (W / 2);
            const gn = ctx.createRadialGradient(offX + W / 4, 0, 0, offX + W / 4, 0, H * 0.28);
            gn.addColorStop(0, 'rgba(240,248,255,1)'); gn.addColorStop(0.6, 'rgba(220,238,255,0.7)'); gn.addColorStop(1, 'rgba(200,230,255,0)');
            ctx.fillStyle = gn; ctx.fillRect(offX, 0, W / 2, H * 0.3);
            const gs = ctx.createRadialGradient(offX + W / 4, H, 0, offX + W / 4, H, H * 0.22);
            gs.addColorStop(0, 'rgba(240,248,255,1)'); gs.addColorStop(0.6, 'rgba(220,238,255,0.7)'); gs.addColorStop(1, 'rgba(200,230,255,0)');
            ctx.fillStyle = gs; ctx.fillRect(offX, H * 0.78, W / 2, H * 0.22);
        }

        const r5 = rng(444);
        const cloudParticles: { px: number, py: number, pSize: number, baseOpacity: number }[] = [];
        for (let sys = 0; sys < 30; sys++) {
            const sysX = r5() * (W / 2), sysY = r5() * H, sysSize = (W / 2) * (0.08 + r5() * 0.12), isSwirl = r5() > 0.4;
            const numP = 25 + Math.floor(r5() * 30);
            for (let p = 0; p < numP; p++) {
                let px, py;
                if (isSwirl) {
                    const angle = r5() * Math.PI * 4, dist = (angle / (Math.PI * 4)) * sysSize;
                    px = sysX + Math.cos(angle) * dist; py = sysY + Math.sin(angle) * dist * 0.6;
                } else {
                    px = sysX + (r5() - 0.5) * sysSize * 2.8; py = sysY + (r5() - 0.5) * sysSize * 0.3;
                }
                if (px < 0) px += W / 2; if (px > W / 2) px -= W / 2;
                cloudParticles.push({ px, py, pSize: sysSize * 0.15 + r5() * sysSize * 0.35, baseOpacity: 0.05 + r5() * 0.25 });
            }
        }
        cloudParticles.forEach(cp => {
            if (cp.pSize <= 0) return;
            for (let rep = 0; rep < 2; rep++) {
                const drawX = cp.px + rep * (W / 2);
                const grad = ctx.createRadialGradient(drawX, cp.py, 0, drawX, cp.py, cp.pSize);
                grad.addColorStop(0, `rgba(255,255,255,${cp.baseOpacity})`);
                grad.addColorStop(0.5, `rgba(240,245,255,${cp.baseOpacity * 0.5})`);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath(); ctx.arc(drawX, cp.py, cp.pSize, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
            }
        });
    }, [canvasRef]);
}

// ── Componente: Terra ─────────────────────────────────────────────────────────
const Terra = memo(function Terra({ giorno, luce }: { giorno: number; luce: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useTerraCanvas(canvasRef);

    const rotazioneTerra = (giorno / BG_TOTAL_DAYS) * 27 * 360;
    const scrollX = ((rotazioneTerra % 360) / 360) * 50;
    const ombraLato = luce > 0.5 ? 110 : -10;

    return (
        <div style={{
            position: 'absolute', top: '7%', right: '14%',
            width: '14vw', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden', zIndex: 10,
            boxShadow: '0 0 2vw 0.8vw rgba(80,140,255,0.12), 0 0 0.3vw rgba(255,255,255,0.2)',
        }}>
            <div style={{ width: '200%', height: '100%', transform: `translateX(-${scrollX}%)`, willChange: 'transform' }}>
                <canvas ref={canvasRef} width={900} height={450} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
            <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                boxShadow: 'inset 0 0 8px 2px rgba(100,180,255,0.4)',
                background: 'radial-gradient(ellipse at 32% 28%, rgba(255,255,255,0.1) 0%, transparent 55%)',
            }} />
            <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                background: `radial-gradient(ellipse 130% 130% at ${ombraLato}% 50%, transparent 25%, rgba(0,0,10,0.65) 58%, rgba(0,0,6,0.95) 100%)`,
                opacity: Math.max(0.05, Math.abs(luce - 0.5) * 2),
            }} />
        </div>
    );
});

// ── Componente: Stelle ────────────────────────────────────────────────────────
const CieloStellato = memo(function CieloStellato({ giorno, opacita }: { giorno: number; opacita: number }) {
    const rotazione = (giorno / BG_TOTAL_DAYS) * 360;
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: opacita, overflow: 'visible' }}
            viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <defs>
                <style>{`
          @keyframes ammiccio-a { from{opacity:0.35} to{opacity:1} }
          @keyframes ammiccio-b { from{opacity:0.25} to{opacity:0.85} }
          @keyframes ammiccio-c { from{opacity:0.5}  to{opacity:1} }
        `}</style>
            </defs>
            <g transform={`rotate(${rotazione}, 50, 50)`}>
                {STELLE.map((s, i) => {
                    const tRad = (s.theta * Math.PI) / 180;
                    const pRad = (s.phi * Math.PI) / 180;
                    const x = 50 + Math.cos(pRad) * Math.sin(tRad) * 55;
                    const y = 50 - Math.sin(pRad) * 55;
                    const anim = i % 3 === 0 ? 'ammiccio-a' : i % 3 === 1 ? 'ammiccio-b' : 'ammiccio-c';
                    return (
                        <circle key={i} cx={x} cy={y} r={s.r * 0.18} fill="#FDFFE3" opacity={s.opacita}
                            style={{ animation: `${anim} ${s.periodo}s ease-in-out infinite alternate` }} />
                    );
                })}
            </g>
        </svg>
    );
});

/**
 * In real-time 1:1, il giorno è semplicemente derivato da Date.now().
 * Usiamo un RAF loop per aggiornare fluidamente la posizione nel ciclo.
 */
function useRealTimeGiorno(): number {
    const gameStartTime = useGameStore(s => s.time.gameStartTime);
    const [giorno, setGiorno] = useState(() => {
        const elapsed = Date.now() - gameStartTime;
        return (elapsed / 86_400_000) % DAYS_PER_CYCLE;
    });

    const rafRef = useRef<number>(0);
    const startTimeRef = useRef(gameStartTime);

    // Aggiorna se il gameStartTime cambia (reset)
    useEffect(() => {
        startTimeRef.current = gameStartTime;
    }, [gameStartTime]);

    useEffect(() => {
        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const dayInCycle = (elapsed / 86_400_000) % DAYS_PER_CYCLE;
            setGiorno(dayInCycle);
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return giorno;
}

// ── Componente Background principale ─────────────────────────────────────────
export const Background = memo(function Background() {
    // Giorno RAF fluido basato su Date.now() — real-time 1:1
    const giorno = useRealTimeGiorno();

    const fase = useFaseLunare(giorno);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useSurfaceLunare(canvasRef);

    // ── Stili CSS derivati dalla fase ─────────────────────────────────────────
    const stileLuce = useMemo(() => {
        const { sunX, sunY, luce } = fase;
        if (luce < 0.01) return { background: 'rgba(2,2,8,0.97)' };
        return {
            background: `radial-gradient(ellipse 170% 170% at ${sunX}% ${sunY}%,
        rgba(255,210,140,0.05) 0%, transparent 20%,
        rgba(5,5,15,0.72) 48%, rgba(2,2,8,0.97) 100%)`,
        };
    }, [fase]);

    const stileCaloreGradiente = useMemo(() => {
        const { sunX, sunY, intensitaCalore } = fase;
        if (intensitaCalore < 0.05) return { opacity: 0 };
        return {
            opacity: intensitaCalore * 0.55,
            background: `radial-gradient(ellipse 90% 90% at ${sunX}% ${sunY}%,
        rgba(255,120,30,0.35) 0%, rgba(255,180,60,0.15) 35%,
        rgba(255,200,80,0.04) 60%, transparent 80%)`,
        };
    }, [fase]);

    const stileCrepuscolo = useMemo(() => {
        const { sunX, luce } = fase;
        if (luce < 0.02 || luce > 0.98) return { opacity: 0 };
        return {
            opacity: Math.min(luce, 1 - luce) * 2 * 0.7,
            background: `radial-gradient(ellipse 6% 120% at ${sunX}% 50%,
        rgba(255,160,60,0.25) 0%, transparent 100%)`,
        };
    }, [fase]);

    const luminescenzaBordo = useMemo(() => {
        const { luce } = fase;
        const r = Math.round(100 + luce * 120), g = Math.round(80 + luce * 80), b = Math.round(40 + luce * 20);
        return {
            boxShadow: `
        inset 0 0 90px rgba(0,0,0,0.95),
        inset 0 0 30px rgba(0,0,0,0.8),
        0 0 ${60 + luce * 100}px ${15 + luce * 45}px rgba(${r},${g},${b},${0.06 + luce * 0.2})
      `,
        };
    }, [fase]);

    const overlayFase = useMemo(() => {
        const { luce, opacitaNotte } = fase;
        if (luce > 0.5) {
            return {
                background: 'radial-gradient(ellipse 120% 80% at 50% 110%, rgba(255, 140, 30, 0.06) 0%, transparent 70%)',
                opacity: luce,
            };
        } else if (opacitaNotte > 0.5) {
            return {
                background: 'radial-gradient(ellipse 120% 80% at 50% 110%, rgba(20, 80, 160, 0.08) 0%, transparent 70%)',
                opacity: opacitaNotte,
            };
        }
        return { opacity: 0 };
    }, [fase]);

    const opacitaStelle = Math.min(1, 0.15 + fase.opacitaNotte * 0.85 + (1 - fase.luce) * 0.5);

    return (
        <div
            className="absolute inset-0 select-none overflow-hidden"
            style={{
                background: 'radial-gradient(ellipse at 50% 0%, #0c0c1a 0%, #020208 60%, #000000 100%)',
                zIndex: 0,
            }}
        >
            <CieloStellato giorno={giorno} opacita={opacitaStelle} />
            <Terra giorno={giorno} luce={fase.luce} />

            {/* Sfera lunare */}
            <div
                className="absolute rounded-full overflow-hidden"
                style={{ width: '140vw', height: '140vw', left: '50%', top: '67vh', transform: 'translateX(-50%)', ...luminescenzaBordo }}
            >
                <canvas ref={canvasRef} width={2400} height={2400} className="absolute inset-0 w-full h-full" style={{ opacity: 0.85 }} />
                <div className="absolute inset-0 z-10 pointer-events-none" style={stileLuce} />
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 11, ...stileCaloreGradiente }} />
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 12, ...stileCrepuscolo }} />
                <div className="absolute inset-0 z-20 pointer-events-none"
                    style={{ backgroundColor: '#010106', opacity: fase.opacitaNotte }} />
                <div className="absolute inset-0 z-30 pointer-events-none rounded-full"
                    style={{ boxShadow: 'inset 0 0 140px rgba(0,0,0,0.92), inset 40px 40px 90px rgba(0,0,0,0.55)' }} />
            </div>

            {/* Overlay cromatico fase */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, ...overlayFase }} />
        </div>
    );
});
