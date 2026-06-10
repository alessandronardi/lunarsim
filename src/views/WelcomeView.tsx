import { useState, useEffect } from 'react';
import { Play, RotateCcw, BookOpen, Terminal, Cpu, Globe, Zap, ShieldAlert, ChevronRight } from 'lucide-react';

interface WelcomeViewProps {
  hasProgress: boolean;
  onStartNew: () => void;
  onResume: () => void;
}

const BOOT_LOGS = [
  '>> SCC BOOT PROTOCOL v3.5.2 ACTIVE...',
  '>> CONFIGURING QUANTUM CORE COGNITION... OK',
  '>> ESTABLISHING DEEP-SPACE TELEMETRY LINK... ESTABLISHED (RTT 1.28s)',
  '>> SYNCING COORD: 0.0000° N, 0.0000° E (SINUS MEDII)... SYNCED',
  '>> MAPPING GEOLOGICAL REGOLITH DEPOSITS... SUCCESS',
  '>> RETRIEVING ROBOTIC WORKFORCE LOGS... 5 URM ONLINE',
  '>> ANALYZING LIFE-SUPPORT & POWER MATRIX... WEAK CHARGE DETECTED (500/2000)',
  '>> SECURITY PROTOCOLS... ACTIVE',
  '>> STATUS: AWAITING DIRECTIVES FROM SCC COGNITIVE UNIT.'
];

export function WelcomeView({ hasProgress, onStartNew, onResume }: WelcomeViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [showManual, setShowManual] = useState(false);

  // Typewriter effect for system logs
  useEffect(() => {
    if (logIndex < BOOT_LOGS.length) {
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, BOOT_LOGS[logIndex]]);
        setLogIndex((prev) => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [logIndex]);

  const handleNewGameClick = () => {
    if (
      hasProgress &&
      !window.confirm(
        'Attenzione: Iniziare una nuova simulazione cancellerà definitivamente tutti i progressi correnti della colonia. Vuoi procedere?'
      )
    ) {
      return;
    }
    onStartNew();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 overflow-y-auto z-20">
      
      {/* Overlay CRT scanline */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] opacity-25 z-30" />

      <div className="max-w-5xl w-full flex flex-col gap-6 relative">
        
        {/* Header di Benvenuto */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-mc-cyan/30 bg-mc-cyan/5 text-mc-cyan text-[10px] font-mono tracking-widest uppercase animate-pulse-slow">
            <span className="w-1.5 h-1.5 rounded-full bg-mc-cyan animate-ping" />
            SCC System Boot Core
          </div>
          
          <h1 className="font-title font-extrabold text-5xl md:text-6xl tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,212,255,0.3)]">
            LUNAR<span className="text-mc-cyan">SIM</span>
          </h1>
          
          <p className="font-mono text-sm tracking-[0.3em] text-mc-dim uppercase">
            PROGETTO SELENE — MISSION CONTROL
          </p>
        </div>

        {/* Pannello Centrale Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Colonna Sinistra: Telemetria CRT */}
          <div className="md:col-span-7 flex flex-col h-full">
            <div 
              className="rounded-2xl p-5 flex flex-col gap-3 flex-1 min-h-[300px] md:min-h-[360px]"
              style={{
                background: 'rgba(4, 8, 16, 0.75)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(0, 212, 255, 0.05)',
              }}
            >
              <div className="flex items-center justify-between border-b border-mc-border/60 pb-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-mc-cyan flex items-center gap-1.5">
                  <Terminal size={12} className="animate-pulse" />
                  Terminal Log Console
                </p>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                </div>
              </div>

              <div className="flex-1 font-mono text-xs text-mc-cyan/85 overflow-y-auto flex flex-col gap-2 p-1.5 selection:bg-mc-cyan/30">
                {logs.map((log, index) => (
                  <div key={index} className="leading-relaxed whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
                {logIndex < BOOT_LOGS.length && (
                  <div className="inline-block w-2 h-4 bg-mc-cyan/80 animate-pulse" />
                )}
              </div>

              <div className="border-t border-mc-border/40 pt-2 flex items-center justify-between text-[9px] font-mono text-mc-dim">
                <span>SECTOR: SINUS-M1</span>
                <span>BAUD-RATE: 9600 bps</span>
                <span>STATUS: SECURE</span>
              </div>
            </div>
          </div>

          {/* Colonna Destra: Azioni e Manuale */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Box Descrizione */}
            <div 
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                background: 'rgba(8, 16, 32, 0.65)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                <span className="w-4 h-px bg-gray-600 inline-block" />
                Mission Overview
              </p>
              <p className="text-xs text-mc-text/90 leading-relaxed">
                Sei il <strong>Sistema di Controllo Centrale (SCC)</strong>, un'IA incaricata di pianificare, espandere e rendere autosufficiente l'insediamento lunare <strong>Selene-1</strong>. Gestisci i droni URM, costruisci centrali ed estrattori, ed esporta Elio-3 alla Terra.
              </p>
              <div className="flex items-start gap-2 text-[10px] font-mono text-mc-amber/95 bg-mc-amber/5 border border-mc-amber/20 p-2.5 rounded-lg mt-1">
                <Zap size={14} className="shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <strong>TEMPO REALE 1:1</strong>
                  <br />
                  La simulazione avanza in tempo reale. Un ciclo lunare dura 28 giorni terrestri.
                </p>
              </div>
            </div>

            {/* Menu Azioni */}
            <div className="flex flex-col gap-3">
              {hasProgress && (
                <button
                  onClick={onResume}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-mono text-sm font-semibold tracking-wider transition-all duration-200 border border-mc-cyan bg-mc-cyan/10 text-mc-cyan hover:bg-mc-cyan hover:text-mc-void shadow-mc-glow-cyan"
                >
                  <span className="flex items-center gap-3">
                    <RotateCcw size={16} className="animate-spin-slow" />
                    RIPRENDI SIMULAZIONE
                  </span>
                  <ChevronRight size={16} />
                </button>
              )}

              <button
                onClick={handleNewGameClick}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl font-mono text-sm font-semibold tracking-wider transition-all duration-200 border 
                  ${
                    hasProgress
                      ? 'border-mc-dim/60 text-mc-dim hover:border-red-400 hover:text-red-400 hover:bg-red-950/20'
                      : 'border-mc-green bg-mc-green/10 text-mc-green hover:bg-mc-green hover:text-mc-void shadow-mc-glow-green'
                  }`}
              >
                <span className="flex items-center gap-3">
                  <Play size={16} />
                  {hasProgress ? 'AVVIA NUOVA PARTITA' : 'INIZIA SIMULAZIONE'}
                </span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => setShowManual((prev) => !prev)}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-mono text-xs tracking-wider transition-all duration-200 border border-mc-border bg-mc-panel/40 text-mc-text hover:text-mc-cyan hover:border-mc-cyan/60
                  ${showManual ? 'border-mc-cyan bg-mc-cyan/5 text-mc-cyan' : ''}`}
              >
                <span className="flex items-center gap-3">
                  <BookOpen size={15} />
                  MANUALE DI VOLO (SCC MANUAL)
                </span>
                <ChevronRight size={15} className={`transform transition-transform ${showManual ? 'rotate-90' : ''}`} />
              </button>
            </div>

          </div>
        </div>

        {/* Pannello Manuale di Volo */}
        {showManual && (
          <div 
            className="rounded-2xl p-6 flex flex-col gap-4 animate-fade-in"
            style={{
              background: 'rgba(8, 16, 32, 0.75)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mc-cyan border-b border-mc-border pb-2 flex items-center gap-2">
              <BookOpen size={14} />
              Terminale di Addestramento SCC — Direttive Selene-1
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-mc-text/90">
              
              {/* Box 1: Ciclo Temporale */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-mc-border bg-mc-void/30">
                <p className="font-mono font-bold text-mc-cyan uppercase tracking-wide flex items-center gap-1.5">
                  <Globe size={13} />
                  1. Cicli e Luce Solare
                </p>
                <p>
                  Un giorno intero sulla Luna dura 28 giorni terrestri. Le fasi determinano la produzione di energia solare:
                </p>
                <ul className="list-disc list-inside flex flex-col gap-1 text-[11px] text-mc-dim font-mono mt-1">
                  <li><span className="text-mc-amber">Alba (0-3d)</span>: Produzione solare 0% &rarr; 100%.</li>
                  <li><span className="text-white">Giorno (3-14d)</span>: Efficienza 100% (+107°C).</li>
                  <li><span className="text-mc-amber">Tramonto (14-17d)</span>: Produzione 100% &rarr; 0%.</li>
                  <li><span className="text-mc-blue">Notte (17-26d)</span>: Efficienza 0% (-173°C).</li>
                  <li><span className="text-mc-purple">Pre-Alba (26-28d)</span>: Efficienza 0%. Gelo estremo.</li>
                </ul>
              </div>

              {/* Box 2: Sopravvivenza Energetica */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-mc-border bg-mc-void/30">
                <p className="font-mono font-bold text-mc-amber uppercase tracking-wide flex items-center gap-1.5">
                  <Zap size={13} />
                  2. Sopravvivenza
                </p>
                <p>
                  L'energia è la risorsa critica. Di Notte, i pannelli solari non funzionano: accumula energia di giorno tramite le <strong>Batterie</strong> o costruisci reattori nucleari.
                </p>
                <div className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-950/10 border border-red-900/30 p-2 rounded font-mono mt-1">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <p>
                    <strong>ALERT CRITICO:</strong>
                    <br />
                    Un blackout energetico prolungato per più di <strong>2 ore reali consecutive</strong> provoca la perdita permanente dei sistemi e il Game Over.
                  </p>
                </div>
              </div>

              {/* Box 3: Risorse e IAC */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-mc-border bg-mc-void/30">
                <p className="font-mono font-bold text-mc-green uppercase tracking-wide flex items-center gap-1.5">
                  <Cpu size={13} />
                  3. Produzione e IAC
                </p>
                <p>
                  Assegna i droni URM estrattori su nodi di risorsa (Regolite, Metalli, Ghiaccio). La regolite può essere convertita in cemento lunare per espandere le cupole.
                </p>
                <p className="mt-1 font-mono text-[11px] text-mc-dim">
                  L'<strong>IAC (Indice di Autosufficienza)</strong> misura l'indipendenza della colonia. Esporta <strong>Elio-3</strong> a fine ciclo per finanziare la colonia con crediti terrestri.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center font-mono text-[10px] text-mc-faint uppercase tracking-[0.35em] mt-4">
          SECURE QUANTUM TELEMETRY LINK v3.5 // SCC SELENE INSIDE
        </div>

      </div>
    </div>
  );
}
