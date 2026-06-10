import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { processUpdate } from '../utils/gameEngine';
import { calculateIAC } from '../utils/iacCalculator';

/**
 * useGameLoop — hook singleton da montare una sola volta in App.tsx.
 * Modello Idle/Catch-up puro: le risorse e lo stato temporale si aggiornano
 * all'apertura del gioco (catch-up offline), quando la scheda torna visibile,
 * o a seguito di azioni dirette del giocatore.
 */
export function useGameLoop() {
    const storeRef = useRef(useGameStore.getState());

    useEffect(() => {
        const unsub = useGameStore.subscribe(s => { storeRef.current = s; });

        // ── Catch-up all'apertura o al mount ──────────────────────────────────
        const triggerCatchUp = () => {
            const state = useGameStore.getState();
            if (state.gameOver || state.paused) return;

            const now = Date.now();
            const lastUpdate = state.time.lastUpdateTime;
            const offlineMs = now - lastUpdate;

            if (offlineMs > 2000) { // più di 2 secondi → c'è stato tempo offline
                const offlineHours = offlineMs / 3_600_000;
                console.log(`[GameLoop] Catch-up offline di ${offlineHours.toFixed(2)} ore`);

                const chunkHours = 1; // 1 ora per chunk
                let remainingHours = offlineHours;
                let currentUpdateTime = lastUpdate;

                while (remainingHours > 0) {
                    const dt = Math.min(chunkHours, remainingHours);
                    const currentState = useGameStore.getState();
                    if (currentState.gameOver) break;

                    const result = processUpdate(currentState, dt);
                    currentState.applyUpdateResult(result);

                    currentUpdateTime += dt * 3_600_000;
                    const { newCycleStarted } = currentState.updateTime(currentUpdateTime);
                    if (newCycleStarted) {
                        currentState.processEndOfCycle();
                    }

                    remainingHours -= dt;
                }

                // Assicurati che l'ora dell'ultimo update sia esattamente "now"
                const finalState = useGameStore.getState();
                finalState.updateTime(now);
                finalState.updateIAC(calculateIAC(finalState));
            }
        };

        // Esegui subito al mount
        triggerCatchUp();

        // ── Aggiornamento quando la scheda torna visibile ─────────────────────
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[GameLoop] Scheda visibile, avvio refresh dello stato...');
                useGameStore.getState().refreshState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            unsub();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []); // mount-once
}
