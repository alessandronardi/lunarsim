import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { STRUCTURES } from '../data/structures';
import type { Resources } from '../types/game';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

// ── Palette categoria ─────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { primary: string; bg: string; border: string }> = {
    'Controllo & Segnale': { primary: '#60c0ff', bg: 'rgba(96,192,255,0.07)', border: 'rgba(96,192,255,0.25)' },
    'Energia': { primary: '#ffdd44', bg: 'rgba(255,221,68,0.07)', border: 'rgba(255,221,68,0.25)' },
    'Estrazione & Produzione': { primary: '#66ee88', bg: 'rgba(102,238,136,0.07)', border: 'rgba(102,238,136,0.25)' },
    'Ricerca & Elaborazione': { primary: '#cc88ff', bg: 'rgba(204,136,255,0.07)', border: 'rgba(204,136,255,0.25)' },
    'Infrastruttura': { primary: '#ff8844', bg: 'rgba(255,136,68,0.07)', border: 'rgba(255,136,68,0.25)' },
};
const TIER_LABEL: Record<string, string> = {
    BASE: 'BASE',
    AVANZATO: 'AVANZATO',
    'END-GAME': 'END-GAME',
};
const TIER_COLOR: Record<string, string> = {
    BASE: '#60c0ff',
    AVANZATO: '#ffaa00',
    'END-GAME': '#ee44ff',
};
export const LORE_NOTES: Record<string, { techNote: string; iacNote: string }> = {
    'STR-A01': {
        techNote: 'Chassis strutturale primario SCC integrato su guscio in alluminio-litio rad-hardened. Memoria SRAM ECC ed elettronica ridondante a tolleranza d\'errore. Eroga un uplink RF fisso in banda Ka di 0.25 banda/ora e gestisce il routing dinamico di telemetria per i droni URM. Include un sistema di arresto fail-safe irreversibile (game over) qualora il bus di alimentazione primario rimanga disalimentato per oltre 2 ore reali consecutive.',
        iacNote: 'Ancoraggio strutturale critico. Rappresenta la radice logica di instradamento di ogni comando e dato telemetrico.',
    },
    'STR-A02': {
        techNote: 'Traliccio telescopico in carbonio-carbonio operante come antenna a schiera di fase (phased array). Supera il limite della linea di vista geometrica lunare indotto dal ridotto raggio di curvatura del satellite. Estende il lobo utile di trasmissione di +2 hex a livello suolo, incrementato a +3 hex se installato su RILIEVO sfruttando la quota altimetrica geodetica.',
        iacNote: 'Estensione perimetro operativo. Abilita l\'allineamento dei droni e dei sensori nelle zone remote.',
    },
    'STR-B01': {
        techNote: 'Giunzioni fotovoltaiche triple ad alta efficienza basate su arseniuro di gallio (GaAs). Il rendimento elettrico istantaneo segue la curva d\'insolazione solare lunare diretta (da 0% all\'alba fino al picco di 1.36 kW/m² durante il giorno pieno, degradando linearmente a tramonto). Integra filtri per la deviazione elettrostatica della polvere silicea sollevata dall\'attività dei droni.',
        iacNote: 'Componente primario per l\'Autonomia Energetica. Copre il 25% del peso nell\'indice IAC.',
    },
    'STR-B02': {
        techNote: 'Celle elettrochimiche a stato solido Litio-Zolfo (Li-S) alloggiate all\'interno di un contenitore isotermico pressurizzato ad azoto gassoso. Il sistema termico attivo previene la degradazione criogenica degli elettroliti durante la notte profonda. Regolatore di linea integrato per l\'erogazione automatica sottosoglia (energy < 20).',
        iacNote: 'Sostegno energetico transitorio. Fondamentale per tamponare i 14 giorni di buio senza sorgenti attive.',
    },
    'STR-B03': {
        techNote: 'Reattore termonucleare a fissione compatto raffreddato a metallo liquido (sodio-potassio eutettico NaK) accoppiato a alternatori Stirling a pistone libero. Richiede una corona di isolamento radiologico di 1 hex circostante non edificabile. Genera un output elettrico di base di 36/ora, ottimizzato a 60/ora integrando il regime termico della ricerca nuclear_reactor o tramite allocazione di 2+ URM per manutenzione attiva.',
        iacNote: 'Autonomia energetica a ciclo continuo. Risolve la soglia minima notturna per la stabilità IAC.',
    },
    'STR-B04': {
        techNote: 'Cella a combustibile a membrana a scambio protonico (PEM) alimentata a idrogeno molecolare e ossigeno gassoso di grado criogenico. Genera energia elettrica pulita rigenerando molecole di H₂O recuperabili come acqua purificata per il supporto vitale. Si attiva automaticamente se la tensione di bus cade sotto il livello critico (energy < 30).',
        iacNote: 'Chiusura del ciclo di rigenerazione chimico-energetica acqua-idrogeno.',
    },
    'STR-C01': {
        techNote: 'Gruppo perforatore rotopercussivo ISRU provvisto di testa a corone diamantate sinterizzate. Ottimizzato per la frantumazione meccanica di anortositi e basalti lunari. Flusso di resa alterato dalla topologia locale: +50% nei CRATERI ricchi di ejecta metalliche da impatto; penalità del -30% nelle regioni permanentemente ombreggiate (PSR) per via della cementazione del permafrost.',
        iacNote: 'Capacità Mineraria primaria. Contribuisce al target minimo combinato di estrazione di 30 unità/ora.',
    },
    'STR-C02': {
        techNote: 'Piattaforma estrattiva profonda ad alta coppia motorizzata con cuscinetti a sospensione magnetica operanti sottovuoto per evitare l\'usura da polveri lunari abrasive. Richiede spaziatura geodetica (esclusione di co-posizionamento su medesimo hex di STR-C01) e si consiglia l\'installazione su hex CRATERE per sfruttare le vene minerarie esposte.',
        iacNote: 'Capacità Mineraria avanzata. Consente il raggiungimento rapido dei volumi di regolite ed elementi siderofili.',
    },
    'STR-C03': {
        techNote: 'Criotrivella a sublimazione termica vincolata topograficamente a hex contenenti depositi accertati di permafrost lunare. Utilizza emettitori infrarossi o specchi solari focalizzati per far evaporare il ghiaccio d\'acqua intrappolato nella regolite PSR a -230°C, condensandolo in collettori criogenici locali ad alta purezza.',
        iacNote: 'Autosufficienza Idrica. Struttura fondamentale per l\'approvvigionamento del ciclo idrico e propellente.',
    },
    'STR-C04': {
        techNote: 'Cella di elettrolisi ad acqua pressurizzata con membrana a conduttività protonica operante a regime di temperatura controllato. Scinde molecole d\'acqua in idrogeno e ossigeno ad altissima purezza. Integra sensori di sicurezza per l\'auto-arresto qualora i serbatoi criogenici raggiungano il cap nominale d\'accumulo.',
        iacNote: 'Autosufficienza Idrica ed ECLSS. Fornisce i reagenti elementari per l\'ossigeno respirabile.',
    },
    'STR-C05': {
        techNote: 'Fornace a desorbimento termico criogenico ad alto vuoto. Riscalda lo strato superficiale di regolite fine ricca di ilmenite a circa 800°C per provocare il rilascio termico degli isotopi di Elio-3 intrappolati per adsorbimento fisico dal vento solare. La resa oraria del reattore è incrementabile del +50% con la ricerca helium3_extraction.',
        iacNote: 'Esportazione strategica. Genera il flusso economico primario tramite scambi orbitali di carburante fusorio.',
    },
    'STR-C06': {
        techNote: 'Impianto di sinterizzazione regolitica mediante riscaldamento a microonde focalizzato (frequenza 2.45 GHz). Sfrutta le proprietà dielettriche dei minerali ferrosi contenuti nella regolite per fonderli in blocchi edilizi ad alta densità (cemento lunare e geopolimeri), riducendo l\'uso di leganti artificiali terrestri.',
        iacNote: 'Proxy strutturale infrastrutture e capacità estrattiva mineraria integrata.',
    },
    'STR-D01': {
        techNote: 'Coprocessore neuromorfico parallelo accoppiato a circuiti integrati a fotonica computazionale. Sblocca la capacità di calcolo locale necessaria per avviare algoritmi di ricerca complessi senza latenza trans-terrestre. Ogni nodo additivo eroga +20 compute/ora, scalabili del +20% attivando la ricerca autonomous_lab.',
        iacNote: 'Ricerca Autonoma. Prerequisito logico essenziale per lo sviluppo tecnologico locale.',
    },
    'STR-D02': {
        techNote: 'Stazione scientifica integrata dotata di microscopia elettronica a scansione, camere bianche a vuoto molecolare spinto e spettrometria di massa a tempo di volo. Sfrutta il radiatore termico rivolto allo spazio profondo durante la NOTTE per incrementare il rendimento computazionale dei superconduttori (+20%).',
        iacNote: 'Ricerca Autonoma avanzata. Accelera drasticamente lo sblocco dei tier tecnologici superiori.',
    },
    'STR-E01': {
        techNote: 'Silo di stoccaggio con atmosfera a pressione parziale azoto/elio e schermi elettrostatici attivi anti-polvere. Raddoppia la capacità volumetrica di regolite, metalli raffinati, ghiaccio, ossigeno e idrogeno criogenici. L\'overflow volumetrico causa il blocco automatico per contropressione delle strutture estrattive.',
        iacNote: 'Indiretto. Struttura logistica critica per prevenire la saturazione delle linee di raffinamento.',
    },
    'STR-E02': {
        techNote: 'Unità di manifattura additiva a letto di polvere metallica laser (DMLS) operante in camera a vuoto o inerte. Fabbrica, calibra e assembla parti meccaniche e avionica per i droni URM. Produce un drone URM ogni 4 ore reali, ridotte a 2 ore reali integrando il ciclo di calcolo della ricerca autonomous_urm_production.',
        iacNote: 'Logistica e Manodopera. Risolve il collo di bottiglia operativo di manutenzione e costruzione.',
    },
    'STR-E03': {
        techNote: 'Schermatura termica protettiva basata su isolamento a strati multipli (MLI) e sistemi attivi a pompa di calore termochimica. Protegge l\'hex ospitante e le sei coordinate adiacenti dai gradienti criogenici notturni. Il consumo elettrico si attiva solo durante le fasi NOTTE/PREALBA.',
        iacNote: 'Mitigazione del degrado hardware. Previene i danni strutturali da shock termico sulle installazioni sensibili.',
    },
    'STR-B00': {
        techNote: 'Micro-cella a combustibile ausiliaria a ciclo chiuso PEM. Consuma minime frazioni di idrogeno molecolare (0.5 unità/ora) per erogare una corrente di mantenimento costante di 8 energia/ora. Progettata per impedire il congelamento criogenico delle elettroniche nei moduli base durante le prime fasi del ciclo di vita coloniale.',
        iacNote: 'Autonomia Energetica. Soluzione di emergenza a basso costo per la sopravvivenza notturna.',
    },
    'STR-E04': {
        techNote: 'Modulo biologico idroponico/aeroponico verticale a ciclo semichiuso. Utilizza array LED a spettro fotosintetico specifico per stimolare colture biologiche ed effettuare la fitodepurazione dell\'aria. Consuma 5 ghiaccio/ora per reintegrare la traspirazione fogliare e rilasciare +8 ossigeno/ora nella rete vitale.',
        iacNote: 'Produzione Alimentare ed ECLSS. Incrementa passivamente l\'indice IAC del +30% sulla componente nutrizionale.',
    },
    'STR-E05': {
        techNote: 'Habitat pressurizzato rigido sigillato a 1 atm (composizione atmosferica terrestre N₂/O₂). Schermato esternamente da uno spessore di regolite compressa di 2.5 metri per l\'assorbimento dei raggi cosmici galattici e meteoriti. Integra riciclatori ECLSS biologici avanzati per purificare fluidi e polveri lunari silicotossiche.',
        iacNote: 'Supporto Vitale e Produttività. Massimizza la generazione di crediti e dati computazionali in-situ.',
    },
    'STR-B05': {
        techNote: 'Centrale a ciclo Rankine organico (ORC) operante tramite sonde di calore inserite nel sottosuolo stabile. Sfrutta il gradiente termico tra lo strato superficiale insolato (o esposto allo spazio criogenico) e lo strato profondo del sottosuolo (stabile a circa -35°C) per generare +35 energia/ora costante in assenza di combustibile.',
        iacNote: 'Autonomia Energetica. Erogazione di carico di base stabile e indipendente dall\'insolazione solare.',
    },
    'STR-C07': {
        techNote: 'Raffineria termochimica dotata di array laser a fibra drogata a itterbio operante ad altissima temperatura. Induce la decomposizione termica dei minerali di ilmenite ricchi di titanio e anortosite ricchi di alluminio, separando metalli puri al 99.9% e desorbendo gas elio-3 intrappolato.',
        iacNote: 'Capacità Mineraria ed Export raffinato. Converte la regolite grezza in leghe strutturali pure ad alto valore.',
    },
    'STR-E06': {
        techNote: 'Spazioporto commerciale dotato di piattaforma di atterraggio in basalto fuso rinforzato per mitigare l\'effetto plume-blasting dei motori a razzo. Include sistemi automatici criogenici di caricamento LOX/LH₂ e guide a induzione magnetica per il posizionamento dei lander commerciali.',
        iacNote: 'Export Strategico end-game. Consente il trasferimento di carichi di elio-3 e risorse alla Terra per la generazione di crediti.',
    },
    'STR-C08': {
        techNote: 'Estrattore termico rotativo a riscaldamento indotto ad alta frequenza. Sottopone la regolite fine a un processo di pirolisi sottovuoto a 800°C per provocare il desorbimento fisico dei gas volatili inoculati dal vento solare. Fornisce un flusso costante di +6 idrogeno/ora svincolando la produzione energetica dalle riserve di ghiaccio fossile.',
        iacNote: 'Autosufficienza Idrica ed Energetica. Estrae combustibile termochimico direttamente dal suolo lunare comune.',
    },
    'STR-B06': {
        techNote: 'Impianto di co-generazione elettrotermica ad alta potenza operante tramite la combustione controllata di idrogeno ed ossigeno gassosi. Eroga un flusso energetico massiccio di 150 energia/ora per sostenere i carichi critici dei moduli abitativi e delle fonderie durante la notte profonda, recuperando acqua distillata.',
        iacNote: 'Autonomia Energetica su scala industriale. Risolve definitivamente i picchi di consumo notturni della colonia avanzata.',
    },
};

const PHASE_ICONS: Record<string, string> = {
    ALBA: '🌅',
    GIORNO: '☀️',
    TRAMONTO: '🌇',
    NOTTE: '🌑',
    PREALBA: '🌘',
};

function PhaseChip({ phase }: { phase: string }) {
    return (
        <span className="font-mono text-[7px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
            {PHASE_ICONS[phase] ?? '?'} {phase}
        </span>
    );
}

// ── Riga costo risorse ────────────────────────────────────────────────────────
function CostRow({ cost }: { cost: Partial<Resources> }) {
    const entries = Object.entries(cost);
    if (entries.length === 0) return <span className="font-mono text-[9px] text-gray-700">Già costruita</span>;
    return (
        <div className="flex gap-2 flex-wrap">
            {entries.map(([k, v]) => (
                <span key={k} className="font-mono text-[9px] text-gray-300">
                    {k} <span className="text-orange-300 font-bold">×{v}</span>
                </span>
            ))}
        </div>
    );
}

// ── Riga produzione ───────────────────────────────────────────────────────────
function ProdRow({ prod }: { prod: Partial<Resources> }) {
    const entries = Object.entries(prod);
    if (entries.length === 0) return <span className="font-mono text-[9px] text-gray-700">Effetto speciale — vedi note</span>;
    return (
        <div className="flex gap-2 flex-wrap">
            {entries.map(([k, v]) => (
                <span key={k} className="font-mono text-[9px] text-emerald-400">
                    +{v} {k}/ora
                </span>
            ))}
        </div>
    );
}

// ── Stato struttura ───────────────────────────────────────────────────────────
type StructStatus = 'PIAZZATA' | 'DISPONIBILE' | 'BLOCCATA';

function statusLabel(id: string, placed: Record<string, { definitionId: string }>, completedResearch: string[], placedIds: string[]): StructStatus {
    if (Object.values(placed).some(ps => ps.definitionId === id)) return 'PIAZZATA';
    const def = STRUCTURES[id];
    for (const pre of def.prerequisites) {
        if (pre.startsWith('research:')) {
            if (!completedResearch.includes(pre.replace('research:', ''))) return 'BLOCCATA';
        } else {
            if (!placedIds.includes(pre)) return 'BLOCCATA';
        }
    }
    return 'DISPONIBILE';
}

const STATUS_STYLE: Record<StructStatus, { color: string; bg: string; border: string }> = {
    PIAZZATA: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)' },
    DISPONIBILE: { color: '#60c0ff', bg: 'rgba(96,192,255,0.07)', border: 'rgba(96,192,255,0.25)' },
    BLOCCATA: { color: '#555', bg: 'rgba(0,0,0,0.2)', border: 'rgba(255,255,255,0.05)' },
};

// ── Card struttura ────────────────────────────────────────────────────────────
function StructCard({
    id, status,
}: { id: string; status: StructStatus }) {
    const [expanded, setExpanded] = useState(false);
    const def = STRUCTURES[id];
    const cat = CAT_COLOR[def.category] ?? CAT_COLOR['Infrastruttura'];
    const st = STATUS_STYLE[status];
    const lore = LORE_NOTES[id];
    const isLocked = status === 'BLOCCATA';

    return (
        <div
            className="rounded-2xl flex flex-col transition-all duration-300"
            style={{
                background: isLocked ? 'rgba(5,8,16,0.7)' : cat.bg,
                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.05)' : cat.border}`,
                backdropFilter: 'blur(16px)',
                opacity: isLocked ? 0.65 : 1,
                boxShadow: status === 'PIAZZATA' ? '0 0 16px rgba(0,255,136,0.06)' : 'none',
            }}>

            {/* Header */}
            <button
                className="flex items-start gap-3 p-4 text-left w-full"
                onClick={() => setExpanded(e => !e)}>

                {/* ID + tier */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: '52px' }}>
                    <span className="font-mono text-xs font-bold" style={{ color: isLocked ? '#444' : cat.primary }}>
                        {id.slice(4)}
                    </span>
                    <span className="font-mono text-[6px] px-1.5 py-0.5 rounded"
                        style={{ color: TIER_COLOR[def.tier], background: `${TIER_COLOR[def.tier]}16`, border: `1px solid ${TIER_COLOR[def.tier]}44` }}>
                        {TIER_LABEL[def.tier]}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-sm font-bold ${isLocked ? 'text-gray-600' : 'text-gray-100'}`}>
                            {def.name}
                        </span>
                        {/* Status badge */}
                        <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                            style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                            {status}
                        </span>
                    </div>
                    <p className={`font-mono text-[9px] leading-relaxed mt-1 ${expanded ? '' : 'line-clamp-2'} ${isLocked ? 'text-gray-700' : 'text-gray-400'}`}>
                        {def.description}
                    </p>
                </div>

                {/* Expand icon */}
                <span className="flex-shrink-0 mt-1 text-gray-700">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-4 border-t"
                    style={{ borderColor: isLocked ? 'rgba(255,255,255,0.04)' : `${cat.primary}22` }}>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4">
                        {[
                            { label: 'Categoria', value: def.category },
                            { label: 'Tier', value: def.tier },
                            { label: 'Hex occupati', value: `${def.gridSize} hex` },
                            { label: 'URM ottimali', value: def.optimalDrones > 0 ? `${def.optimalDrones} droni` : 'Nessuno' },
                            { label: 'Energia/ora', value: def.energyCostPerHour > 0 ? `–${def.energyCostPerHour}` : def.energyCostPerHour === 0 ? '0 (generatrice)' : `–${Math.abs(def.energyCostPerHour)}` },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest">{label}</p>
                                <p className={`font-mono text-[9px] mt-0.5 ${isLocked ? 'text-gray-600' : 'text-gray-300'}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Fasi operative */}
                    <div>
                        <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1.5">Fasi operative</p>
                        <div className="flex gap-1.5 flex-wrap">
                            {def.activePhases.map(p => <PhaseChip key={p} phase={p} />)}
                        </div>
                    </div>

                    {/* Costo */}
                    <div>
                        <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1.5">Costo costruzione</p>
                        <CostRow cost={def.buildCost} />
                    </div>

                    {/* Produzione */}
                    <div>
                        <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1.5">Produzione / Effetto</p>
                        <ProdRow prod={def.productionPerHour} />
                    </div>

                    {/* Prerequisiti */}
                    {def.prerequisites.length > 0 && (
                        <div>
                            <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1.5">Prerequisiti</p>
                            <div className="flex gap-1.5 flex-wrap">
                                {def.prerequisites.map(p => (
                                    <span key={p} className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                                        style={{ color: p.startsWith('research:') ? '#cc88ff' : '#60c0ff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {p.startsWith('research:') ? `🔬 ${p.replace('research:', '')}` : p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Note tecniche */}
                    {lore && (
                        <div className="rounded-xl p-3 flex flex-col gap-2"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1">Note tecniche</p>
                                <p className="font-mono text-[8px] text-gray-500 leading-relaxed">{lore.techNote}</p>
                            </div>
                            <div>
                                <p className="font-mono text-[7px] text-gray-700 uppercase tracking-widest mb-1">Contributo IAC</p>
                                <p className="font-mono text-[8px] text-gray-500 leading-relaxed">{lore.iacNote}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Guide di sopravvivenza ────────────────────────────────────────────────────
const SURVIVAL_GUIDES = [
    {
        title: 'Tempo Reale e Ciclo Lunare',
        icon: '⏱',
        text: 'La simulazione è 1:1 con il tempo reale: un secondo di gioco corrisponde a un secondo reale. Ogni giorno lunare dura 24 ore reali; un ciclo completo dura 28 giorni reali (~14 di luce, ~9 di Notte Profonda, con Alba, Tramonto e Pre-alba). Il motore aggiorna risorse e costruzioni ogni secondo; se chiudi il client, al rientro recupera il progresso offline a blocchi da 1 ora. Produzione e consumi nelle schede struttura sono sempre «per ora reale». Il salvataggio è automatico in locale (localStorage).',
    },
    {
        title: 'Prima della Notte Profonda',
        icon: '🌑',
        text: 'Ogni ciclo lunare ha 14 giorni di notte continua (tempo reale 1:1). Senza pannelli solari attivi, la colonia dipende da batterie (STR-B02) o reattore (STR-B03). Pianifica la notte prima del tramonto: almeno 50 unità di energia in riserva. Se l\'energia resta a zero per più di 2 ore consecutive, la colonia muore.',
    },
    {
        title: 'Ciclo dell\'Acqua',
        icon: '💧',
        text: 'Il ghiaccio è la risorsa più strategica. Il percorso critico è: STR-C03 (estrazione ghiaccio) → STR-C04 (elettrolizzatore, produce ossigeno e idrogeno) → STR-B04 (cella a combustibile, brucia idrogeno per energia notturna). Questo ciclo rende la colonia autonoma dalla Terra per l\'energia.',
    },
    {
        title: 'Export He-3 e Crediti',
        icon: '⚛',
        text: 'L\'Elio-3 estratto da STR-C05 viene convertito automaticamente in crediti a fine di ogni ciclo lunare (28 giorni reali). Il tasso è 1 He-3 = 50 crediti. I crediti servono per STR-B03, STR-B04, STR-D01 e STR-D02. Costruisci STR-C05 il prima possibile.',
    },
    {
        title: 'Scalabilità URM',
        icon: '🤖',
        text: 'Inizi con 5 droni. Puoi produrre altri droni direttamente dal Nucleo Base pagando risorse (50 regolite, 50 metalli, 100 crediti) oppure in seguito tramite l\'officina URM (STR-E02), che li assembla automaticamente ma richiede cemento e ricerca. Ogni URM consuma 0.2 banda/ora per mantenere il link operativo.',
    },
    {
        title: 'Saturazione Segnale',
        icon: '📡',
        text: 'Il Mainframe (STR-A01) copre solo un raggio di 3 hex. Ogni STR-A02 aggiunge 2 hex (3 su terreno RILIEVO). Planifica la rete di segnale prima di posizionare le strutture estrattive lontane. Un ripetitore su RILIEVO è più efficiente: usalo come relay verso zone remote.',
    },
    {
        title: 'Indice di Autosufficienza (IAC)',
        icon: '📊',
        text: 'L\'IAC misura quanto la colonia è indipendente dalla Terra. Componenti: Autonomia Energetica 25% (pannelli, reattore, celle), Capacità Mineraria 20%, Autosufficienza Idrica 15%, Export Strategico 10%, Ricerca Autonoma 15%, Prod. Alimentare 15%. L\'obiettivo è raggiungere IAC = 100 entro il ciclo 5.',
    },
];


// ── Vista Enciclopedia ────────────────────────────────────────────────────────
export function EncyclopediaView() {
    const placed = useGameStore(s => s.placedStructures);
    const research = useGameStore(s => s.research ?? { completed: [], active: null, progressHours: 0 });
    const commsLog = useGameStore(s => s.commsLog || []);

    const sortedComms = useMemo(() => {
        return [...commsLog].sort((a, b) => {
            if (a.cycle !== b.cycle) return a.cycle - b.cycle;
            if (a.day !== b.day) return a.day - b.day;
            return a.timestamp - b.timestamp;
        });
    }, [commsLog]);

    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState<string>('ALL');
    const [filterTier, setFilterTier] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'STRUTTURE' | 'GUIDE' | 'COMUNICAZIONI'>('STRUTTURE');

    const completedResValues = research.completed as unknown as string[];
    const placedIds = useMemo(() => Object.values(placed).map(ps => ps.definitionId), [placed]);

    // Strutture filtrate
    const filtered = useMemo(() => {
        return Object.keys(STRUCTURES).filter(id => {
            const def = STRUCTURES[id];
            if (filterCat !== 'ALL' && def.category !== filterCat) return false;
            if (filterTier !== 'ALL' && def.tier !== filterTier) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!id.toLowerCase().includes(q) && !def.name.toLowerCase().includes(q) && !def.description.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [filterCat, filterTier, search]);

    const categories = ['ALL', 'Controllo & Segnale', 'Energia', 'Estrazione & Produzione', 'Ricerca & Elaborazione', 'Infrastruttura'];
    const tiers = ['ALL', 'BASE', 'AVANZATO', 'END-GAME'];

    // Stats
    const totalPiazzate = Object.values(placed).length;
    const totalDisponibili = Object.keys(STRUCTURES).filter(id => statusLabel(id, placed, completedResValues, placedIds) === 'DISPONIBILE').length;
    const totalBloccate = Object.keys(STRUCTURES).filter(id => statusLabel(id, placed, completedResValues, placedIds) === 'BLOCCATA').length;

    return (
        <div className="h-full flex flex-col overflow-hidden">

            {/* ── Top bar ──────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>

                <div className="flex flex-col">
                    <h2 className="font-title font-bold text-base text-mc-cyan tracking-widest uppercase">
                        Enciclopedia
                    </h2>
                    <p className="font-mono text-[9px] text-gray-600">
                        Catalogo Strutture Lunari — Progetto Selene · Simulazione tempo reale
                    </p>
                </div>

                {/* Stats rapide */}
                <div className="flex gap-4 ml-6">
                    {[
                        { label: 'Piazzate', value: totalPiazzate, color: '#00ff88' },
                        { label: 'Disponibili', value: totalDisponibili, color: '#60c0ff' },
                        { label: 'Bloccate', value: totalBloccate, color: '#555' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="flex flex-col items-center">
                            <span className="font-mono text-base font-bold" style={{ color }}>{value}</span>
                            <span className="font-mono text-[7px] text-gray-600 uppercase tracking-widest">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Tab switcher */}
                <div className="ml-auto flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['STRUTTURE', 'GUIDE', 'COMUNICAZIONI'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold uppercase tracking-widest transition-all"
                            style={activeTab === tab
                                ? { background: 'rgba(96,192,255,0.15)', color: '#60c0ff', border: '1px solid rgba(96,192,255,0.3)' }
                                : { color: '#444', border: '1px solid transparent' }}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Corpo ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

                {/* ══ Tab Strutture ══════════════════════════════════════════ */}
                {activeTab === 'STRUTTURE' && (
                    <div className="flex flex-col h-full">

                        {/* Filtri */}
                        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-5 py-3"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>

                            {/* Search */}
                            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Search size={11} className="text-gray-600" />
                                <input
                                    type="text"
                                    placeholder="Cerca struttura…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="font-mono text-[9px] bg-transparent outline-none text-gray-300 placeholder-gray-700 w-36"
                                />
                            </div>

                            {/* Categoria */}
                            <div className="flex gap-1 flex-wrap">
                                {categories.map(cat => {
                                    const col = cat === 'ALL' ? '#60c0ff' : (CAT_COLOR[cat]?.primary ?? '#aaa');
                                    const active = filterCat === cat;
                                    return (
                                        <button key={cat} onClick={() => setFilterCat(cat)}
                                            className="font-mono text-[8px] px-2 py-1 rounded-lg transition-all"
                                            style={active
                                                ? { background: `${col}22`, color: col, border: `1px solid ${col}55` }
                                                : { color: '#444', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {cat === 'ALL' ? 'Tutte le categorie' : cat.split(' ')[0]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tier */}
                            <div className="flex gap-1">
                                {tiers.map(tier => {
                                    const col = tier === 'ALL' ? '#888' : TIER_COLOR[tier];
                                    const active = filterTier === tier;
                                    return (
                                        <button key={tier} onClick={() => setFilterTier(tier)}
                                            className="font-mono text-[8px] px-2 py-1 rounded-lg transition-all"
                                            style={active
                                                ? { background: `${col}22`, color: col, border: `1px solid ${col}55` }
                                                : { color: '#444', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {tier}
                                        </button>
                                    );
                                })}
                            </div>

                            <span className="font-mono text-[8px] text-gray-700 ml-auto">{filtered.length} strutture</span>
                        </div>

                        {/* Grid strutture */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {filtered.length === 0 ? (
                                <div className="flex items-center justify-center h-40">
                                    <p className="font-mono text-[10px] text-gray-700">Nessuna struttura trovata</p>
                                </div>
                            ) : (
                                <div className="grid gap-3 items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
                                    {filtered.map(id => (
                                        <StructCard
                                            key={id}
                                            id={id}
                                            status={statusLabel(id, placed, completedResValues, placedIds)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ Tab Guide di sopravvivenza ═════════════════════════════ */}
                {activeTab === 'GUIDE' && (
                    <div className="p-5 max-w-4xl mx-auto flex flex-col gap-4">
                        <p className="font-mono text-[9px] text-gray-600 text-center uppercase tracking-widest mb-2">
                            Manuale Operativo — Colonia Selene · SCC Rev. 4.0 · Tempo reale 1:1
                        </p>
                        {SURVIVAL_GUIDES.map((guide, i) => (
                            <div key={i} className="rounded-2xl p-5 flex gap-4"
                                style={{
                                    background: 'rgba(8,14,28,0.7)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(16px)',
                                }}>
                                <span className="text-2xl flex-shrink-0 mt-0.5">{guide.icon}</span>
                                <div>
                                    <h3 className="font-mono text-sm font-bold text-gray-200 mb-2">{guide.title}</h3>
                                    <p className="font-mono text-[10px] text-gray-400 leading-relaxed">{guide.text}</p>
                                </div>
                            </div>
                        ))}

                        {/* Percorso di progressione */}
                        <div className="rounded-2xl p-5"
                            style={{ background: 'rgba(8,14,28,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}>
                            <h3 className="font-mono text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
                                <span>📈</span> Percorso di Progressione Consigliato
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            {['Fase', 'Strutture Chiave', 'Obiettivo', 'IAC Atteso'].map(h => (
                                                <th key={h} className="font-mono text-[7px] text-gray-600 uppercase tracking-widest text-left pb-2 pr-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-[9px] text-gray-400">
                                        {[
                                            { fase: '1', strutture: 'STR-B01 · STR-C01 · STR-E01', obj: 'Sopravvivere alla prima Notte Profonda', iac: '5–15%' },
                                            { fase: '2', strutture: 'STR-C03 · STR-C04 · STR-D01 · STR-B02', obj: 'Chiudere il ciclo acqua → ossigeno → idrogeno', iac: '20–40%' },
                                            { fase: '3', strutture: 'STR-B03 · STR-C05 · STR-D02', obj: 'Reattore attivo + primo export He-3 + ricerca autonoma', iac: '45–65%' },
                                            { fase: '4', strutture: 'STR-C06 · STR-E02 · STR-E03', obj: 'Produzione droni autonoma + materiali end-game + protezione', iac: '70–90%' },
                                            { fase: '5', strutture: 'Ottimizzazione & scala', obj: 'Tutte le componenti IAC a 1.0 — colonia completamente autonoma', iac: '100%' },
                                        ].map(row => (
                                            <tr key={row.fase} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td className="py-2 pr-4">
                                                    <span className="rounded px-2 py-0.5 font-bold text-cyan-400" style={{ background: 'rgba(96,192,255,0.1)' }}>
                                                        {row.fase}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4 text-cyan-300">{row.strutture}</td>
                                                <td className="py-2 pr-4">{row.obj}</td>
                                                <td className="py-2 font-bold text-emerald-400">{row.iac}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ Tab Comunicazioni ═══════════════════════════════════════ */}
                {activeTab === 'COMUNICAZIONI' && (
                    <div className="p-5 max-w-3xl mx-auto flex flex-col gap-3">
                        <p className="font-mono text-[9px] text-gray-600 text-center uppercase tracking-widest mb-2">
                            Registro Comunicazioni · Canale Terra → Selene · Classificato A2
                        </p>
                        {sortedComms.map((msg) => (
                            <div key={msg.id} className="rounded-2xl p-4 flex flex-col gap-2"
                                style={{
                                    background: msg.isAiGenerated ? 'rgba(8,30,55,0.75)' : 'rgba(4,12,28,0.75)',
                                    border: msg.isAiGenerated ? '1px solid rgba(0,212,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(16px)',
                                    boxShadow: msg.isAiGenerated ? '0 0 12px rgba(0,212,255,0.03)' : 'none',
                                }}>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[7px] text-gray-500 uppercase tracking-widest">
                                        CICLO {msg.cycle} · GIORNO {msg.day.toString().padStart(2, '0')} / 28
                                    </span>
                                    <span className="font-mono text-[8px] font-bold text-cyan-500">{msg.from}</span>
                                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                    {msg.isAiGenerated && (
                                        <span className="font-mono text-[6px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 tracking-widest uppercase">
                                            AI UPLINK
                                        </span>
                                    )}
                                    <span className="font-mono text-[7px] text-emerald-500">● REGISTRATO</span>
                                </div>
                                <p className="font-mono text-[10px] text-gray-300 leading-relaxed pl-2"
                                    style={{ borderLeft: msg.isAiGenerated ? '2px solid rgba(0,212,255,0.4)' : '2px solid rgba(255,255,255,0.2)' }}>
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                        <p className="font-mono text-[8px] text-gray-800 text-center mt-2">
                            — Fine registro trasmissioni —
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
