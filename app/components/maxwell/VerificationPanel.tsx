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
import { ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';
import type { VerificationOutput, VerifiedClaim, MaxwellSource } from '../../lib/maxwell/types';
import type { VerificationProgress } from '../../hooks/use-maxwell';

interface VerificationPanelProps {
    verification: VerificationOutput | null;
    progress: VerificationProgress | null;
    sources: MaxwellSource[];
}

function ClaimRow({ claim, sources }: { claim: VerifiedClaim; sources: MaxwellSource[] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const verdictConfig = {
        SUPPORTED: {
            label: 'Verified',
            color: 'text-emerald-400',
            dot: 'bg-emerald-400'
        },
        NEUTRAL: {
            label: 'Uncertain',
            color: 'text-amber-400',
            dot: 'bg-amber-400'
        },
        CONTRADICTED: {
            label: 'Disputed',
            color: 'text-rose-400',
            dot: 'bg-rose-400'
        },
    };

    const config = verdictConfig[claim.entailment] || verdictConfig.NEUTRAL;
    const hasNumericMismatch = claim.numericCheck && !claim.numericCheck.match;

    // Find the source URL
    const sourceUrl = sources.find(s => s.id === claim.bestMatchingSource.sourceId)?.url;

    return (
        <div className="group border-b border-white/5 last:border-0">
            {/* Claim Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-start gap-4 py-4 text-left hover:bg-white/[0.02] transition-colors px-2 -mx-2 rounded-lg"
            >
                {/* Status Dot */}
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />

                <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/90 leading-relaxed font-light tracking-wide">
                        {claim.text}
                    </p>

                    {/* Meta Row */}
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[10px] font-mono tracking-wider ${config.color} opacity-80`}>
                            {config.label.toUpperCase()}
                        </span>

                        {hasNumericMismatch && (
                            <>
                                <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                <span className="text-[10px] font-mono text-rose-400/80 tracking-wider flex items-center gap-1.5">
                                    NUMERIC MISMATCH
                                </span>
                            </>
                        )}

                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span className="text-[10px] font-mono text-white/30 tracking-wider">
                            {Math.round(claim.confidence * 100)}% CONFIDENCE
                        </span>
                    </div>
                </div>

                <ChevronRight
                    size={14}
                    className={`text-white/20 transition-transform duration-300 mt-1 ${isExpanded ? 'rotate-90' : ''}`}
                />
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "circOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pl-5 pr-2 pb-6 pt-1 space-y-5">

                            {/* Numeric Diff - Clean Table */}
                            {hasNumericMismatch && claim.numericCheck && (
                                <div className="grid grid-cols-2 gap-8 py-3">
                                    <div>
                                        <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">Claimed</div>
                                        <div className="font-mono text-xs text-rose-400/90">
                                            {claim.numericCheck.claimNumbers.join(', ')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">Evidence</div>
                                        <div className="font-mono text-xs text-emerald-400/90">
                                            {claim.numericCheck.evidenceNumbers.join(', ')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Analysis */}
                            <div className="space-y-1.5">
                                <h4 className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Analysis</h4>
                                <p className="text-[12px] text-white/60 leading-relaxed font-light">
                                    {claim.entailmentReasoning}
                                </p>
                            </div>

                            {/* Evidence Quote */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Primary Evidence</h4>
                                    {sourceUrl ? (
                                        <a
                                            href={sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 hover:text-white/80 transition-colors truncate max-w-[200px] group/link"
                                        >
                                            <span className="truncate">{claim.bestMatchingSource.sourceTitle}</span>
                                            <ExternalLink size={10} className="opacity-50 group-hover/link:opacity-100" />
                                        </a>
                                    ) : (
                                        <span className="text-[9px] font-mono text-white/20 truncate max-w-[150px]">
                                            {claim.bestMatchingSource.sourceTitle}
                                        </span>
                                    )}
                                </div>
                                <div className="relative pl-3 border-l border-white/10">
                                    <p className="text-[12px] text-white/50 leading-relaxed italic font-serif">
                                        "{claim.bestMatchingSource.passage}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function VerificationPanel({ verification, progress, sources }: VerificationPanelProps) {
    if (!verification && !progress) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    Verification Report
                </h3>
                {verification && (
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/40"
                                style={{ width: `${verification.overallConfidence}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-mono text-white/40">
                            {verification.overallConfidence}%
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {progress && !verification && (
                <div className="px-1 py-2 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
                        <span>VERIFYING CLAIMS</span>
                        <span>{progress.current}/{progress.total}</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full bg-white/60"
                        />
                    </div>
                </div>
            )}

            {/* Claims List */}
            {verification && (
                <div className="border-t border-white/5">
                    {verification.claims.map((claim) => (
                        <ClaimRow key={claim.id} claim={claim} sources={sources} />
                    ))}
                </div>
            )}
        </div>
    );
}
