import { useMemo } from 'react';
import { useGameStore } from './store/gameStore';
import type { ActiveView } from './types/game';
import { lunaCycleInfo, getGameDayInCycle } from './utils/gameFormulas';
import { useGameLoop } from './hooks/useGameLoop';
import { Background } from './components/Background';
import { DashboardView } from './views/DashboardView';
import { ResearchView } from './views/ResearchView';
import { ColonyView } from './views/ColonyView';
import { ConstructionsView } from './views/ConstructionsView';
import { EncyclopediaView } from './views/EncyclopediaView';
import {
  LayoutDashboard,
  Globe,
  FlaskConical,
  BookOpen,
  Zap,
  Radio,
  Cpu,
  Mountain,
  Wrench,
  Snowflake,
  Wind,
  Flame,
  Atom,
  Coins,
  Building2,
  RotateCcw,
} from 'lucide-react';

import { AlertToast } from './components/AlertToast';

// ── Navigazione ─────────────────────────────────────────────────────────────
const NAV_ITEMS: { view: ActiveView; icon: React.ReactNode; label: string }[] = [
  { view: 'DASHBOARD', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { view: 'GRIGLIA', icon: <Globe size={20} />, label: 'Griglia' },
  { view: 'EDIFICI', icon: <Building2 size={20} />, label: 'Edifici' },
  { view: 'RICERCA', icon: <FlaskConical size={20} />, label: 'R&D' },
  { view: 'ENCICLOPEDIA', icon: <BookOpen size={20} />, label: 'Archivio' },
];

// ── Segmenti della barra del ciclo lunare ────────────────────────────────────
const CYCLE_SEGMENTS = [
  { label: 'ALBA', start: 0, end: 3, fromColor: '#1a2840', toColor: '#f0a040' },
  { label: 'GIORNO', start: 3, end: 14, fromColor: '#f0a040', toColor: '#f0a040' },
  { label: 'TRAMONTO', start: 14, end: 17, fromColor: '#f0a040', toColor: '#1a2840' },
  { label: 'NOTTE', start: 17, end: 26, fromColor: '#0d1520', toColor: '#0d1520' },
  { label: 'PRE-ALBA', start: 26, end: 28, fromColor: '#0d1520', toColor: '#203040' },
] as const;

// ── Singola risorsa nell'header ───────────────────────────────────────────────
function ResourceChip({
  icon,
  value,
  label,
  warn = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className={warn ? 'text-mc-amber' : 'text-mc-dim'}>{icon}</span>
      <span
        className={`font-mono text-xs tabular-nums ${warn ? 'text-mc-amber animate-pulse-slow' : 'text-mc-text'
          }`}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ── Calcolo colore temperatura ────────────────────────────────────────────────
function tempColor(t: number): string {
  if (t > 50) return '#ff6060';
  if (t > 0) return '#f0a040';
  if (t > -100) return '#80c0ff';
  return '#6ab0ff';
}

// ── Calcolo colore pannelli solari ────────────────────────────────────────────
function panelColor(stato: string): string {
  if (stato.includes('100')) return '#00ff88';
  if (stato === 'OFFLINE') return '#ff4444';
  return '#f0a040';
}

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Avvia il loop di gioco real-time ────────────────────────────────────
  useGameLoop();
  const activeView = useGameStore(s => s.ui.activeView);
  const setActiveView = useGameStore(s => s.setActiveView);
  const res = useGameStore(s => s.resources);
  const time = useGameStore(s => s.time);
  const resetGame = useGameStore(s => s.resetGame);

  const handleReset = () => {
    if (window.confirm('Sei sicuro di voler resettare l\'intera partita? Tutti i progressi andranno persi e si ricomincerà dal Giorno 0.')) {
      resetGame();
    }
  };

  // Giorno frazionario: calcolato dal timestamp reale
  const dayFraction = getGameDayInCycle(time.gameStartTime, Date.now());

  const cycle = useMemo(() => lunaCycleInfo(dayFraction), [dayFraction]);

  const positionPct = (dayFraction / 28) * 100;
  const tempSign = cycle.temperatura > 0 ? '+' : '';

  return (
    <div className="relative flex h-full w-full text-mc-text overflow-hidden">

      {/* ── BACKGROUND DINAMICO ────────────────────────────────────── */}
      <Background />

      {/* ── SIDEBAR ───────────────────────────────────────────────── */}
      <aside className="relative z-10 flex flex-col w-14 border-r border-mc-border/60 py-3 gap-1 shrink-0"
        style={{ background: 'rgba(4,8,16,0.72)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center justify-center mb-3">
          <span className="text-mc-cyan font-title font-bold text-[10px] tracking-widest">SCC</span>
        </div>
        {NAV_ITEMS.map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            title={label}
            className={`
              flex flex-col items-center gap-1 py-2.5 px-1 mx-1 rounded
              text-[9px] font-mono uppercase tracking-wider transition-all duration-150
              ${activeView === view
                ? 'bg-mc-cyan/10 text-mc-cyan shadow-mc-glow-cyan'
                : 'text-mc-dim hover:text-mc-text hover:bg-mc-border'}
            `}
          >
            {icon}
            {label}
          </button>
        ))}

        <button
          onClick={handleReset}
          title="Nuova Partita"
          className="mt-auto flex flex-col items-center gap-1 py-2.5 px-1 mx-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-150 text-mc-dim hover:text-red-400 hover:bg-red-950/30"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </aside>

      {/* ── AREA PRINCIPALE ────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        {/* ═══════════════════════════════════════════════════════════
            HEADER — due righe
        ═══════════════════════════════════════════════════════════ */}
        <header className="shrink-0 border-b border-mc-border/60"
          style={{ background: 'rgba(4,8,16,0.78)', backdropFilter: 'blur(16px)' }}>

          {/* ── Riga 1: Ciclo Lunare ──────────────────────────────── */}
          {activeView === 'DASHBOARD' && (
            <div className="flex items-center gap-4 px-4 py-2 border-b border-mc-border/50">
  
              {/* Dati fase */}
              <div className="flex items-center gap-3 shrink-0">
                <div>
                  <p className="mc-label mb-0.5">Fase Lunare</p>
                  <p
                    className="font-title font-semibold text-sm leading-none"
                    style={{
                      color: cycle.luce > 0.5
                        ? '#f0e080'
                        : cycle.luce > 0
                          ? '#f0a040'
                          : '#4a80c0',
                    }}
                  >
                    {cycle.nomeFase}
                  </p>
                </div>
                <div className="mc-divider w-px h-8 rotate-0 border-l border-mc-border" />
                <div>
                  <p className="mc-label mb-0.5">Temperatura</p>
                  <p
                    className="font-mono text-sm font-bold"
                    style={{ color: tempColor(cycle.temperatura) }}
                  >
                    {tempSign}{cycle.temperatura.toFixed(0)}°C
                  </p>
                </div>
                <div className="mc-divider w-px h-8 border-l border-mc-border" />
                <div>
                  <p className="mc-label mb-0.5">Pannelli Solari</p>
                  <p
                    className="font-mono text-xs font-semibold"
                    style={{ color: panelColor(cycle.statoEnergia) }}
                  >
                    {cycle.statoEnergia}
                  </p>
                </div>
                <div className="mc-divider w-px h-8 border-l border-mc-border" />
                <div>
                  <p className="mc-label mb-0.5">Giorno / Ciclo</p>
                  <p className="font-mono text-sm">
                    <span className="text-mc-cyan font-bold">{Math.floor(dayFraction)}</span>
                    <span className="text-mc-dim">/28</span>
                    <span className="text-mc-dim ml-2">C</span>
                    <span className="text-mc-text font-bold">{time.cycle}</span>
                  </p>
                </div>
              </div>
  
              {/* Barra ciclo lunare */}
              <div className="flex-1 relative min-w-0">
                {/* Track */}
                <div className="relative h-2 rounded-full overflow-hidden flex">
                  {CYCLE_SEGMENTS.map(seg => (
                    <div
                      key={seg.label}
                      title={seg.label}
                      className="h-full"
                      style={{
                        width: `${((seg.end - seg.start) / 28) * 100}%`,
                        background: `linear-gradient(to right, ${seg.fromColor}, ${seg.toColor})`,
                      }}
                    />
                  ))}
                </div>
  
                {/* Indicatore posizione attuale */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ left: `${positionPct}%` }}
                >
                  {/* Linea verticale */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-px h-4 bg-mc-cyan shadow-mc-glow-cyan" />
                  {/* Dot */}
                  <div className="w-3 h-3 rounded-full border-2 border-mc-cyan bg-mc-void shadow-mc-glow-cyan" />
                </div>
  
                {/* Etichette fasi sotto la barra */}
                <div className="flex mt-1" aria-hidden>
                  {CYCLE_SEGMENTS.map(seg => (
                    <div
                      key={seg.label}
                      className="text-center"
                      style={{ width: `${((seg.end - seg.start) / 28) * 100}%` }}
                    >
                      <span className="text-[8px] font-mono text-mc-dim/60 uppercase tracking-wider">
                        {seg.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
  
              {/* Indicatore luce (barra verticale) */}
              <div className="shrink-0 flex flex-col items-center gap-0.5" title="Intensità luce solare">
                <span className="mc-label text-[8px]">LUX</span>
                <div className="w-1.5 h-8 rounded-full bg-mc-border overflow-hidden flex flex-col-reverse">
                  <div
                    className="w-full rounded-full transition-all duration-1000"
                    style={{
                      height: `${cycle.luce * 100}%`,
                      background: cycle.luce > 0.5
                        ? 'linear-gradient(to top, #f0a040, #fff5aa)'
                        : 'linear-gradient(to top, #1a3060, #4a80c0)',
                    }}
                  />
                </div>
                <span className="font-mono text-[8px] text-mc-dim">{Math.round(cycle.luce * 100)}%</span>
              </div>
            </div>
          )}

          {/* ── Riga 2: Risorse ─────────────────────────────────────── */}
          {activeView !== 'DASHBOARD' && (
            <div className="flex items-center gap-4 px-4 py-1.5 flex-wrap">
              <ResourceChip icon={<Zap size={12} />} value={res.energy} label="Energia" warn={res.energy < 50} />
              <span className="text-mc-border">│</span>
              <ResourceChip icon={<Radio size={12} />} value={res.bandwidth} label="Banda" />
              <ResourceChip icon={<Cpu size={12} />} value={res.compute} label="Calcolo" />
              <span className="text-mc-border">│</span>
              <ResourceChip icon={<Mountain size={12} />} value={res.regolith} label="Regolite" warn={res.regolith < 20} />
              <ResourceChip icon={<Wrench size={12} />} value={res.metals} label="Metalli" warn={res.metals < 20} />
              <ResourceChip icon={<Snowflake size={12} />} value={res.ice} label="Ghiaccio" warn={res.ice < 10} />
              <span className="text-mc-border">│</span>
              <ResourceChip icon={<Wind size={12} />} value={res.oxygen} label="Ossigeno" />
              <ResourceChip icon={<Flame size={12} />} value={res.hydrogen} label="Idrogeno" />
              <ResourceChip icon={<Atom size={12} />} value={res.helium3} label="Elio-3" />
              <span className="text-mc-border">│</span>
              <ResourceChip icon={<Coins size={12} />} value={res.credits} label="Crediti" />
              <ResourceChip icon={<Building2 size={12} />} value={res.cement} label="Cemento" />
            </div>
          )}
        </header>

        {/* ── Contenuto vista ─────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
          {activeView === 'DASHBOARD' && <DashboardView />}
          {activeView === 'GRIGLIA' && <ColonyView />}
          {activeView === 'EDIFICI' && <ConstructionsView />}
          {activeView === 'RICERCA' && <ResearchView />}
          {activeView === 'ENCICLOPEDIA' && <EncyclopediaView />}
          {activeView !== 'DASHBOARD' && activeView !== 'GRIGLIA' && activeView !== 'EDIFICI' && activeView !== 'RICERCA' && activeView !== 'ENCICLOPEDIA' && (
            <div className="flex items-center justify-center h-full">
              <div className="mc-card p-8 text-center opacity-40">
                <p className="mc-label mb-2">Vista attiva</p>
                <p className="font-title text-2xl text-mc-cyan">{activeView}</p>
                <p className="text-mc-dim text-sm mt-2 font-mono">— in costruzione —</p>
              </div>
            </div>
          )}
        </main>
        <AlertToast />
      </div>
    </div>
  );
}
