'use client';

import React, { useRef, useEffect } from 'react';
import { Share2, Download, Sparkles } from 'lucide-react';

import { VerdictCard } from './VerdictCard';
import { VerificationPanel } from './VerificationPanel';
import ResponseDisplay from '../ResponseDisplay';
import InputInterface from '../InputInterface';
import { PhaseProgress } from './PhaseProgress';

import type { 
    ExecutionPhase, 
    PhaseDurations, 
    SubQuery, 
    SearchMetadata, 
    MaxwellSource, 
    VerificationOutput, 
    MaxwellEvent,
    MaxwellState 
} from '../../lib/maxwell/types';
import type { VerificationProgress } from '../../hooks/use-maxwell';
import type { ExecutionConfig } from '../../lib/maxwell/configFactory';
import { Message, Source } from '../../types';

interface MarketIntelligencePanelProps {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    answer: string;
    adjudication: string | null;
    config?: ExecutionConfig;
    onQuery: (query: string) => void;
    onClose?: () => void;
}

export function MarketIntelligencePanel({
    phase,
    subQueries,
    sources,
    searchMetadata,
    verification,
    verificationProgress,
    phaseDurations,
    phaseStartTimes,
    events,
    answer,
    adjudication,
    config,
    onQuery
}: MarketIntelligencePanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if ((phase === 'verification' || phase === 'adjudication') && scrollRef.current) {
            
        }
    }, [phase]);

    const mappedSources: Source[] = sources.map(s => ({
        title: s.title,
        url: s.url,
        content: s.snippet,
        score: 1 
    }));

    const messageAdapter: Message | null = answer ? {
        id: 'market-intel-current',
        role: 'agent',
        content: answer,
        timestamp: Date.now(),
        sources: mappedSources,
        maxwellState: {
            phase,
            subQueries,
            searchMetadata,
            sources,
            answer,
            verification,
            adjudication,
            error: null,
            phaseDurations,
            config
        } as MaxwellState
    } : null;

    const isAnalyzing = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

    return (
        <div className="flex flex-col h-full bg-[#18151d] border-l border-white/5 relative overflow-hidden">
            <div className="h-14 min-h-[56px] flex items-center justify-between px-6 border-b border-white/5 bg-[#18151d] z-20">
                <div className="flex items-center gap-3">
                    {isAnalyzing ? (
                        <div className="relative flex items-center justify-center w-4 h-4">
                            <span className="absolute inset-0 rounded-full bg-brand-accent/30 animate-ping" />
                            <Sparkles size={14} className="text-brand-accent relative z-10" />
                        </div>
                    ) : (
                        <Sparkles size={14} className="text-white/20" />
                    )}
                    <span className="text-xs font-mono font-medium uppercase tracking-widest text-white/60">
                        {isAnalyzing ? 'Analyzing Market...' : 'Market Intelligence'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                        <Share2 size={14} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                        <Download size={14} />
                    </button>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scroll-smooth custom-scrollbar"
            >
                {isAnalyzing && (
                    <div className="mb-6">
                        <PhaseProgress 
                            phase={phase} 
                            phaseDurations={phaseDurations} 
                            phaseStartTimes={phaseStartTimes} 
                        />
                    </div>
                )}

                {(adjudication || phase === 'adjudication' || phase === 'complete') && (
                    <section>
                        <VerdictCard 
                            adjudication={adjudication} 
                            confidence={verification?.overallConfidence || 0}
                            phase={phase}
                        />
                    </section>
                )}

                {(verification || verificationProgress) && (
                    <section className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <VerificationPanel 
                            verification={verification} 
                            progress={verificationProgress} 
                            sources={sources} 
                        />
                    </section>
                )}

                {answer && (
                    <section>
                        <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-4 px-1">
                            Deep Analysis
                        </h3>
                        <div className="min-h-[100px]">
                            <ResponseDisplay 
                                message={messageAdapter} 
                                status={isAnalyzing ? 'thinking' : 'relaxed'} 
                            />
                        </div>
                    </section>
                )}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#18151d]/95 backdrop-blur-md z-30">
                <div className="max-w-full">
                    <InputInterface 
                        state={isAnalyzing ? 'thinking' : 'relaxed'}
                        hasMessages={true}
                        onQuery={(q) => onQuery(q)}
                        mode="maxwell"
                    />
                </div>
            </div>
        </div>
    );
}
