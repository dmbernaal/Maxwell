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
    const isComplete = phase === 'complete';
    const isError = phase === 'error';

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
                    Pipeline Status
                </span>
            </div>

            {/* Phase Pills */}
            <div className="flex flex-wrap gap-2">
                {PHASES.map((p, idx) => {
                    const Icon = p.icon;
                    const isDone = idx < currentIdx || isComplete;
                    const isActive = p.id === phase && !isComplete && !isError;
                    const duration = phaseDurations[p.id as keyof PhaseDurations];

                    let bgClass = 'bg-white/5 text-white/30';
                    if (isDone) bgClass = 'bg-emerald-500/10 text-emerald-400';
                    if (isActive) bgClass = 'bg-brand-accent/10 text-brand-accent';

                    return (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium
                                border border-transparent transition-colors
                                ${bgClass}
                            `}
                        >
                            {isActive ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isDone ? (
                                <CheckCircle className="w-3 h-3" />
                            ) : (
                                <Icon className="w-3 h-3" />
                            )}
                            <span>{p.label}</span>
                            {duration && (
                                <span className="opacity-60 font-mono text-[9px]">
                                    {(duration / 1000).toFixed(1)}s
                                </span>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Total Duration */}
            {phaseDurations.total && (
                <div className="text-[10px] font-mono text-white/20">
                    Total: {(phaseDurations.total / 1000).toFixed(1)}s
                </div>
            )}
        </div>
    );
}
