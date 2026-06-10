# LUNARSIM — Progetto Selene

Simulatore di colonia lunare nel browser: gestisci risorse, costruisci strutture su una mappa esagonale, ricerca tecnologie e sopravvivi ai cicli lunari in **tempo reale 1:1** (28 giorni reali per ciclo).

## Requisiti

- Node.js 20+
- npm

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:5188](http://localhost:5188).

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Server di sviluppo Vite |
| `npm run build` | Typecheck + build produzione |
| `npm run preview` | Anteprima build |
| `npm run lint` | ESLint |
| `npm run test` | Test unitari (Vitest) |

## Meccaniche principali

- **Ciclo lunare**: 28 giorni reali (ALBA → GIORNO → TRAMONTO → NOTTE → PRE-ALBA)
- **Risorse**: energia, banda (uplink Terra), compute, regolite, metalli, ghiaccio, ossigeno, idrogeno, elio-3, crediti, cemento
- **Ricerca**: 8 nodi con effetti meccanici sul motore (`src/utils/researchEffects.ts`)
- **Banda**: consumo base del Nucleo; ricerche terrestri richiedono ≥ 1.5 banda; `heavy_drill` aumenta l’uplink
- **IAC**: indice di autosufficienza (0–100); export He-3 a fine ciclo → crediti (1 He-3 = 50 crediti)
- **Game over**: energia ≤ 0 per più di **2 ore** consecutive
- **Salvataggio**: progresso in `localStorage` (Zustand persist)

## Struttura codice

```
src/
  store/gameStore.ts    # Stato globale e azioni
  hooks/useGameLoop.ts  # Loop real-time + catch-up offline
  utils/gameEngine.ts   # Simulazione per ora (dtHours)
  utils/researchEffects.ts
  utils/hexUtils.ts     # Griglia 2-hex, scudo E03
  data/structures.ts    # 17 strutture MVP
  data/research.ts      # 8 ricerche MVP
  views/                # Dashboard, Colonia, R&D, Enciclopedia
```

## Licenza

Progetto privato / uso personale.
