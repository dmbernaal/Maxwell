'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import type { MaxwellEvent } from '../../lib/maxwell/types';

interface EventLogProps {
    events: MaxwellEvent[];
}

export function EventLog({ events }: EventLogProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Default to true so it follows logs initially
    const isAutoScrollEnabled = useRef(true);

    // Robust position checking
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        // 30px threshold for stickiness
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        isAutoScrollEnabled.current = distanceFromBottom <= 30;
    }, []);

    // Scroll effect when events change
    useEffect(() => {
        const el = containerRef.current;
        if (el && isAutoScrollEnabled.current) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'instant' as ScrollBehavior });
        }
    }, [events]); // Trigger on new events

    if (events.length === 0) return null;

    return (
        <div className="mt-8 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
                <Terminal size={10} className="text-white/20" />
                <h3 className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    System Events
                </h3>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-32 overflow-y-auto font-mono text-[10px] space-y-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
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
