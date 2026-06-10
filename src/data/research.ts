// ── Catalogo ricerche MVP ─────────────────────────────────────────────────────

export type ResearchId =
    // Ramo Lunare (Compute)
    | 'fuel_cell'
    | 'helium3_extraction'
    | 'autonomous_lab'
    | 'autonomous_urm_production'
    | 'dust_heat_resistance'
    | 'advanced_regolith_conversion'
    | 'human_life_support'
    | 'closed_loop_ecology'
    | 'regolith_hydrogen_extraction'
    // Ramo Terrestre (Banda)
    | 'nuclear_reactor'
    | 'heavy_drill'
    | 'advanced_hydrogen_combustion'
    | 'geothermal_regolith_power'
    | 'antigravity_materials';

export type ResearchBranch = 'LUNAR' | 'TERRESTRIAL';

export interface ResearchDefinition {
    id: ResearchId;
    name: string;
    description: string;
    flavor: string;       // testo narrativo/lore
    branch: ResearchBranch;
    costHours: number;    // ore reali necessarie (base, ×0.67 con STR-D02 attivo)
    creditsCost: number;  // costo una tantum in crediti per avviare la ricerca
    computeCost: number;  // costo una tantum in calcolo per avviare la ricerca
    prerequisites: ResearchId[];
    effects: string[];    // descrizione effetti meccanici
    tier: 1 | 2 | 3;
    icon: string;         // emoji
}

export const RESEARCH: Record<ResearchId, ResearchDefinition> = {

    // ── RAMO LUNARE ────────────────────────────────────────────────────────────

    fuel_cell: {
        id: 'fuel_cell',
        name: 'Ottimizzazione Cella PEM',
        description: 'Implementa membrane a scambio protonico avanzate e catalizzatori in platino-rutenio per le celle a combustibile STR-B04, incrementando l\'efficienza termodinamica del 50%.',
        flavor: '«L\'acqua è energia latente. Nel ciclo chiuso di Selene, l\'idrogeno non è solo carburante: è la linfa vitale che sostiene i nostri sistemi durante l\'oscurità.» — Log del dipartimento energetico, Sol 12',
        branch: 'LUNAR',
        costHours: 8,
        creditsCost: 150,
        computeCost: 50,
        prerequisites: [],
        effects: ['STR-B04: output energia +50% per ora'],
        tier: 1,
        icon: '⚡',
    },

    dust_heat_resistance: {
        id: 'dust_heat_resistance',
        name: 'Mitigazione Regolite & Cicli Termici',
        description: 'Sviluppa rivestimenti barriera termica (TBC) e strati protettivi in regolite sinterizzata microporosa per prevenire microfratture strutturali dovute all\'escursione termica (ΔT ~280°C).',
        flavor: '«La polvere lunare è tagliente come vetro e reattiva come un acido. Ma sinterizzandola a microonde, abbiamo forgiato la nostra migliore corazza contro il freddo del vuoto.»',
        branch: 'LUNAR',
        costHours: 6,
        creditsCost: 100,
        computeCost: 30,
        prerequisites: [],
        effects: ['Danni notturni ridotti del 50% su tutte le strutture non protette'],
        tier: 1,
        icon: '🛡',
    },

    helium3_extraction: {
        id: 'helium3_extraction',
        name: 'Distillazione Criogenica Elio-3',
        description: 'Introduce reattori termochimici a letto fluido accelerati per il desorbimento termico ad alto vuoto, migliorando l\'efficienza di sublimazione dell\'Elio-3 del 50%.',
        flavor: '«Un grammo di Elio-3 potrebbe illuminare un\'intera città terrestre. Per noi, ogni metro cubo di regolite trattata ci avvicina di un passo all\'indipendenza economica.»',
        branch: 'LUNAR',
        costHours: 32,
        creditsCost: 500,
        computeCost: 200,
        prerequisites: ['fuel_cell'],
        effects: ['STR-C05: resa He-3 +50% per ora'],
        tier: 2,
        icon: '⚛',
    },

    advanced_regolith_conversion: {
        id: 'advanced_regolith_conversion',
        name: 'Sinterizzazione a Microonde Regolite',
        description: 'Sintonizza i magnetron industriali alla frequenza di risonanza dielettrica dell\'ilmenite (2.45 GHz), ottimizzando il legame cristallino per incrementare la resa di cemento del 50%.',
        flavor: '«Non portiamo mattoni dalla Terra. Usiamo il suolo stesso, legandolo a livello molecolare. Costruiamo la prima civiltà selenica dalle fondamenta.»',
        branch: 'LUNAR',
        costHours: 24,
        creditsCost: 400,
        computeCost: 150,
        prerequisites: ['dust_heat_resistance'],
        effects: ['STR-C06: produzione cemento +50% per ora'],
        tier: 2,
        icon: '🧱',
    },

    autonomous_lab: {
        id: 'autonomous_lab',
        name: 'Sintesi Computazionale Autonoma',
        description: 'Distribuisce agenti decisionali basati su reti neurali quantistiche rad-hardened nei nodi di elaborazione locali, aumentando le prestazioni computazionali aggregate del 20%.',
        flavor: '«Le macchine hanno smesso di limitarsi ad elaborare dati terrestri. Hanno iniziato a formulare ipotesi ed esperimenti propri sul campo.»',
        branch: 'LUNAR',
        costHours: 160,
        creditsCost: 2500,
        computeCost: 1000,
        prerequisites: ['helium3_extraction'],
        effects: ['Compute generato da tutte le strutture +20%'],
        tier: 3,
        icon: '🔬',
    },

    autonomous_urm_production: {
        id: 'autonomous_urm_production',
        name: 'Manifattura Additiva DMLS Avanzata',
        description: 'Fornisce algoritmi di controllo dinamico e stampanti 3D SLS/DMLS per la sinterizzazione laser a letto di polvere metallica fine, dimezzando i cicli di assemblaggio dei droni URM.',
        flavor: '«Quando le mani meccaniche della colonia hanno iniziato a forgiare altre mani meccaniche, abbiamo capito che la nostra presenza qui era ormai permanente.»',
        branch: 'LUNAR',
        costHours: 160,
        creditsCost: 2500,
        computeCost: 1000,
        prerequisites: ['advanced_regolith_conversion'],
        effects: ['STR-E02: produce +1 URM ogni 2 ore invece di 4'],
        tier: 3,
        icon: '🤖',
    },

    // ── RAMO TERRESTRE ─────────────────────────────────────────────────────────

    heavy_drill: {
        id: 'heavy_drill',
        name: 'Trivellazione Rotopercussiva Profonda',
        description: 'Implementa teste di taglio in carburo di tungsteno lubrificate a film solido (MoS\u2082) per la perforazione geologica profonda, aumentando del 30% la resa estrattiva delle trivelle STR-C02.',
        flavor: '«Abbiamo superato lo strato superficiale alterato dal vento solare. Sotto di esso si trova la vera ricchezza minerale intatta della Luna.» — Bollettino Geologico Selene',
        branch: 'TERRESTRIAL',
        costHours: 10,
        creditsCost: 200,
        computeCost: 75,
        prerequisites: [],
        effects: [
            'STR-C02: resa regolite e metalli +30%',
            'Uplink dati: +0.8 banda/ora (oltre uplink SCC base 1.75)',
            'Ricerche terrestri attive: −1.5 banda/ora',
        ],
        tier: 1,
        icon: '⛏',
    },

    nuclear_reactor: {
        id: 'nuclear_reactor',
        name: 'Cogenerazione Fissione Kilopower',
        description: 'Installa un sistema di raffreddamento a sodio liquido e alternatori Stirling integrati nel nocciolo a fissione STR-B03 per generare energia costante indipendente dagli URM.',
        flavor: '«Il nucleo termico del reattore risplende di un azzurro calmo. È la nostra promessa di sopravvivenza al gelo di 14 giorni di notte continua.»',
        branch: 'TERRESTRIAL',
        costHours: 40,
        creditsCost: 750,
        computeCost: 300,
        prerequisites: ['heavy_drill'],
        effects: ['STR-B03: output sempre +60/ora indipendentemente dagli URM assegnati'],
        tier: 2,
        icon: '☢',
    },

    human_life_support: {
        id: 'human_life_support',
        name: 'ECLSS a Circuito Semichiuso',
        description: 'Sviluppa sistemi di purificazione dell\'aria Sabatier per la riduzione dell\'anidride carbonica e l\'elettrolisi dei condensati biologici, sbloccando la Serra Idroponica STR-E04.',
        flavor: '«Il primo respiro all\'interno del modulo non profumava di plastica o metallo. Profumava di terra umida e piante in crescita. Profumava di casa.»',
        branch: 'LUNAR',
        costHours: 48,
        creditsCost: 800,
        computeCost: 350,
        prerequisites: ['fuel_cell'],
        effects: ['Sblocca: STR-E04 (Serra Idroponica)'],
        tier: 2,
        icon: '🌱',
    },

    closed_loop_ecology: {
        id: 'closed_loop_ecology',
        name: 'CELSS a Circuito Chiuso Completo',
        description: 'Integra bioreattori a microalghe e sistemi di fitodepurazione idroponica ricircolante per la rigenerazione totale di ossigeno e nutrienti organici, sbloccando l\'habitat umano STR-E05.',
        flavor: '«Nulla viene scartato, nulla viene perduto. Siamo parte di un ecosistema artificiale perfetto, dove ogni atomo di carbonio e ogni goccia d\'acqua segue un ciclo eterno.»',
        branch: 'LUNAR',
        costHours: 180,
        creditsCost: 3000,
        computeCost: 1200,
        prerequisites: ['human_life_support'],
        effects: ['Sblocca: STR-E05 (Modulo Abitativo Coloni)'],
        tier: 3,
        icon: '♻️',
    },

    regolith_hydrogen_extraction: {
        id: 'regolith_hydrogen_extraction',
        name: 'Pirolisi del Vento Solare',
        description: 'Calibra i riscaldatori a induzione magnetica per estrarre l\'idrogeno molecolare intrappolato per adsorbimento fisico nei difetti cristallini della regolite, sbloccando STR-C08.',
        flavor: '«La Luna è arida in superficie, ma per miliardi di anni il vento solare ha depositato idrogeno invisibile nella polvere. Dobbiamo solo riscaldarla per dissetarci.»',
        branch: 'LUNAR',
        costHours: 32,
        creditsCost: 600,
        computeCost: 250,
        prerequisites: ['heavy_drill'],
        effects: ['Sblocca: STR-C08 (Pirolizzatore di Regolite)'],
        tier: 2,
        icon: '🔥',
    },

    advanced_hydrogen_combustion: {
        id: 'advanced_hydrogen_combustion',
        name: 'Cogenerazione Stoichiometrica H\u2082/O\u2082',
        description: 'Ottimizza i rapporti di miscelazione dei flussi gassosi LOX/LH\u2082 per la combustione ad altissimo rendimento senza corrosione termica, sbloccando STR-B06.',
        flavor: '«La reazione produce energia pura e rilascia solo vapore d\'acqua super-riscaldato. Energia e acqua, i due pilastri della nostra sopravvivenza.»',
        branch: 'TERRESTRIAL',
        costHours: 48,
        creditsCost: 800,
        computeCost: 350,
        prerequisites: ['fuel_cell'],
        effects: ['Sblocca: STR-B06 (Centrale Termochimica a Idrogeno)'],
        tier: 2,
        icon: '⚙️',
    },

    geothermal_regolith_power: {
        id: 'geothermal_regolith_power',
        name: 'Sonde Termoelettriche Deep-Well',
        description: 'Sviluppa scambiatori termici verticali a condensazione di fluidi organici adatti a profondità lunari fino a 10 metri per sbloccare il generatore STR-B05.',
        flavor: '«A dieci metri di profondità, la temperatura non conosce le oscillazioni solari. La Luna conserva una stabilità geologica che possiamo convertire in corrente.»',
        branch: 'TERRESTRIAL',
        costHours: 60,
        creditsCost: 1000,
        computeCost: 450,
        prerequisites: ['heavy_drill'],
        effects: ['Sblocca: STR-B05 (Generatore Termo-Regolite)'],
        tier: 2,
        icon: '🌋',
    },

    antigravity_materials: {
        id: 'antigravity_materials',
        name: 'Leghe Seleniche Ultra-Leggere',
        description: 'Sfrutta l\'ambiente a bassa gravità (0.166g) per la sinterizzazione laser a polvere di materiali compositi a matrice metallica (MMC) e schiume metalliche, sbloccando STR-C07 ed STR-E06.',
        flavor: '«Sulla Terra queste leghe collasserebbero durante la solidificazione. Qui, nella quiete gravitazionale della Luna, le molecole si allineano in strutture perfette e ultraleggere.»',
        branch: 'TERRESTRIAL',
        costHours: 240,
        creditsCost: 4000,
        computeCost: 1600,
        prerequisites: ['nuclear_reactor'],
        effects: [
            'Sblocca: STR-C07 (Fonderia Laser)',
            'Sblocca: STR-E06 (Spazioporto Commerciale)'
        ],
        tier: 3,
        icon: '🛸',
    },
};

// Catalogo come array ordinato per presentazione
export const RESEARCH_LIST = Object.values(RESEARCH);

// Helper: verifica se una ricerca è sbloccabile dato l'insieme dei completati
export function isResearchAvailable(id: ResearchId, completed: ResearchId[]): boolean {
    const def = RESEARCH[id];
    return def.prerequisites.every(p => completed.includes(p));
}
