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
import type { SubQuery, SearchMetadata, MaxwellSource } from '../../lib/maxwell/types';

interface SubQueryListProps {
    subQueries: SubQuery[];
    searchMetadata: SearchMetadata[];
    sources: MaxwellSource[];
    reasoning?: string;
}

export function SubQueryList({ subQueries, searchMetadata, sources, reasoning }: SubQueryListProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (subQueries.length === 0) return null;

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

                <div className="space-y-6">
                    {subQueries.map((sq, idx) => {
                        const meta = searchMetadata.find((m) => m.queryId === sq.id);
                        const isComplete = meta?.status === 'complete';
                        const sourcesFound = meta?.sourcesFound || 0;
                        const querySources = sources.filter(s => s.fromQuery === sq.id);
                        const isDeadEnd = isComplete && sourcesFound === 0;

                        return (
                            <motion.div
                                key={sq.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex items-start gap-3 group"
                            >
                                {/* Node Dot */}
                                <div className={`absolute -left-[16px] top-1.5 w-[7px] h-[7px] rounded-full border ${isDeadEnd ? 'bg-white/5 border-white/20' :
                                    isComplete ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                        'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                                    } z-10 transition-all duration-500`} />

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-[13px] font-mono leading-relaxed transition-colors ${isDeadEnd ? 'text-white/30 line-through decoration-white/10' :
                                            isComplete ? 'text-white/80' : 'text-white/40'
                                            }`}>
                                            "{sq.query}"
                                        </p>
                                        {isDeadEnd && (
                                            <span className="text-[9px] font-mono text-white/20 px-1.5 py-0.5 rounded border border-white/10">
                                                DEAD END
                                            </span>
                                        )}
                                    </div>

                                    {/* Provenance: Source List */}
                                    {querySources.length > 0 && (
                                        <div className="mt-3 space-y-1.5 ml-1 border-l border-white/10 pl-3">
                                            {querySources.map(source => (
                                                <a
                                                    key={source.id}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/80 transition-colors group/source"
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-white/20 group-hover/source:bg-white/60" />
                                                    <span className="truncate max-w-[250px] font-mono">
                                                        {source.title}
                                                    </span>
                                                </a>
                                            ))}
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
