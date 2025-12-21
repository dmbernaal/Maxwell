/**
 * Phase Progress Component
 * 
 * Shows the current Maxwell pipeline phase with animated progress.
 * Displays: Analyzing → Searching → Synthesizing → Verifying
 * 
 * @module components/maxwell/PhaseProgress
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, FileText, Shield, CheckCircle, Loader2 } from 'lucide-react';
import type { ExecutionPhase, PhaseDurations } from '../../lib/maxwell/types';

const PHASES = [
    { id: 'decomposition', label: 'Analyzing', icon: Brain },
    { id: 'search', label: 'Searching', icon: Search },
    { id: 'synthesis', label: 'Synthesizing', icon: FileText },
    { id: 'verification', label: 'Verifying', icon: Shield },
] as const;

interface PhaseProgressProps {
    phase: ExecutionPhase;
    phaseDurations: PhaseDurations;
    phaseStartTimes: Record<string, number>;
}

export function PhaseProgress({ phase, phaseDurations, phaseStartTimes }: PhaseProgressProps) {
    const [elapsed, setElapsed] = React.useState(0);

    // Update elapsed time for active phase
    React.useEffect(() => {
        if (phase === 'idle' || phase === 'complete' || phase === 'error') return;

        const startTime = phaseStartTimes[phase];
        if (!startTime) return;

        const interval = setInterval(() => {
            setElapsed(Date.now() - startTime);
        }, 50);

        return () => clearInterval(interval);
    }, [phase, phaseStartTimes]);

    if (phase === 'idle') return null;

    const currentIdx = PHASES.findIndex((p) => p.id === phase);
    const currentPhase = PHASES[currentIdx];
    const isComplete = phase === 'complete';

    // Determine duration to show
    let displayDuration = 0;
    if (isComplete) {
        // If complete, show total duration if available, or sum of phases?
        // Actually, phaseDurations.total is set on complete.
        displayDuration = phaseDurations.total || 0;
    } else if (currentPhase) {
        // If active, show live elapsed time
        displayDuration = elapsed;
    } else {
        // Fallback
        displayDuration = 0;
    }

    return (
        <div className="w-full font-mono">
            {/* Terminal Status Line */}
            <div className="flex items-center justify-between px-1 py-2">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
                            Current Process
                        </span>
                        <span className="text-[13px] text-white/80 font-medium tracking-tight">
                            {isComplete ? 'Processing Complete' : currentPhase?.label || 'Initializing...'}
                        </span>
                    </div>
                </div>

                {/* Timer */}
                <div className="text-right">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-0.5">
                        Time
                    </span>
                    <span className="text-xs text-white/60 font-medium">
                        {(displayDuration / 1000).toFixed(2)}s
                    </span>
                </div>
            </div>
        </div>
    );
}
