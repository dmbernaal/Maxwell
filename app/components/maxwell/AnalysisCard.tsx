'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClaimHeatmap from './ClaimHeatmap';
import type { VerifiedClaim } from '../../lib/maxwell/types';

interface AnalysisCardProps {
    answer: string;
    claims?: VerifiedClaim[];
}

export function AnalysisCard({ answer, claims }: AnalysisCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > 400);
        }
    }, [answer]);

    const hasClaims = claims && claims.length > 0;

    return (
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-4">
                Verified Analysis
            </span>
            
            <div className="relative">
                <motion.div 
                    layout
                    style={{ maxHeight: isExpanded ? 'none' : '400px' }}
                    className="overflow-hidden"
                    ref={contentRef}
                >
                    {hasClaims ? (
                        <div className="text-white/70">
                            <ClaimHeatmap content={answer} claims={claims} />
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none text-white/50
                            prose-headings:text-white/80 prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-sm prose-headings:mt-4 prose-headings:mb-2
                            prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-2
                            prose-strong:text-white/70 prose-strong:font-medium
                            prose-ul:my-2 prose-li:text-[13px] prose-li:my-0.5
                            [&>*:first-child]:mt-0"
                        >
                            {answer}
                        </div>
                    )}
                </motion.div>

                <AnimatePresence>
                    {isOverflowing && !isExpanded && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </div>
            
            {isOverflowing && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-4 text-[11px] font-mono text-white/40 hover:text-white/60 transition-colors self-start"
                >
                    {isExpanded ? 'Show less' : 'Show full analysis'}
                </button>
            )}
        </div>
    );
}
