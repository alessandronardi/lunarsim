import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { sendChatMessageToGemini, type ChatMessage } from '../utils/geminiService';
import { 
  X, 
  Send, 
  Wifi, 
  WifiOff, 
  Trash2, 
  Terminal, 
  AlertTriangle 
} from 'lucide-react';

interface AIUplinkPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIUplinkPanel({ isOpen, onClose }: AIUplinkPanelProps) {
  const gameState = useGameStore();
  
  // Stati per la chat
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('lunarsim_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Messaggio iniziale di benvenuto del Controllo Missione
    return [
      {
        role: 'model',
        text: 'Qui Houston, Controllo Missione Selene. Canale uplink stabilito. Trasmetteteci la telemetria della base o sottoponeteci qualsiasi anomalia. Siamo pronti ad assistervi, SCC.'
      }
    ];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeState, setIncludeState] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Stato per la connessione al proxy della Terra
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Controlla la disponibilità della chiave API sul server di controllo terrestre
  const checkConnection = async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(!!data.hasApiKey);
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  // Salva la cronologia dei messaggi in local storage
  useEffect(() => {
    localStorage.setItem('lunarsim_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Scorrimento automatico in fondo alla chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleClearChat = () => {
    if (window.confirm("Sei sicuro di voler cancellare tutta la cronologia delle comunicazioni con la Terra?")) {
      const initial = [
        {
          role: 'model',
          text: 'Uplink radio resettato. Controllo Missione a terra pronto. Quali sono le vostre direttive, SCC?'
        }
      ] as ChatMessage[];
      setMessages(initial);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setErrorMsg(null);

    // Aggiungi il messaggio dell'utente alla lista
    const newMessages = [...messages, { role: 'user', text: userText } as ChatMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Ottieni la risposta dall'API
      const reply = await sendChatMessageToGemini(
        newMessages,
        includeState ? gameState : null
      );

      setMessages(prev => [...prev, { role: 'model', text: reply } as ChatMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Errore di comunicazione radio. Riprovare.');
      // Rimuovi l'ultimo messaggio dell'utente per permettergli di riprovare, 
      // o tienilo e mostra l'errore sotto. Teniamo il messaggio e mostriamo l'errore.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="absolute inset-y-0 right-0 z-50 flex flex-col w-96 border-l border-mc-border/80 text-mc-text shadow-2xl transition-all duration-300 ease-in-out"
      style={{ background: 'rgba(7, 12, 22, 0.95)', backdropFilter: 'blur(20px)' }}
    >
      {/* ── HEADER DEL PANNELLO ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border/60 shrink-0 bg-mc-surface/40">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-mc-cyan animate-pulse-slow" />
          <h2 className="font-title font-bold text-xs uppercase tracking-wider text-mc-cyan">
            HOUSTON UPLINK
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Indicatore di Stato */}
          <div 
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-mc-void/60 border border-mc-border"
            title={isConnected ? "Canale radio terrestre stabilito" : "Chiave API mancante. Collegamento offline."}
          >
            {isConnected ? (
              <>
                <Wifi size={12} className="text-mc-green animate-pulse-slow" />
                <span className="font-mono text-[8px] font-semibold text-mc-green tracking-wider uppercase">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-mc-red animate-pulse-slow" />
                <span className="font-mono text-[8px] font-semibold text-mc-red tracking-wider uppercase">OFFLINE</span>
              </>
            )}
          </div>

          {/* Reset Chat */}
          <button 
            onClick={handleClearChat}
            className="p-1.5 rounded text-mc-dim hover:text-mc-red hover:bg-mc-border/30 transition-colors"
            title="Azzera registro comunicazioni"
          >
            <Trash2 size={14} />
          </button>

          {/* Chiudi Pannello */}
          <button 
            onClick={onClose}
            className="p-1.5 rounded text-mc-dim hover:text-mc-cyan hover:bg-mc-border/30 transition-colors"
            title="Nascondi canale radio"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── NOTIFICHE / ERRORI DI COMUNICAZIONE ─────────────────────── */}
      {errorMsg && (
        <div className="px-4 py-2 bg-mc-red/10 border-b border-mc-red/30 text-mc-red shrink-0 flex gap-2 items-center text-xs font-mono">
          <AlertTriangle size={14} className="shrink-0" />
          <div className="flex-1 overflow-hidden overflow-ellipsis">{errorMsg}</div>
        </div>
      )}

      {/* ── CORPO DELLA CHAT (LOG DEI MESSAGGI) ─────────────────────── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
        {messages.map((msg, index) => {
          const isHouston = msg.role === 'model';
          return (
            <div 
              key={index}
              className={`flex flex-col max-w-[85%] ${isHouston ? 'self-start align-left' : 'self-end ml-auto'}`}
            >
              {/* Mittente */}
              <span className={`text-[9px] uppercase tracking-widest font-semibold mb-1 ${isHouston ? 'text-mc-cyan' : 'text-mc-dim text-right'}`}>
                {isHouston ? '✦ HOUSTON_CONTROL' : '✦ SCC_CORE'}
              </span>
              
              {/* Messaggio */}
              <div 
                className={`p-2.5 rounded-lg border leading-relaxed whitespace-pre-wrap ${
                  isHouston 
                    ? 'bg-mc-panel/50 border-mc-cyan/20 text-mc-text shadow-mc-glow-cyan/5' 
                    : 'bg-mc-void/60 border-mc-border/80 text-mc-dim'
                }`}
                style={{
                  borderLeft: isHouston ? '2px solid #00d4ff' : undefined,
                  borderRight: !isHouston ? '2px solid #64748b' : undefined,
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Indicatore di caricamento (Typing State) */}
        {isLoading && (
          <div className="flex flex-col max-w-[85%] self-start animate-pulse">
            <span className="text-[9px] uppercase tracking-widest font-semibold mb-1 text-mc-cyan">
              ✦ HOUSTON_CONTROL
            </span>
            <div className="p-2.5 rounded-lg bg-mc-panel/30 border border-mc-cyan/10 text-mc-cyan flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-mc-cyan animate-ping"></span>
              <span className="font-mono text-[10px] tracking-wide uppercase">Tasso di trasmissione radio: 2.4 KB/s... Ricezione dati...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── AREA DI INPUT (INVIO MESSAGGIO) ─────────────────────────── */}
      <div className="p-3 border-t border-mc-border/60 bg-mc-surface/30 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || !isConnected}
            placeholder={
              !isConnected 
                ? "Configura la chiave API per connetterti..." 
                : "Invia messaggio all'uplink radio..."
            }
            className="flex-1 bg-mc-void border border-mc-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-mc-cyan focus:shadow-mc-glow-cyan text-mc-text font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button 
            type="submit"
            disabled={inputValue.trim() === '' || isLoading || !isConnected}
            className="p-2 bg-mc-cyan/15 hover:bg-mc-cyan text-mc-cyan hover:text-mc-void border border-mc-cyan/40 hover:border-mc-cyan rounded-lg transition-all shadow-mc-glow-cyan disabled:opacity-30 disabled:pointer-events-none"
            title="Trasmetti segnale alla Terra"
          >
            <Send size={14} />
          </button>
        </form>
        
        {/* Opzione Invia Telemetria */}
        <div className="flex items-center gap-2 mt-2 px-1 font-mono text-[9px] text-mc-dim select-none justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-mc-text transition-colors">
            <input 
              type="checkbox"
              checked={includeState}
              onChange={(e) => setIncludeState(e.target.checked)}
              className="rounded bg-mc-void border-mc-border text-mc-cyan focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
            />
            <span>Allega telemetria base (GameState)</span>
          </label>
          
          <span className="text-[8px] text-mc-muted italic">Gemini 3.5 Flash Model</span>
        </div>
      </div>
    </div>
  );
}
