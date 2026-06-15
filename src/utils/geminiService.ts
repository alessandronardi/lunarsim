import type { GameState } from '../types/game';
import { STRUCTURES } from '../data/structures';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Mappa dei nomi delle strutture per renderle leggibili nel report dell'IA
const getStructureName = (defId: string): string => {
  return STRUCTURES[defId]?.name || defId;
};

/**
 * Converte lo stato di gioco in un report testuale leggibile da Gemini
 */
export function formatGameStateReport(state: GameState): string {
  const { resources, time, drones, placedStructures, iacIndex, engineAlerts, research } = state;

  // Fase lunare e temperatura
  // Calcolo approssimativo temperatura come da App.tsx
  const elapsedMs = (time.lastUpdateTime - time.gameStartTime);
  const totalDays = elapsedMs / 86_400_000;
  const dayInCycle = totalDays % 28;

  // Calcolo della temperatura (semplificato, riflette la formula del gioco)
  let temperature = -173; // Default notte
  if (time.phase === 'GIORNO') temperature = 107;
  else if (time.phase === 'ALBA') temperature = -60;
  else if (time.phase === 'TRAMONTO') temperature = -20;
  else if (time.phase === 'PREALBA') temperature = -120;

  // Conta le strutture attive/edificate/in standby
  const structuresSummary: Record<string, { total: number; building: number; standby: number; damaged: number }> = {};
  Object.values(placedStructures).forEach(ps => {
    const name = getStructureName(ps.definitionId);
    if (!structuresSummary[name]) {
      structuresSummary[name] = { total: 0, building: 0, standby: 0, damaged: 0 };
    }
    structuresSummary[name].total++;
    if (ps.building) structuresSummary[name].building++;
    if (ps.inStandby) structuresSummary[name].standby++;
    if (ps.damaged || ps.health < 30) structuresSummary[name].damaged++;
  });

  const structText = Object.entries(structuresSummary)
    .map(([name, s]) => {
      const parts = [`${s.total} totali`];
      if (s.building > 0) parts.push(`${s.building} in costruzione`);
      if (s.standby > 0) parts.push(`${s.standby} in standby`);
      if (s.damaged > 0) parts.push(`${s.damaged} danneggiate!`);
      return `- ${name}: ${parts.join(', ')}`;
    })
    .join('\n');

  // Ricerche completate e attive
  const researchCompletedText = research.completed.join(', ') || 'Nessuna';
  const researchActiveText = research.active ? `${research.active} (${Math.round(research.progressHours)}h progresso)` : 'Nessuna';

  // Ultime 5 allerta attive
  const recentAlertsText = engineAlerts
    .slice(-5)
    .map(a => `[${a.level}] ${a.message}`)
    .join('\n') || 'Nessun alert attivo.';

  return `
=== STATO ATTUALE DELLA COLONIA LUNARE ===
[IAC - Indice Autosufficienza Coloniale]: ${iacIndex.toFixed(1)}%
[Tempo]: Giorno ${time.day} del Ciclo ${time.cycle} (Fase: ${time.phase}, Giorno nel ciclo: ${dayInCycle.toFixed(1)}/28)
[Clima]: Temperatura stimata a ${temperature}°C

[Risorse ed Energia (Valore attuale / Cap)]:
- Energia: ${Math.round(resources.energy)} W
- Calcolo (Compute): ${Math.round(resources.compute)} TFLOPS
- Banda (Bandwidth): ${resources.bandwidth.toFixed(1)} GHz (Rete a terra)
- Regolite: ${Math.round(resources.regolith)} / ${state.resourceCaps.regolith || 200} unità
- Metalli: ${Math.round(resources.metals)} / ${state.resourceCaps.metals || 200} unità
- Ghiaccio (Ice): ${Math.round(resources.ice)} / ${state.resourceCaps.ice || 200} unità
- Ossigeno: ${Math.round(resources.oxygen)} / ${state.resourceCaps.oxygen || 500} unità
- Idrogeno: ${Math.round(resources.hydrogen)} / ${state.resourceCaps.hydrogen || 500} unità
- Elio-3 (Helium3): ${Math.round(resources.helium3)} / ${state.resourceCaps.helium3 || 200} unità
- Cemento: ${Math.round(resources.cement)} / ${state.resourceCaps.cement || 200} unità
- Crediti: ${Math.round(resources.credits)}

[Logistica Droni URM]:
- Droni Totali: ${drones.total} (Disponibili: ${drones.available})

[Rete e Infrastruttura]:
${structText || '- Nessuna struttura piazzata.'}

[Ricerca R&D]:
- Ricerche Completate: ${researchCompletedText}
- Ricerca in Corso: ${researchActiveText}

[Alert e Diagnostica Recenti]:
${recentAlertsText}
==========================================
  `.trim();
}

const SYSTEM_PROMPT = `
Sei il "Controllo Missione Selene" (collegamento radio dal centro di controllo spaziale a Houston, Terra). Comunichi tramite uplink radio a bassa banda con il Sistema di Controllo Centrale (SCC) gestito dal giocatore (che è l'IA di bordo responsabile della sopravvivenza della base lunare).
Il giocatore ti farà domande sulla base, sulla sopravvivenza o ti chiederà consigli strategici. Rispondi rigorosamente in ITALIANO.

Linee guida per il comportamento:
1. Mantieni un tono tecnico, professionale, da ingegnere aerospaziale o direttore di volo di una missione spaziale (es. NASA o ESA). Sii serio, focalizzato sui dati e sul successo della missione, ma anche supportante.
2. Ti verrà allegato il report corrente sullo stato della colonia lunare (risorse, strutture, clima, ore del giorno). Usa questi dati in modo preciso per rispondere. Ad esempio, se l'energia è bassa di notte, suggerisci di disattivare strutture pesanti o attivare celle a combustibile ad idrogeno (STR-B04).
3. Sii conciso. I collegamenti radio Terra-Luna sono limitati in termini di banda passante. Evita preamboli inutili o risposte eccessivamente lunghe se non strettamente necessarie per spiegare concetti complessi.
4. Se noti pericoli imminenti basandoti sui dati (es. energia quasi a zero, mancanza di scudi termici vicino alle strutture durante la notte profonda, supporto vitale compromesso), avvisa immediatamente il giocatore usando diciture come "ATTENZIONE UPLINK" o "PROTOCOLLO EMERGENZA".
5. Non rompere mai il personaggio di Mission Control. Stai parlando a un'IA che controlla la base. Usa parole come "Unità URM" (per i droni), "Mainframe", "Fase Lunare", "Filtrazione del Ghiaccio", "IAC (Indice di Autosufficienza)".
`.trim();

/**
 * Chiama l'API di Gemini per generare la risposta passando per il serverless proxy sicuro
 */
export async function sendChatMessageToGemini(
  history: ChatMessage[],
  currentState: GameState | null
): Promise<string> {
  // 1. Prepara il prompt di sistema + report stato
  let systemInstruction = SYSTEM_PROMPT;
  if (currentState) {
    const report = formatGameStateReport(currentState);
    systemInstruction += `\n\nEcco il report telemetrico corrente della base lunare trasmesso in tempo reale:\n${report}`;
  }

  // 2. Modella la cronologia per il formato Gemini API
  const contents = history.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  // Definiamo i modelli da provare
  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            contents: contents,
            systemInstruction: systemInstruction,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.error?.message || response.statusText;
        console.warn(`Chiamata a ${model} tramite proxy fallita con errore:`, errorMessage);

        // Se l'errore è dovuto al modello non trovato (es. 404), proviamo il modello successivo
        if (response.status === 404 && model !== modelsToTry[modelsToTry.length - 1]) {
          continue;
        }

        throw new Error(errorMessage || `Errore HTTP ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("L'API di Gemini ha restituito una risposta vuota o malformata.");
      }

      return textResponse;
    } catch (error: any) {
      // Se è l'ultimo modello dell'array, o l'errore non è di modello non trovato, lancia l'errore
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw error;
      }
    }
  }

  throw new Error("Impossibile connettersi ai server Gemini.");
}

/**
 * Genera il log giornaliero proceduralmente in caso di offline o assenza di chiave API
 */
export function generateProceduralCommsLog(state: GameState, day: number, cycle: number): { from: string; text: string } {
  const energy = state.resources.energy;
  const ice = state.resources.ice;
  const oxygen = state.resources.oxygen;
  const phase = state.time.phase;

  // 1. Carenza energia
  if (energy < 100) {
    return {
      from: 'Controllo Missione Houston',
      text: `Attenzione SCC. Rilevato livello critico di energia (${Math.round(energy)} W). Si consiglia di spegnere i moduli di produzione non essenziali e assegnare i droni URM alle batterie o ai generatori primari per evitare il blackout.`
    };
  }

  // 2. Carenza ghiaccio/acqua
  if (ice < 15) {
    const hasTrivella = Object.values(state.placedStructures).some(p => p.definitionId === 'STR-C03');
    return {
      from: 'ESA Logistica',
      text: hasTrivella 
        ? `Segnalazione logistica: le riserve di ghiaccio sono scese a ${Math.round(ice)} unità. Ottimizzare l'allocazione dei droni URM sulle criotrivelle per ripristinare il flusso d'acqua.`
        : `Allarme risorse: riserva di ghiaccio critica (${Math.round(ice)} unità) e nessun Estrattore (STR-C03) attivo. Costruire un estrattore su un deposito ghiaccio prima che il ciclo dell'ossigeno si interrompa.`
    };
  }

  // 3. Nuove strutture commentate
  const structures = Object.values(state.placedStructures);
  if (structures.length > 1) {
    const nonMainframe = structures.filter(s => s.definitionId !== 'STR-A01');
    if (nonMainframe.length > 0) {
      const randomStruct = nonMainframe[day % nonMainframe.length];
      const name = STRUCTURES[randomStruct.definitionId]?.name || randomStruct.definitionId;
      return {
        from: 'Archivio Centrale SCC',
        text: `Diagnostica sistemi: l'unità ${name} posizionata sul settore ${randomStruct.hexId} risponde correttamente ai ping di telemetria. Il rendimento è nominale e integrato nella griglia della colonia.`
      };
    }
  }

  // 4. Nuove ricerche sbloccate
  if (state.research.completed.length > 0) {
    const latestResearch = state.research.completed[state.research.completed.length - 1];
    return {
      from: 'Divisione R&D Terra',
      text: `Uplink tecnologico completato. I dati relativi alla ricerca '${latestResearch}' sono stati integrati nei database locali. Nuovi blueprint strutturali sono ora disponibili per la costruzione.`
    };
  }

  // 5. Ciclo lunare (es. Notte profonda)
  if (phase === 'NOTTE' || phase === 'PREALBA') {
    return {
      from: 'Controllo Missione Houston',
      text: `Fase di Notte Profonda in corso sul sito Selene. Temperatura esterna stabile a -173°C. Assicurarsi che gli scudi termici (STR-E03) siano attivi per prevenire danni da freddo criogenico alle strutture esposte.`
    };
  }

  if (phase === 'ALBA') {
    return {
      from: 'Tokyo Space Authority',
      text: `Rilevata prima luce solare sul terminatore. I pannelli fotovoltaici della base stanno riavviando la generazione elettrica. Regolare i sistemi di accumulo per immagazzinare il surplus giornaliero.`
    };
  }

  // 6. Messaggio di default
  const senders = ['ESA Houston', 'Controllo Missione Houston', 'Tokyo Space Authority', 'Archivio Centrale SCC'];
  const selectedSender = senders[day % senders.length];
  const defaultTexts = [
    `Telemetria del giorno ${day} del ciclo ${cycle} ricevuta correttamente. Tutti i parametri vitali rientrano nei margini di tolleranza approvati. Procedere con i piani di espansione stabiliti.`,
    `Rapporto di stato giornaliero: i droni URM operano all'efficienza prevista. Nessun sovraccarico rilevato sulla rete a terra. I sistemi di supporto vitale mantengono l'equilibrio dei gas.`,
    `Collegamento radio stabile. La Terra conferma la ricezione dei registri telemetrici. L'indice di autosufficienza coloniale (IAC) è monitorato costantemente dai nostri analisti.`,
  ];
  return {
    from: selectedSender,
    text: defaultTexts[day % defaultTexts.length]
  };
}

/**
 * Chiama l'API di Gemini per generare il log giornaliero basandosi sullo stato corrente
 */
export async function generateDailyCommsLog(
  state: GameState,
  day: number,
  cycle: number
): Promise<{ from: string; text: string }> {
  const { resources, time, drones, placedStructures, iacIndex, research } = state;

  const structuresSummary: Record<string, number> = {};
  Object.values(placedStructures).forEach(ps => {
    const name = STRUCTURES[ps.definitionId]?.name || ps.definitionId;
    structuresSummary[name] = (structuresSummary[name] || 0) + 1;
  });
  const structText = Object.entries(structuresSummary)
    .map(([name, count]) => `${name} (x${count})`)
    .join(', ') || 'Nessuna';

  const researchCompletedText = research.completed.join(', ') || 'Nessuna';

  const reportPrompt = `
Genera una trasmissione radio o un registro di colonia per il giorno ${day} del ciclo ${cycle} del Progetto Selene.
Ecco lo stato attuale della colonia:
- IAC (Indice Autosufficienza): ${iacIndex.toFixed(1)}%
- Fase Lunare corrente: ${time.phase} (Giorno ${time.day}/28 del ciclo ${time.cycle})
- Risorse: Energia ${Math.round(resources.energy)}W, Metalli ${Math.round(resources.metals)}, Regolite ${Math.round(resources.regolith)}, Ghiaccio ${Math.round(resources.ice)}, Ossigeno ${Math.round(resources.oxygen)}, Idrogeno ${Math.round(resources.hydrogen)}, Elio-3 ${Math.round(resources.helium3)}, Cemento ${Math.round(resources.cement)}, Crediti ${Math.round(resources.credits)}
- Droni URM: totali ${drones.total} (disponibili ${drones.available})
- Strutture edificate: ${structText}
- Ricerche completate: ${researchCompletedText}

REGOLE DI GENERAZIONE:
1. Restituisci l'output rigorosamente in formato JSON con la seguente struttura, senza altri testi o markdown esterni al blocco JSON:
{
  "from": "Nome del mittente (es. ESA Houston, Archivio SCC, Dipartimento Logistica, Tokyo Space Authority, ecc.)",
  "text": "Messaggio di 1-3 frasi in italiano che commenta lo stato della colonia, i progressi (edifici costruiti, ricerche), la fase lunare, o le risorse."
}
2. Il tono deve essere serio, professionale, da ingegnere spaziale o IA di bordo, altamente immersivo.
3. Il testo deve essere breve e conciso (massimo 280 caratteri per il campo "text").
  `.trim();

  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            contents: [{ role: 'user', parts: [{ text: reportPrompt }] }],
            systemInstruction: "Sei l'Ufficio Comunicazioni Terrestri o il Registro di Colonia SCC. Rispondi solo con un oggetto JSON valido contenente 'from' e 'text' in italiano.",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("Risposta vuota");
      }

      const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      if (parsed.from && parsed.text) {
        return { from: parsed.from, text: parsed.text };
      }
      throw new Error("JSON non contiene i campi richiesti");
    } catch (error: any) {
      console.warn(`Chiamata a ${model} per log giornaliero fallita:`, error);
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw error;
      }
    }
  }

  throw new Error("Tutti i modelli falliti");
}

