import React from 'react';

interface SectionCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function SectionCard({ title, children, className = '' }: SectionCardProps) {
    return (
        <div className={`rounded-2xl flex flex-col gap-4 p-5 ${className}`}
            style={{
                background: 'rgba(8, 16, 32, 0.65)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                <span className="w-4 h-px bg-gray-600 inline-block" />
                {title}
                <span className="flex-1 h-px bg-gray-800 inline-block" />
            </p>
            {children}
        </div>
    );
}
