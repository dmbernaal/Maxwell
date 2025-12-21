/**
 * Event Log Component
 * 
 * The "Matrix View" - shows a live stream of raw system events.
 * 
 * @module components/maxwell/EventLog
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { MaxwellEvent } from '../../lib/maxwell/types';

interface EventLogProps {
    events: MaxwellEvent[];
}

export function EventLog({ events }: EventLogProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [events]);

    if (events.length === 0) return null;

    return (
        <div className="mt-8 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
                <Terminal size={10} className="text-white/20" />
                <h3 className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    System Events
                </h3>
            </div>

            <div className="h-32 overflow-y-auto font-mono text-[10px] space-y-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {events.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-white/40 hover:text-white/60 transition-colors">
                        <span className="text-white/20 shrink-0">
                            {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="flex-1 break-all">
                            <span className="text-emerald-500/50 mr-2">[{event.type}]</span>
                            {renderEventData(event)}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function renderEventData(event: MaxwellEvent): React.ReactNode {
    switch (event.type) {
        case 'phase-start':
            return <span className="text-white/60">Starting phase: {event.phase}</span>;
        case 'search-progress':
            return <span>Indexed: {event.data.query} ({event.data.sourcesFound} sources)</span>;
        case 'verification-progress':
            return <span>{event.data.status}</span>;
        case 'complete':
            return <span className="text-emerald-400">Pipeline execution complete.</span>;
        case 'error':
            return <span className="text-rose-400">Error: {event.message}</span>;
        default:
            return null;
    }
}
