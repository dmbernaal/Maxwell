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
            label: 'VERIFIED',
            colorClass: 'text-emerald-400',
            bgClass: 'bg-emerald-500/10',
            borderClass: 'border-emerald-500/20'
        },
        NEUTRAL: {
            label: 'UNCERTAIN',
            colorClass: 'text-amber-400',
            bgClass: 'bg-amber-500/10',
            borderClass: 'border-amber-500/20'
        },
        CONTRADICTED: {
            label: 'DISPUTED',
            colorClass: 'text-rose-400',
            bgClass: 'bg-rose-500/10',
            borderClass: 'border-rose-500/20'
        },
    };

    const config = verdictConfig[claim.entailment] || verdictConfig.NEUTRAL;
    const hasNumericMismatch = claim.numericCheck && !claim.numericCheck.match;

    return (
        <div className={`rounded-xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
            {/* Claim Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-start gap-4 p-4 text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border ${config.colorClass} ${config.bgClass} ${config.borderClass}`}>
                            {config.label}
                        </span>
                        {hasNumericMismatch && (
                            <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border text-rose-400 bg-rose-500/10 border-rose-500/20 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                NUMERIC MISMATCH
                            </span>
                        )}
                        <span className="text-[9px] font-mono text-white/20">
                            ID: {claim.id.slice(0, 8)}
                        </span>
                    </div>
                    <p className="text-[13px] text-white/80 leading-relaxed font-light">
                        {claim.text}
                    </p>
                </div>

                {/* Confidence Score - Linear Bar instead of Circle */}
                <div className="flex flex-col items-end gap-1 mt-1 min-w-[60px]">
                    <span className={`text-[10px] font-mono ${claim.confidence >= 0.7 ? 'text-emerald-400' :
                        claim.confidence >= 0.4 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                        {Math.round(claim.confidence * 100)}%
                    </span>
                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${claim.confidence >= 0.7 ? 'bg-emerald-500' :
                                claim.confidence >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                            style={{ width: `${claim.confidence * 100}%` }}
                        />
                    </div>
                </div>
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

                            {/* Numeric Diff View */}
                            {hasNumericMismatch && claim.numericCheck && (
                                <div className="bg-rose-500/5 rounded-lg p-3 border border-rose-500/10">
                                    <div className="text-[9px] font-mono text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertTriangle size={12} />
                                        Numeric Discrepancy Detected
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[9px] text-white/40 mb-1">CLAIMED VALUE</div>
                                            <div className="text-rose-300 font-mono text-xs">
                                                {claim.numericCheck.claimNumbers.join(', ')}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-white/40 mb-1">EVIDENCE VALUE</div>
                                            <div className="text-emerald-300 font-mono text-xs">
                                                {claim.numericCheck.evidenceNumbers.join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                        SOURCE: {claim.bestMatchingSource.sourceTitle}
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/50 leading-relaxed italic font-serif border-l-2 border-white/10 pl-3">
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
                <div className="px-1 py-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                            Verifying Claims
                        </span>
                        <span className="text-[10px] font-mono text-white/40">
                            {progress.current}/{progress.total}
                        </span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full bg-white/80"
                        />
                    </div>
                </div>
            )}

            {/* Verification List */}
            {verification && (
                <div className="space-y-2">
                    {verification.claims.map((claim) => (
                        <ClaimRow key={claim.id} claim={claim} />
                    ))}
                </div>
            )}
        </div>
    );
}
