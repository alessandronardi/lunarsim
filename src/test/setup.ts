// Mock localStorage for Vitest (environment: 'node')
// Needed because zustand/persist tries to read/write localStorage,
// which does not exist in Node.js — causing a flood of stderr warnings
// and potential memory pressure from repeated failed writes.
//
// vi.stubGlobal is the official Vitest API to inject globals into the
// Node environment before any module loads.

import { vi } from 'vitest';

const store: Record<string, string> = {};

vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
} satisfies Storage);
