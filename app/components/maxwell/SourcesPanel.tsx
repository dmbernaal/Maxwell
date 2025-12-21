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
        <div className="space-y-4">
            {/* Sources Grid */}
            <div className="grid grid-cols-2 gap-3">
                {displaySources.map((source, idx) => {
                    const domain = new URL(source.url).hostname.replace('www.', '');

                    return (
                        <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col gap-2 p-3 rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:from-white/[0.12] transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                {/* Citation Number */}
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/5 text-[9px] font-mono text-white/40 group-hover:text-white/60 transition-colors">
                                    {idx + 1}
                                </div>
                                {/* External Link Icon */}
                                <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                            </div>

                            {/* Content */}
                            <div className="min-w-0">
                                <h4 className="text-[11px] font-medium text-white/70 truncate group-hover:text-white transition-colors mb-1">
                                    {source.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                    {/* Favicon */}
                                    <img
                                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                                        alt=""
                                        className="w-3 h-3 opacity-40 grayscale group-hover:opacity-60 transition-opacity"
                                    />
                                    <span className="text-[9px] font-mono text-white/30 truncate">
                                        {domain}
                                    </span>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            {/* Show More Button */}
            {!isExpanded && sources.length > 5 && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full text-center py-2 text-[10px] font-mono text-white/30 hover:text-white/50 transition-colors"
                >
                    + {sources.length - 5} MORE SOURCES
                </button>
            )}
        </div>
    );
}
