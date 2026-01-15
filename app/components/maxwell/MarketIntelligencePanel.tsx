'use client';

import React, { useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

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
import type { UnifiedMarket } from '../../lib/markets/types';
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
    onRunAnalysis?: (forceRefresh?: boolean) => void;
    market?: UnifiedMarket;
    isCached?: boolean;
    cacheTimestamp?: number;
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
    onQuery,
    onRunAnalysis,
    market,
    isCached,
    cacheTimestamp
}: MarketIntelligencePanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if ((phase === 'verification' || phase === 'adjudication') && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    const hasReport = answer || verification || isAnalyzing;
    
    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full rounded-xl bg-[#101010] border border-white/[0.06] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.05)]">
            <div className="h-12 min-h-[48px] flex items-center justify-between px-5 shrink-0">
                <div className="flex items-center gap-2">
                    {isAnalyzing && (
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center justify-center w-2 h-2">
                                <span className="absolute inset-0 rounded-full bg-brand-accent/40 animate-ping" />
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent relative z-10" />
                            </div>
                            <span className="text-[11px] font-mono text-white/40">
                                Analyzing...
                            </span>
                        </div>
                    )}
                    {!isAnalyzing && isCached && cacheTimestamp && (
                        <span className="text-[11px] text-white/25 font-mono">
                            {formatTimestamp(cacheTimestamp)}
                        </span>
                    )}
                    {!isAnalyzing && !isCached && !hasReport && (
                        <span className="text-[11px] text-white/20 font-mono">
                            No report yet
                        </span>
                    )}
                </div>

                {onRunAnalysis && (
                    <button 
                        onClick={() => onRunAnalysis(!!hasReport)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed text-white/50 hover:text-white/80 transition-all text-[11px] font-medium"
                    >
                        {hasReport ? (
                            <>
                                <RefreshCw size={11} className={isAnalyzing ? 'animate-spin' : ''} />
                                Re-run
                            </>
                        ) : (
                            'Run Analysis'
                        )}
                    </button>
                )}
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 pb-4 scroll-smooth custom-scrollbar"
            >
                {!hasReport && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                        <p className="text-[13px] text-white/25 text-center max-w-[220px] leading-relaxed">
                            Run analysis to get AI-powered insights with verified sources.
                        </p>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="py-4">
                        <PhaseProgress 
                            phase={phase} 
                            phaseDurations={phaseDurations} 
                            phaseStartTimes={phaseStartTimes} 
                        />
                    </div>
                )}

                {hasReport && (
                    <div className="space-y-6 pt-2">
                        {(adjudication || phase === 'adjudication' || phase === 'complete') && (
                            <VerdictCard 
                                adjudication={adjudication} 
                                confidence={verification?.overallConfidence || 0}
                                phase={phase}
                            />
                        )}

                        {(verification || verificationProgress) && (
                            <div className="rounded-xl bg-white/[0.02] p-4">
                                <VerificationPanel 
                                    verification={verification} 
                                    progress={verificationProgress} 
                                    sources={sources} 
                                />
                            </div>
                        )}

                        {answer && (
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/20 mb-3 block">
                                    Analysis
                                </span>
                                <ResponseDisplay 
                                    message={messageAdapter} 
                                    status={isAnalyzing ? 'thinking' : 'relaxed'} 
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="px-4 py-3 shrink-0">
                <InputInterface 
                    state={isAnalyzing ? 'thinking' : 'relaxed'}
                    hasMessages={true}
                    onQuery={(q) => onQuery(q)}
                    mode="maxwell"
                    hideSuggestions
                />
            </div>
        </div>
    );
}
