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
    let colorClass = 'text-red-400';
    if (score >= 70) colorClass = 'text-emerald-400';
    else if (score >= 40) colorClass = 'text-amber-400';

    return (
        <span className={`text-[10px] font-mono ${colorClass}`}>
            CONFIDENCE: {score}%
        </span>
    );
}

function ClaimRow({ claim }: { claim: VerifiedClaim }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const verdictConfig = {
        SUPPORTED: {
            label: '[VERIFIED]',
            colorClass: 'text-emerald-500',
        },
        NEUTRAL: {
            label: '[UNCERTAIN]',
            colorClass: 'text-amber-500',
        },
        CONTRADICTED: {
            label: '[DISPUTED]',
            colorClass: 'text-rose-500',
        },
    };

    const config = verdictConfig[claim.entailment] || verdictConfig.NEUTRAL;

    return (
        <div className={`rounded-lg overflow-hidden border border-white/5 transition-all duration-300 ${isExpanded ? 'bg-white/[0.04]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}>
            {/* Claim Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-start gap-4 p-4 text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[9px] font-mono tracking-wider ${config.colorClass}`}>
                            {config.label}
                        </span>
                        <span className="text-[9px] font-mono text-white/20">
                            ID: {claim.id.slice(0, 8)}
                        </span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed font-light">
                        {claim.text}
                    </p>
                </div>
                <span className="text-[10px] font-mono text-white/30 shrink-0 mt-1">
                    {Math.round(claim.confidence * 100)}%
                </span>
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
                        <div className="px-4 pb-4 pt-0 space-y-4">
                            <div className="h-[1px] w-full bg-white/5" />

                            {/* Reasoning */}
                            <div>
                                <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
                                    Analysis
                                </div>
                                <p className="text-[11px] text-white/60 leading-relaxed">
                                    {claim.entailmentReasoning}
                                </p>
                            </div>

                            {/* Evidence */}
                            <div className="bg-black/20 rounded p-3 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                                        Primary_Evidence
                                    </span>
                                    <span className="text-[9px] font-mono text-white/20">
                                        REF: [{claim.bestMatchingSource.sourceIndex + 1}]
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed italic font-serif">
                                    "{claim.bestMatchingSource.passage}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ConfidenceCircle({ score }: { score: number }) {
    const radius = 16; // Increased radius
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let colorClass = 'text-rose-400';
    if (score >= 70) colorClass = 'text-emerald-400';
    else if (score >= 40) colorClass = 'text-amber-400';

    return (
        <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-white/10"
                />
                <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/90">
                {Math.round(score)}%
            </span>
        </div>
    );
}

export function VerificationPanel({ verification, progress }: VerificationPanelProps) {
    // Show progress if verifying but not complete
    if (!verification && !progress) return null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    Verification Report
                </h3>
                {verification && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/30">CONFIDENCE</span>
                        <ConfidenceCircle score={verification.overallConfidence} />
                    </div>
                )}
            </div>

            {/* Progress indicator */}
            {progress && !verification && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                    <span className="text-[10px] font-mono text-white/60">
                        Verifying claim {progress.current} of {progress.total}...
                    </span>
                </div>
            )}

            {/* Verification Grid */}
            {verification && (
                <div className="grid grid-cols-2 gap-2">
                    {verification.claims.map((claim) => (
                        <div
                            key={claim.id}
                            className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${claim.entailment === 'SUPPORTED' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                                        claim.entailment === 'CONTRADICTED' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                                            'bg-amber-500/5 border-amber-500/20 text-amber-400'
                                    }`}>
                                    [{claim.entailment}]
                                </span>
                                <ConfidenceCircle score={claim.confidence * 100} />
                            </div>

                            <p className="text-[13px] text-white/80 leading-relaxed line-clamp-4 font-light">
                                {claim.text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
