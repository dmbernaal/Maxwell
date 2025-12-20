/**
 * Maxwell Canvas Component
 * 
 * The right-side panel that displays all Maxwell-specific information:
 * - Phase progress
 * - Sub-queries
 * - Sources
 * - Verification results
 * 
 * Slides in from the right when Maxwell mode starts processing.
 * 
 * @module components/maxwell/MaxwellCanvas
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { PhaseProgress } from './PhaseProgress';
import { SubQueryList } from './SubQueryList';
import { SourcesPanel } from './SourcesPanel';
import { VerificationPanel } from './VerificationPanel';
import type { ExecutionPhase, PhaseDurations, SubQuery, SearchMetadata, MaxwellSource, VerificationOutput } from '../../lib/maxwell/types';
import type { VerificationProgress } from '../../hooks/use-maxwell';

interface MaxwellCanvasProps {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    sources: MaxwellSource[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    phaseDurations: PhaseDurations;
    onClose: () => void;
}

export function MaxwellCanvas({
    phase,
    subQueries,
    searchMetadata,
    sources,
    verification,
    verificationProgress,
    phaseDurations,
    onClose,
}: MaxwellCanvasProps) {
    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 40,
            }}
            className="fixed top-0 right-0 h-full w-full md:w-[45%] lg:w-[40%] bg-[#120F14] border-l border-white/5 z-40 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-brand-accent" />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-white">Maxwell Canvas</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">
                            Verified Search Agent
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <X className="w-4 h-4 text-white/40" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar">
                {/* Phase Progress */}
                <PhaseProgress phase={phase} phaseDurations={phaseDurations} />

                {/* Sub-queries */}
                <SubQueryList subQueries={subQueries} searchMetadata={searchMetadata} />

                {/* Sources */}
                <SourcesPanel sources={sources} />

                {/* Verification */}
                <VerificationPanel
                    verification={verification}
                    progress={verificationProgress}
                />

                {/* Empty State */}
                {phase === 'idle' && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-white/20" />
                        </div>
                        <p className="text-sm text-white/40">
                            Submit a query to start the Maxwell pipeline
                        </p>
                        <p className="text-[11px] text-white/20 mt-1">
                            Decompose → Search → Synthesize → Verify
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/5 bg-[#0d0b10]">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/20 uppercase tracking-wider">
                        Multi-signal verification
                    </span>
                    {phaseDurations.total && (
                        <span className="text-[9px] font-mono text-white/30">
                            {(phaseDurations.total / 1000).toFixed(1)}s
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
