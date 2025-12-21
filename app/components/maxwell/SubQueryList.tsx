/**
 * Sub-Query List Component
 * 
 * Shows the decomposed sub-queries with search status.
 * 
 * @module components/maxwell/SubQueryList
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Search } from 'lucide-react';
import type { SubQuery, SearchMetadata } from '../../lib/maxwell/types';

interface SubQueryListProps {
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    reasoning?: string;
}

export function SubQueryList({ subQueries, searchMetadata, reasoning }: SubQueryListProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (subQueries.length === 0) return null;

    const completedCount = searchMetadata.filter((m) => m.status === 'complete').length;

    return (
        <div className="pl-1">
            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-3">
                Execution Graph
            </h3>

            {/* Strategy / Reasoning */}
            {reasoning && (
                <div className="mb-6 pl-3 border-l border-white/10 ml-[3px]">
                    <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1.5">
                        Strategy
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed font-light italic">
                        "{reasoning}"
                    </p>
                </div>
            )}
            {/* Git Graph List */}
            <div className="relative pl-3">
                {/* Main Trunk Line - Glowing Circuit */}
                <div className="absolute top-0 bottom-4 left-[3px] w-[1px] bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />

                <div className="space-y-4">
                    {subQueries.map((sq, idx) => {
                        const meta = searchMetadata.find((m) => m.queryId === sq.id);
                        const isComplete = meta?.status === 'complete';
                        const sourcesFound = meta?.sourcesFound || 0;

                        return (
                            <motion.div
                                key={sq.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex items-start gap-3 group"
                            >
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <p className={`text-[13px] font-mono leading-relaxed transition-colors ${isComplete ? 'text-white/80' : 'text-white/40'}`}>
                                        "{sq.query}"
                                    </p>
                                    {isComplete && (
                                        <div className="flex items-center gap-2 mt-1 ml-1">
                                            <span className="text-[9px] font-mono text-white/30">
                                                → {sourcesFound} sources indexed
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
