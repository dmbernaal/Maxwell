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
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
            }}
            className="fixed top-4 right-4 bottom-4 w-[48%] bg-[#18151d] rounded-[32px] border border-white/10 shadow-2xl z-40 flex flex-col overflow-hidden"
        >
            {/* Background Pattern - Dot Matrix */}
            <div
                className="absolute inset-0 opacity-[0.15] pointer-events-none z-0"
                style={{
                    backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                }}
            />

            {/* Close Button - Absolute Top Left */}
            <button
                onClick={onClose}
                className="absolute top-6 left-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-50 group"
            >
                <X className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            </button>

            {/* Header - Minimalist & Transparent */}
            <div className="relative z-10 flex items-center justify-end px-8 pt-8 pb-2">
                {phaseDurations.total && (
                    <span className="text-[10px] font-mono text-white/30">
                        {phaseDurations.total > 0 ? `${(phaseDurations.total / 1000).toFixed(2)}s` : ''}
                    </span>
                )}
            </div>

            {/* Content - Scrollable & Left Aligned */}
            <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8 space-y-8 no-scrollbar">
                {/* Phase Progress */}
                <div className="space-y-3">
                    <PhaseProgress phase={phase} phaseDurations={phaseDurations} />
                </div>

                {/* Sub-queries */}
                <div className="space-y-3">
                    <SubQueryList subQueries={subQueries} searchMetadata={searchMetadata} />
                </div>

                {/* Verification */}
                {(verification || verificationProgress) && (
                    <div className="space-y-3">
                        <VerificationPanel
                            verification={verification}
                            progress={verificationProgress}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
