/**
 * Sources Panel Component
 * 
 * Shows the sources found during Maxwell search.
 * Collapsible list with source cards.
 * 
 * @module components/maxwell/SourcesPanel
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { MaxwellSource } from '../../lib/maxwell/types';

interface SourcesPanelProps {
    sources: MaxwellSource[];
}

function getFavicon(url: string): string | null {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
        return null;
    }
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (sources.length === 0) return null;

    // Show first 5 sources when collapsed, all when expanded
    const displaySources = isExpanded ? sources : sources.slice(0, 5);

    return (
        <div className="space-y-2">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    <Book className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
                        Sources
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-[9px] font-mono text-white/40">
                        {sources.length}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                )}
            </button>

            {/* Sources Grid */}
            <div className="grid grid-cols-1 gap-2">
                {displaySources.map((source, idx) => {
                    const favicon = getFavicon(source.url);
                    let hostname = '';
                    try {
                        hostname = new URL(source.url).hostname;
                    } catch {
                        hostname = source.url;
                    }

                    return (
                        <motion.a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="group flex items-center gap-3 p-2.5 rounded-lg bg-[#18151d] border border-white/5 hover:bg-[#231f29] hover:border-white/10 transition-all"
                        >
                            {/* Citation Number */}
                            <div className="w-5 h-5 rounded-md bg-brand-accent/10 text-brand-accent text-[9px] font-medium flex items-center justify-center border border-brand-accent/20 shrink-0">
                                {idx + 1}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-white/60 font-medium truncate group-hover:text-white/80 transition-colors">
                                    {source.title || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {favicon && (
                                        <img
                                            src={favicon}
                                            alt=""
                                            className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    )}
                                    <span className="text-[9px] font-mono text-white/30 truncate">
                                        {hostname}
                                    </span>
                                </div>
                            </div>

                            {/* External Link */}
                            <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 shrink-0" />
                        </motion.a>
                    );
                })}
            </div>

            {/* Show More Button */}
            {!isExpanded && sources.length > 5 && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full text-center py-2 text-[10px] text-white/30 hover:text-white/50 transition-colors"
                >
                    Show {sources.length - 5} more sources
                </button>
            )}
        </div>
    );
}
