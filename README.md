# LUNARSIM — Progetto Selene

Simulatore di colonia lunare in tempo reale nel browser. Gestisci le risorse, costruisci strutture su una mappa esagonale procedurale, ricerca tecnologie ed evita il blackout durante la rigida notte lunare. 

Il simulatore adotta un modello **in tempo reale 1:1** in cui un ciclo lunare completo dura **28 giorni reali** (~84 minuti reali per ciclo accelerato di test o 28 giorni effettivi in base alla configurazione temporale). Integra inoltre un sistema di **catch-up offline** che calcola accuratamente la produzione e i consumi accumulati durante l'assenza del giocatore.

---

## 🚀 Requisiti e Avvio

- **Node.js** v20+
- **npm** v10+

### Installazione e Sviluppo
```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo locale (Vite)
npm run dev

# Esegui i test unitari (Vitest)
npm run test

# Esegui il build per la produzione
npm run build
```

Apri [http://localhost:5188](http://localhost:5188) (o la porta specificata da Vite) per accedere alla console di controllo.

---

## 🎮 Meccaniche Principali

### 1. Il Ciclo Lunare (28 Giorni)
Il clima e l'efficienza energetica della colonia dipendono dall'ora locale del sole sulla Luna:
*   **ALBA** (Giorni 0–3): Efficienza solare da 0% a 100% lineare. Temperatura in graduale aumento.
*   **GIORNO PIENO** (Giorni 3–14): Efficienza solare al 100%. Temperature fino a +107°C. L'estrazione di ghiaccio nelle zone non in ombra subisce una penalità del 30% per sublimazione.
*   **TRAMONTO** (Giorni 14–17): Efficienza solare da 100% a 0% lineare. Temperatura in calo.
*   **NOTTE PROFONDA** (Giorni 17–26): Efficienza solare al 0%. Temperatura glaciale di -173°C. Le strutture non riparate o sprovviste di uno **Scudo Termico Modulare** (`STR-E03`) adiacente subiscono danni da freddo pari a **0.5 HP/ora** (ridotti del 50% con la ricerca *Mitigazione Regolite*).
*   **PRE-ALBA** (Giorni 26–28): Efficienza solare al 0% (in rapido riavvio lineare). Temperatura a -173°C. Preparativi termici all'insolazione.

### 2. Gestione Logistica Droni (URM)
I droni (Unità Robotiche Modulari) sono la forza lavoro della base.
*   **Saturazione ed Efficienza**: L'assegnazione dei droni alle strutture ne moltiplica la resa produttiva:
    *   `0 URM`: 1.0x (funzionamento base automatizzato)
    *   `1 URM`: 1.2x (+20% di efficienza)
    *   `2 URM`: 1.5x (+50% di efficienza)
    *   `Ogni URM addizionale`: +30% lineare (es. 3 URM = 1.8x, 4 URM = 2.1x)
*   **Costruzione**: Possono essere costruiti passivamente nell'**Officina URM** (`STR-E02`) o ordinati istantaneamente nel **Nucleo Base** (`STR-A01`) spendendo `50 Regolite`, `50 Metalli` e `100 Crediti`.

### 3. Indice IAC (Autosufficienza Coloniale)
L'obiettivo della partita è raggiungere il **100% dell'IAC**, calcolato come media pesata di 6 parametri vitali:
1.  **Autonomia Energetica** (25%): Carica delle batterie e stabilità energetica.
2.  **Autosufficienza Idrica** (15%): Presenza di criotrivelle attive e scorte di ghiaccio.
3.  **Supporto Vitale e Cibo** (15%): Produzione di ossigeno e idrogeno tramite elettrolisi e serre idroponiche.
4.  **Capacità Mineraria** (20%): Livello complessivo di regolite e metalli stoccati.
5.  **Ricerca Autonoma** (15%): Potenza di calcolo (Compute) generata localmente.
6.  **Export Strategico di Elio-3** (10%): Quantità di He-3 esportata sulla Terra durante il ciclo corrente.

### 4. Condizioni di Game Over
Se l'energia elettrica immagazzinata scende a **0 W** per più di **2 ore reali consecutive**, i sistemi vitali del Mainframe collassano causando il **Game Over**.

---

## 📡 Rete e Banda (Bandwidth)
Tutte le strutture esterne al Nucleo Base richiedono la copertura del segnale radio a terra per funzionare.
*   **Produzione Banda**: Il **Nucleo Base** genera una banda di uplink iniziale di **1.75 GHz**, espandibile fino a **+7.0 GHz** potenziando il livello del Mainframe (Livelli 1–5). La ricerca *Trivellazione Profonda* fornisce ulteriori **+0.8 GHz**.
*   **Consumo Banda**: Ciascun URM attivo consuma **0.2 GHz** per la telemetria RF. Il Mainframe consuma **0.25 GHz** costanti.
*   **Ricerche Terrestri**: Avviare una ricerca sul ramo Terrestre richiede una banda libera pari o superiore a **1.5 GHz**. Se la banda scende sotto tale soglia, la ricerca viene temporaneamente sospesa.

---

## 🔬 Albero delle Ricerche (14 Tecnologie)

Le tecnologie sono suddivise in due rami scientifici:

### Ramo Lunare (Richiede potenza di Calcolo locale)
1.  **Ottimizzazione Cella PEM** (`fuel_cell`): Incrementa l'output delle celle a combustibile (`STR-B04`) del 50%. *[Tier 1, Costo: 150 Crediti, 50 Calcolo, Tempo: 8 ore]*
2.  **Mitigazione Regolite & Cicli Termici** (`dust_heat_resistance`): Dimezza i danni da freddo notturno (-50%) su tutte le strutture non schermate. *[Tier 1, Costo: 100 Crediti, 30 Calcolo, Tempo: 6 ore]*
3.  **Distillazione Criogenica Elio-3** (`helium3_extraction`): Incrementa la resa estrattiva di Elio-3 (`STR-C05`) del 50%. *[Tier 2, Costo: 500 Crediti, 200 Calcolo, Tempo: 32 ore. Richiede: fuel_cell]*
4.  **Sinterizzazione a Microonde Regolite** (`advanced_regolith_conversion`): Ottimizza i magnetron industriali, incrementando la produzione di cemento di `STR-C06` del 50%. *[Tier 2, Costo: 400 Crediti, 150 Calcolo, Tempo: 24 ore. Richiede: dust_heat_resistance]*
5.  **Sintesi Computazionale Autonoma** (`autonomous_lab`): Distribuisce agenti AI decisionali, aumentando il Calcolo generato da tutte le strutture del 20%. *[Tier 3, Costo: 2500 Crediti, 1000 Calcolo, Tempo: 160 ore. Richiede: helium3_extraction]*
6.  **Manifattura Additiva DMLS Avanzata** (`autonomous_urm_production`): Dimezza i tempi di assemblaggio passivo dei droni nell'Officina `STR-E02` (da 4 a 2 ore reali per drone). *[Tier 3, Costo: 2500 Crediti, 1000 Calcolo, Tempo: 160 ore. Richiede: advanced_regolith_conversion]*
7.  **ECLSS a Circuito Semichiuso** (`human_life_support`): Sblocca il blueprint della **Serra Idroponica** (`STR-E04`). *[Tier 2, Costo: 800 Crediti, 350 Calcolo, Tempo: 48 ore. Richiede: fuel_cell]*
8.  **CELSS a Circuito Chiuso Completo** (`closed_loop_ecology`): Sblocca il blueprint del **Modulo Abitativo Coloni** (`STR-E05`). *[Tier 3, Costo: 3000 Crediti, 1200 Calcolo, Tempo: 180 ore. Richiede: human_life_support]*
9.  **Pirolisi del Vento Solare** (`regolith_hydrogen_extraction`): Sblocca il blueprint del **Pirolizzatore di Regolite** (`STR-C08`). *[Tier 2, Costo: 600 Crediti, 250 Calcolo, Tempo: 32 ore. Richiede: heavy_drill]*

### Ramo Terrestre (Richiede invio dati su Banda ≥ 1.5 GHz)
10. **Trivellazione Rotopercussiva Profonda** (`heavy_drill`): Aumenta del 30% la resa estrattiva di metalli/regolite delle trivelle pesanti (`STR-C02`) e aggiunge **+0.8 GHz** di banda uplink terrestre dedicata. *[Tier 1, Costo: 200 Crediti, 75 Calcolo, Tempo: 10 ore]*
11. **Cogenerazione Fissione Kilopower** (`nuclear_reactor`): Il Reattore Nucleare (`STR-B03`) eroga sempre il 100% dell'energia (+60/h) in modo autonomo, eliminando la necessità di droni assegnati. *[Tier 2, Costo: 750 Crediti, 300 Calcolo, Tempo: 40 ore. Richiede: heavy_drill]*
12. **Cogenerazione Stoichiometrica H₂/O₂** (`advanced_hydrogen_combustion`): Sblocca il blueprint della **Centrale Termochimica a Idrogeno** (`STR-B06`). *[Tier 2, Costo: 800 Crediti, 350 Calcolo, Tempo: 48 ore. Richiede: fuel_cell]*
13. **Sonde Termoelettriche Deep-Well** (`geothermal_regolith_power`): Sblocca il blueprint del **Generatore Termo-Regolite** (`STR-B05`). *[Tier 2, Costo: 1000 Crediti, 450 Calcolo, Tempo: 60 ore. Richiede: heavy_drill]*
14. **Leghe Seleniche Ultra-Leggere** (`antigravity_materials`): Sblocca la **Fonderia Laser** (`STR-C07`) e lo **Spazioporto Commerciale** (`STR-E06`). *[Tier 3, Costo: 4000 Crediti, 1600 Calcolo, Tempo: 240 ore. Richiede: nuclear_reactor]*

---

## 🏢 Catalogo Strutture (25 Edifici)

Le strutture sono suddivise per categoria operativa. I valori di produzione e consumo sono espressi **per ora reale** a efficienza nominale (100%):

### 📶 Controllo & Segnale
*   **Nucleo Base (Mainframe)** (`STR-A01`): Posizionato fisso in coordinate (0,0). Produce **+4 Calcolo/h**, consuma **10 W/h**. Raggio di segnale: 3 hex. Offre 5 livelli di upgrade del mainframe per estendere la banda a terra.
*   **Ripetitore di Segnale** (`STR-A02`): Estende la rete di **+2 hex** (incrementato a **+3 hex** se costruito su terreno RILIEVO). Consuma **4 W/h**. *[Costo: 20 Regolite, 10 Metalli | 1 URM ottimale]*

### ⚡ Energia
*   **Pannello Solare** (`STR-B01`): Produce fino a **+20 W/h** durante il Giorno Pieno. Inattivo di notte. *[Costo: 30 Metalli | 2 URM ottimali]*
*   **Batterie di Accumulo** (`STR-B02`): Stocca l'energia in eccesso (fino a **500 W**). Consuma **2 W/h** per il riscaldamento interno delle celle. *[Costo: 40 Metalli, 80 Crediti | 1 URM ottimale]*
*   **Reattore Nucleare** (`STR-B03`): Produce **+60 W/h** costanti. Occupa **2 hex**. Se non ricercato *Kilopower*, richiede 3 URM (sotto i 2 droni la produzione cala al 60%). *[Costo: 500 Crediti, 100 Metalli | 3 URM ottimali]*
*   **Cella a Combustibile (H₂)** (`STR-B04`): Generatore di emergenza notturno (si attiva se Energia < 30 W). Consuma **2/h di Idrogeno** per generare **+25 W/h**. *[Costo: 60 Metalli, 150 Crediti | 2 URM ottimali]*
*   **Micro-Cella a Combustibile** (`STR-B00`): Generatore ausiliario notturno (si attiva se Energia < 150 W). Consuma **0.5/h di Idrogeno** per generare **+8 W/h**. *[Costo: 30 Metalli, 40 Crediti | 1 URM ottimale]*
*   **Generatore Termo-Regolite** (`STR-B05`): Sfrutta l'escursione termica superficiale e profonda per generare **+35 W/h** costanti. *[Costo: 100 Metalli, 250 Crediti, 20 Cemento | 1 URM ottimale]*
*   **Centrale Termochimica a Idrogeno** (`STR-B06`): Generatore end-game (si attiva se Energia < 150 W). Consuma **8/h di Idrogeno** e **4/h di Ossigeno** per erogare **+150 W/h**. Occupa **2 hex**. *[Costo: 160 Metalli, 400 Crediti, 30 Cemento | 3 URM ottimali]*

### ⛏ Estrazione & Produzione
*   **Trivella Base** (`STR-C01`): Estrae **+10 Regolite/h** e **+5 Metalli/h**. Consuma **8 W/h**. Bonus x1.5 per metalli su CRATERE. *[Costo: 40 Metalli | 3 URM ottimali]*
*   **Trivella Pesante** (`STR-C02`): Versione industriale. Estrae **+30 Regolite/h** e **+15 Metalli/h** (incrementabili del 30% con ricerca). Consuma **20 W/h**. *[Costo: 300 Crediti, 80 Metalli | 5 URM ottimali]*
*   **Estrattore di Ghiaccio** (`STR-C03`): Estrae **+8 Ghiaccio/h** se posizionato su depositi di ghiaccio. Resa x1.5 su OMBRA_PERMANENTE; penalità x0.7 di Giorno su terreni soleggiati. Consuma **10 W/h**. *[Costo: 50 Metalli | 3 URM ottimali]*
*   **Elettrolizzatore** (`STR-C04`): Consuma **3 Ghiaccio/h** per produrre **+4 Ossigeno/h** e **+4 Idrogeno/h**. Consuma **12 W/h**. *[Costo: 60 Metalli, 100 Crediti | 2 URM ottimali]*
*   **Miniera Elio-3** (`STR-C05`): Raccoglie **+5 Elio-3/h** (efficienza dimezzata di notte). Consuma **15 W/h**. *[Costo: 400 Crediti, 120 Metalli | 4 URM ottimali]*
*   **Convertitore Regolite** (`STR-C06`): Consuma **8 Regolite/h** per fabbricare **+12 Cemento/h**. Consuma **14 W/h**. *[Costo: 100 Regolite, 50 Metalli | 3 URM ottimali]*
*   **Fonderia Laser** (`STR-C07`): Sinterizza regolite per produrre **+15 Metalli/h** e **+2 Elio-3/h** consumando **20 Regolite/h**. Consuma **25 W/h**. *[Costo: 200 Metalli, 400 Crediti, 40 Cemento | 3 URM ottimali]*
*   **Pirolizzatore di Regolite** (`STR-C08`): Riliberazione termica. Consuma **15 Regolite/h** per generare **+6 Idrogeno/h**. Consuma **12 W/h**. *[Costo: 90 Metalli, 180 Crediti | 2 URM ottimali]*

### 💻 Ricerca & Elaborazione
*   **Mainframe Avanzato** (`STR-D01`): Server neuromorfico locale. Genera **+20 Calcolo/h**. Consuma **15 W/h**. *[Costo: 200 Crediti, 60 Metalli | 2 URM ottimali]*
*   **Laboratorio di Ricerca Lunare** (`STR-D02`): Genera **+50 Calcolo/h** (con bonus +20% di notte per raffreddamento passivo dei processori). Velocizza tutte le ricerche attive del **50% (moltiplicatore x1.5)**. Occupa **2 hex**. Consuma **25 W/h**. *[Costo: 350 Crediti, 90 Metalli, 20 Cemento | 4 URM ottimali]*

### 🧱 Infrastruttura
*   **Deposito Centralizzato** (`STR-E01`): Raddoppia la capacità massima di stoccaggio delle risorse fisiche (base 200, raddoppia cumulativamente per ogni deposito attivo: 200 -> 400 -> 800...). Consuma **2 W/h**. *[Costo: 60 Regolite, 20 Metalli | 1 URM ottimale]*
*   **Officina di Produzione URM** (`STR-E02`): Fabbrica passivamente droni (1 drone ogni 4 ore reali, ridotto a 2 ore reali con ricerca *Manifattura Additiva*). Consuma **18 W/h**. *[Costo: 150 Metalli, 250 Crediti, 30 Cemento | 3 URM ottimali]*
*   **Scudo Termico Modulare** (`STR-E03`): Emette una barriera termica protettiva attiva di notte. Protegge dal gelo notturno l'hex su cui risiede e **tutti gli hex adiacenti**, azzerando i danni criogenici delle strutture vicine. Consuma **10 W/h** (attivo solo di notte). *[Costo: 70 Metalli, 200 Crediti | 2 URM ottimali]*
*   **Serra Idroponica** (`STR-E04`): Produce **+8 Ossigeno/h** consumando **5 Ghiaccio/h**. Consuma **8 W/h**. *[Costo: 80 Metalli, 200 Crediti, 15 Cemento | 2 URM ottimali]*
*   **Modulo Abitativo Coloni** (`STR-E05`): Genera **+40 Calcolo/h** e **+30 Crediti/h** consumando **6 Ossigeno/h** e **+4 Ghiaccio/h**. Se mancano le risorse vitali di supporto, subisce **8 HP di danno all'ora** per asfissia/disidratazione. Occupa **2 hex**. Consuma **20 W/h**. *[Costo: 150 Metalli, 500 Crediti, 50 Cemento | 4 URM ottimali]*
*   **Spazioporto Commerciale** (`STR-E06`): Import/export di materiali. Genera **+100 Crediti/h** consumando **10 Idrogeno/h** come propellente di lancio. Occupa **2 hex**. Consuma **15 W/h**. *[Costo: 300 Metalli, 800 Crediti, 80 Cemento | 2 URM ottimali]*

---

## 📡 Integrazione AI (Com-Link Houston)

Il gioco integra una connessione radio diretta in tempo reale con il **Controllo Missione Houston** basato su **Gemini API** (tramite un proxy sicuro `/api/chat`).
*   **Uplink Telemetrico**: Houston riceve telemetricamente e analizza lo stato della colonia: energia, risorse critiche in esaurimento, temperatura esterna, ricerche in corso e integrità degli edifici.
*   **Supporto Strategico**: È possibile chattare direttamente con il Direttore di Volo a Houston per chiedere consigli su come superare la Notte Profonda o bilanciare l'economia.
*   **Log di Colonia Immersionale**: Ad ogni cambio giorno, viene generato un messaggio nel registro delle comunicazioni radio che descrive le operazioni quotidiane della colonia in perfetto gergo aerospaziale. Se la chiave API non è configurata, il gioco utilizza un algoritmo procedurale di ripiego per garantire l'immersività offline.

---

## 📁 Struttura del Progetto

La logica del simulatore è rigorosamente disaccoppiata dall'interfaccia utente:

```
LUNARSIM/
├── api/
│   └── chat.ts             # Vercel serverless proxy per le chiamate sicure a Gemini API
├── src/
│   ├── store/
│   │   ├── gameStore.ts    # Stato di gioco Zustand, azioni atomiche e persistenza
│   │   └── gameStore.test  # Test unitari dello store
│   ├── hooks/
│   │   ├── useGameLoop.ts  # Gestore del loop temporale passivo e catch-up offline
│   │   └── useHydration.ts # Gestore dell'idratazione dello store persistito
│   ├── utils/
│   │   ├── gameEngine.ts   # Motore di simulazione temporale (calcolo del delta-time dtHours)
│   │   ├── gameFormulas.ts # Formule matematiche del ciclo lunare, saturazione droni e clima
│   │   ├── geminiService.ts# Servizio di integrazione e prompt system per Gemini API
│   │   ├── hexUtils.ts     # Calcoli spaziali su griglia esagonale e coperture scudi
│   │   ├── iacCalculator.ts# Calcolo dell'indice IAC e bilancio export di fine ciclo
│   │   └── researchEffects.ts # Mappatura ed effetti meccanici dei nodi tecnologici sbloccati
│   ├── data/
│   │   ├── structures.ts   # Catalogo statico delle 25 strutture MVP
│   │   └── research.ts     # Catalogo statico dei 14 nodi tecnologici
│   ├── components/
│   │   ├── Background.tsx  # Background procedurale (canvas orizzonte curvo + terminatore luce)
│   │   ├── SidePanel.tsx   # Pannello laterale informativo di dettaglio hex, costruzione e riparazione
│   │   ├── AIUplinkPanel.ts# Console radio per comunicare in com-link con Houston
│   │   ├── HexCellShape.tsx# Rendering interattivo degli esagoni della griglia tattica
│   │   └── ...             # Altri elementi UI (Toast, resource chip, indicatori grafici)
│   ├── views/
│   │   ├── DashboardView   # Overview colonia, grafici di produzione e temperature
│   │   ├── ColonyView      # Mappa tattica a griglia esagonale a tutto schermo
│   │   ├── ConstructionsView# Catalogo per la costruzione degli edifici
│   │   ├── ResearchView    # Albero tecnologico sdoppiato R&D
│   │   ├── EncyclopediaView# Documentazione di lore, registri radio e file tecnici
│   │   └── WelcomeView     # Schermata iniziale di splash (Nuova Partita / Continua)
│   ├── types/
│   │   └── game.ts         # Tipizzazioni TypeScript rigide dello stato e dei modelli di gioco
│   ├── App.tsx             # Entrypoint principale dell'applicazione React e barra di navigazione
│   ├── main.tsx            # Inizializzatore React DOM
│   └── index.css           # Design system CSS (Mission Control theme, variabili colore)
```

---

## 🛡 Licenza

Progetto privato ad uso personale. Sviluppato per simulazioni gestionali tattiche di colonizzazione lunare.
