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
}

export function SubQueryList({ subQueries, searchMetadata }: SubQueryListProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (subQueries.length === 0) return null;

    const completedCount = searchMetadata.filter((m) => m.status === 'complete').length;

    return (
        <div className="space-y-2">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
                        Sub-queries
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[9px] font-mono text-white/40">
                        {completedCount}/{subQueries.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                )}
            </button>

            {/* List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-2 border-l border-white/10 space-y-2">
                            {subQueries.map((sq, idx) => {
                                const meta = searchMetadata.find((m) => m.queryId === sq.id);
                                const isComplete = meta?.status === 'complete';
                                const sourcesFound = meta?.sourcesFound || 0;

                                return (
                                    <motion.div
                                        key={sq.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-start gap-2 py-1"
                                    >
                                        {isComplete ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <Circle className="w-3.5 h-3.5 text-white/20 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white/60 leading-snug truncate">
                                                {sq.query}
                                            </p>
                                            {isComplete && (
                                                <p className="text-[9px] font-mono text-white/30 mt-0.5">
                                                    {sourcesFound} sources
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
