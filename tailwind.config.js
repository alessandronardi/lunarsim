/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // === PALETTE MISSION CONTROL ===
        // Background e superfici
        'mc-void': '#070a0f',   // sfondo assoluto
        'mc-surface': '#0d1117',   // pannelli principali
        'mc-panel': '#111827',   // card e sidebar
        'mc-border': '#1f2937',   // bordi sottili
        'mc-muted': '#374151',   // elementi disabilitati

        // Testo
        'mc-text': '#e2e8f0',   // testo primario
        'mc-dim': '#64748b',   // testo secondario
        'mc-faint': '#2d3748',   // testo fantasma

        // Accenti operativi
        'mc-cyan': '#00d4ff',   // segnale / attivo
        'mc-green': '#00ff88',   // OK / produzione
        'mc-amber': '#ffb800',   // warning / alba-tramonto
        'mc-red': '#ff3b3b',   // errore / danno critico
        'mc-purple': '#a855f7',   // ricerca / R&D
        'mc-blue': '#3b82f6',   // notte / informazioni

        // Fasi lunari
        'phase-alba': '#ffb830',
        'phase-giorno': '#fff5cc',
        'phase-tramonto': '#ff8c42',
        'phase-notte': '#1e3a5f',
        'phase-prealba': '#2d2054',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'sans-serif'],
        title: ['"Exo 2"', '"Inter"', 'ui-sans-serif', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 4s ease-in-out infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
          '75%': { opacity: '0.92' },
        },
        scan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      boxShadow: {
        'mc-glow-cyan': '0 0 8px rgba(0, 212, 255, 0.4)',
        'mc-glow-green': '0 0 8px rgba(0, 255, 136, 0.4)',
        'mc-glow-amber': '0 0 8px rgba(255, 184, 0, 0.4)',
        'mc-glow-red': '0 0 8px rgba(255, 59, 59, 0.5)',
      },
    },
  },
  plugins: [],
};
