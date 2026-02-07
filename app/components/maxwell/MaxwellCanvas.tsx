import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { IntelligencePanel } from './IntelligencePanel';

import type {
    ExecutionPhase,
    PhaseDurations,
    SubQuery,
    SearchMetadata,
    MaxwellSource,
    VerificationOutput,
    MaxwellEvent,
    MaxwellIntelligence
} from '../../lib/maxwell/types';
import type { VerificationProgress } from '../../hooks/use-maxwell';
import type { ExecutionConfig } from '../../lib/maxwell/configFactory';

export interface MaxwellCanvasProps {
    phase: ExecutionPhase;
    subQueries: SubQuery[];
    sources: MaxwellSource[];
    searchMetadata: SearchMetadata[];
    verification: VerificationOutput | null;
    verificationProgress: VerificationProgress | null;
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
    events: MaxwellEvent[];
    onClose: () => void;
    reasoning?: string;
    config?: ExecutionConfig;
    answer?: string;
    adjudication?: string | null;
    intelligence?: MaxwellIntelligence | null;
}

export function MaxwellCanvas({
    phase,
    subQueries,
    sources,
    searchMetadata,
    verification,
    verificationProgress,
    phaseDurations,
    phaseStartTimes,
    events,
    onClose,
    config,
    answer = '',
    adjudication = null,
    intelligence
}: MaxwellCanvasProps) {
    const isAnalyzing = phase !== 'idle' && phase !== 'complete';

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0a0a0a] shadow-2xl md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-[600px] md:max-w-[90vw] md:rounded-2xl md:border md:border-[#2a2a2a] md:z-40"
        >
            <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]/95 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-medium text-white/90 tracking-tight">
                        Maxwell Intelligence
                    </h2>
                    {phaseDurations.total && (
                        <span className="text-[10px] font-mono text-white/30">
                            {(phaseDurations.total / 1000).toFixed(1)}s
                        </span>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="p-2 -mr-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
                <IntelligencePanel
                    data={intelligence || null}
                    isLoading={isAnalyzing}
                    error={null}
                    onRetry={() => onClose()}
                    phase={phase}
                    sourceCount={sources.length}
                    verificationProgress={verificationProgress}
                    phaseDurations={phaseDurations}
                    phaseStartTimes={phaseStartTimes}
                />
            </div>
        </motion.div>
    );
}
