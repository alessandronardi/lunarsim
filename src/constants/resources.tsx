import React from 'react';
import {
    Zap, Cpu, Radio, Mountain, Wrench, Snowflake,
    Wind, Flame, Atom, Coins, Building2
} from 'lucide-react';
import type { Resources } from '../types/game';

export type ResDef = {
    key: keyof Resources;
    label: string;
    icon: React.ReactNode;
    color: string;
    warnBelow?: number;
};

export const RES_DEFS: ResDef[] = [
    { key: 'energy', label: 'Energia', icon: <Zap size={13} />, color: '#f0e040', warnBelow: 50 },
    { key: 'bandwidth', label: 'Banda', icon: <Radio size={13} />, color: '#60c0ff' },
    { key: 'compute', label: 'Compute', icon: <Cpu size={13} />, color: '#80ffcc' },
    { key: 'regolith', label: 'Regolite', icon: <Mountain size={13} />, color: '#c8a060', warnBelow: 20 },
    { key: 'metals', label: 'Metalli', icon: <Wrench size={13} />, color: '#a0c0e0', warnBelow: 20 },
    { key: 'ice', label: 'Ghiaccio', icon: <Snowflake size={13} />, color: '#99ddff', warnBelow: 10 },
    { key: 'oxygen', label: 'Ossigeno', icon: <Wind size={13} />, color: '#80e8b0' },
    { key: 'hydrogen', label: 'Idrogeno', icon: <Flame size={13} />, color: '#ffb060' },
    { key: 'helium3', label: 'Elio-3', icon: <Atom size={13} />, color: '#d09fff' },
    { key: 'credits', label: 'Crediti', icon: <Coins size={13} />, color: '#ffd060' },
    { key: 'cement', label: 'Cemento', icon: <Building2 size={13} />, color: '#b0b0b0' },
];
