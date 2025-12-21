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

    // Calculate total duration for waterfall
    const durations = {
        decomposition: phaseDurations.decomposition || (phase === 'decomposition' ? elapsed : 0),
        search: phaseDurations.search || (phase === 'search' ? elapsed : 0),
        synthesis: phaseDurations.synthesis || (phase === 'synthesis' ? elapsed : 0),
        verification: phaseDurations.verification || (phase === 'verification' ? elapsed : 0),
    };

    const totalDuration = Object.values(durations).reduce((a, b) => a + b, 0);

    // Determine display duration (total or current phase)
    let displayDuration = 0;
    if (isComplete) {
        displayDuration = phaseDurations.total || totalDuration;
    } else if (currentPhase) {
        displayDuration = elapsed;
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

            {/* Latency Waterfall */}
            <div className="mt-2 px-1">
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                    {/* Decomposition */}
                    {durations.decomposition > 0 && (
                        <div
                            className="h-full bg-indigo-500/50"
                            style={{ width: `${(durations.decomposition / totalDuration) * 100}%` }}
                        />
                    )}
                    {/* Search */}
                    {durations.search > 0 && (
                        <div
                            className="h-full bg-sky-500/50"
                            style={{ width: `${(durations.search / totalDuration) * 100}%` }}
                        />
                    )}
                    {/* Synthesis */}
                    {durations.synthesis > 0 && (
                        <div
                            className="h-full bg-violet-500/50"
                            style={{ width: `${(durations.synthesis / totalDuration) * 100}%` }}
                        />
                    )}
                    {/* Verification */}
                    {durations.verification > 0 && (
                        <div
                            className="h-full bg-emerald-500/50"
                            style={{ width: `${(durations.verification / totalDuration) * 100}%` }}
                        />
                    )}
                </div>

                {/* Waterfall Legend */}
                <div className="flex justify-between mt-1.5">
                    {Object.entries(durations).map(([key, duration]) => {
                        if (duration === 0) return null;
                        const colorMap: Record<string, string> = {
                            decomposition: 'text-indigo-400',
                            search: 'text-sky-400',
                            synthesis: 'text-violet-400',
                            verification: 'text-emerald-400'
                        };
                        return (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className={`w-1 h-1 rounded-full ${colorMap[key].replace('text', 'bg')}`} />
                                <span className={`text-[9px] uppercase tracking-wider ${colorMap[key]} opacity-60`}>
                                    {(duration / 1000).toFixed(1)}s
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
