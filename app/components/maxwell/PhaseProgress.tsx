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
}

export function PhaseProgress({ phase, phaseDurations }: PhaseProgressProps) {
    if (phase === 'idle') return null;

    const currentIdx = PHASES.findIndex((p) => p.id === phase);
    const currentPhase = PHASES[currentIdx];
    const isComplete = phase === 'complete';
    const isError = phase === 'error';

    // Calculate total time for active phase
    const activeDuration = currentPhase ? phaseDurations[currentPhase.id as keyof PhaseDurations] : 0;

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
                        {activeDuration ? (activeDuration / 1000).toFixed(2) : '0.00'}s
                    </span>
                </div>
            </div>
        </div>
    );
}
