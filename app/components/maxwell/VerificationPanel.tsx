/**
 * Verification Panel Component
 * 
 * The "Killer Feature" - shows verified claims with evidence and confidence.
 * Collapsible claim rows with verdicts (SUPPORTED, NEUTRAL, CONTRADICTED).
 * 
 * @module components/maxwell/VerificationPanel
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Quote } from 'lucide-react';
import type { VerificationOutput, VerifiedClaim } from '../../lib/maxwell/types';
import type { VerificationProgress } from '../../hooks/use-maxwell';

interface VerificationPanelProps {
    verification: VerificationOutput | null;
    progress: VerificationProgress | null;
}

function ConfidenceBadge({ score }: { score: number }) {
    let colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
    if (score >= 70) colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    else if (score >= 40) colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${colorClass}`}>
            {score}%
        </span>
    );
}

function ClaimRow({ claim }: { claim: VerifiedClaim }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const verdictConfig = {
        SUPPORTED: {
            icon: CheckCircle,
            colorClass: 'text-emerald-500',
            bgClass: 'bg-emerald-500/5',
        },
        NEUTRAL: {
            icon: AlertTriangle,
            colorClass: 'text-amber-500',
            bgClass: 'bg-amber-500/5',
        },
        CONTRADICTED: {
            icon: XCircle,
            colorClass: 'text-red-500',
            bgClass: 'bg-red-500/5',
        },
    };

    const config = verdictConfig[claim.entailment] || verdictConfig.NEUTRAL;
    const Icon = config.icon;

    return (
        <div className={`rounded-lg overflow-hidden ${isExpanded ? config.bgClass : 'hover:bg-white/[0.02]'}`}>
            {/* Claim Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-start gap-3 p-3 text-left transition-colors"
            >
                <Icon className={`w-4 h-4 ${config.colorClass} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-snug">{claim.text}</p>
                </div>
                <span className="text-[10px] font-mono text-white/40 shrink-0">
                    {Math.round(claim.confidence * 100)}%
                </span>
                {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-white/30 shrink-0" />
                ) : (
                    <ChevronDown className="w-3 h-3 text-white/30 shrink-0" />
                )}
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 ml-7 space-y-3">
                            {/* Reasoning */}
                            <div className="p-2 rounded bg-black/20 border border-white/5">
                                <div className="text-[9px] font-medium uppercase tracking-wider text-white/30 mb-1">
                                    Reasoning
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed">
                                    {claim.entailmentReasoning}
                                </p>
                            </div>

                            {/* Evidence */}
                            <div className="p-2 rounded bg-black/20 border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Quote className="w-3 h-3 text-white/20" />
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">
                                        Evidence
                                    </span>
                                    <span className="text-[9px] text-white/20 font-mono">
                                        [{claim.bestMatchingSource.sourceIndex + 1}]
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed italic">
                                    "{claim.bestMatchingSource.passage}"
                                </p>
                                <p className="text-[9px] text-white/30 mt-1 truncate">
                                    — {claim.bestMatchingSource.sourceTitle}
                                </p>
                            </div>

                            {/* Issues */}
                            {claim.issues.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {claim.issues.map((issue: string, i: number) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] border border-red-500/20"
                                        >
                                            {issue}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function VerificationPanel({ verification, progress }: VerificationPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Show progress if verifying but not complete
    if (!verification && !progress) return null;

    return (
        <div className="space-y-3">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-accent" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">
                        Fact Check
                    </span>
                    {verification && <ConfidenceBadge score={verification.overallConfidence} />}
                </div>
                <div className="flex items-center gap-2">
                    {verification && (
                        <div className="flex items-center gap-2 text-[9px] font-mono">
                            <span className="text-emerald-500">{verification.summary.supported} ✓</span>
                            <span className="text-amber-500">{verification.summary.uncertain} ?</span>
                            <span className="text-red-500">{verification.summary.contradicted} ✗</span>
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                    )}
                </div>
            </button>

            {/* Progress indicator */}
            {progress && !verification && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-accent/5 border border-brand-accent/10"
                >
                    <motion.div
                        className="w-2 h-2 rounded-full bg-brand-accent"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[11px] text-brand-accent">
                        Verifying claim {progress.current}/{progress.total}...
                    </span>
                </motion.div>
            )}

            {/* Claims List */}
            <AnimatePresence>
                {isExpanded && verification && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-1 rounded-xl border border-white/5 bg-[#18151d]/50 overflow-hidden">
                            {verification.claims.map((claim, idx) => (
                                <motion.div
                                    key={claim.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                >
                                    <ClaimRow claim={claim} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
