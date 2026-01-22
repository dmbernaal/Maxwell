'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { VerificationOutput, VerifiedClaim, EntailmentVerdict } from '../../lib/maxwell/types';

interface ClaimsCardProps {
    verification: VerificationOutput | null;
}

const STATUS_CONFIG: Record<EntailmentVerdict, { color: string; label: string }> = {
    SUPPORTED: { color: '#10b981', label: 'Verified' },
    CONTRADICTED: { color: '#a855f7', label: 'Disputed' },
    NEUTRAL: { color: '#f97316', label: 'Uncertain' },
};

function ClaimItem({ claim }: { claim: VerifiedClaim }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const status = STATUS_CONFIG[claim.entailment];
    const confidence = Math.round(claim.confidence * 100);
    const hasEvidence = claim.bestMatchingSource?.passage;
    
    return (
        <div className="py-3">
            <button
                onClick={() => hasEvidence && setIsExpanded(!isExpanded)}
                className={`w-full text-left ${hasEvidence ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-start gap-3">
                    <div 
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                    />
                    
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-relaxed text-white/70">
                            {claim.text}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-1.5">
                            <span 
                                className="text-[10px] uppercase tracking-wider font-medium"
                                style={{ color: status.color }}
                            >
                                {status.label}
                            </span>
                            <span className="text-[10px] font-mono text-white/25">
                                {confidence}%
                            </span>
                            {hasEvidence && (
                                <ChevronDown 
                                    className={`w-3 h-3 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </button>
            
            <AnimatePresence>
                {isExpanded && hasEvidence && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-5 mt-3 pl-4 border-l border-white/10">
                            <span className="text-[10px] uppercase tracking-widest text-white/25 block mb-1">
                                Evidence
                            </span>
                            <p className="text-[12px] text-white/40 italic leading-relaxed">
                                "{claim.bestMatchingSource?.passage}"
                            </p>
                            {claim.bestMatchingSource?.sourceTitle && (
                                <span className="text-[10px] text-white/20 mt-2 block">
                                    — {claim.bestMatchingSource.sourceTitle}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function ClaimsCard({ verification }: ClaimsCardProps) {
    if (!verification) return null;

    const { summary, claims } = verification;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                    Claim Verification ({claims.length})
                </span>
                
                <div className="flex items-center gap-3 text-[11px] font-mono">
                    {summary.supported > 0 && (
                        <span className="text-[#10b981]">{summary.supported} verified</span>
                    )}
                    {summary.uncertain > 0 && (
                        <span className="text-[#f97316]">{summary.uncertain} uncertain</span>
                    )}
                    {summary.contradicted > 0 && (
                        <span className="text-[#a855f7]">{summary.contradicted} disputed</span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 custom-scrollbar max-h-[500px]">
                <div className="divide-y divide-white/[0.04]">
                    {claims.map((claim) => (
                        <ClaimItem key={claim.id} claim={claim} />
                    ))}
                </div>
            </div>
        </div>
    );
}
