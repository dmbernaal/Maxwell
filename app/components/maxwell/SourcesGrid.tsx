'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MaxwellSource } from '../../lib/maxwell/types';

interface SourcesGridProps {
    sources: MaxwellSource[];
}

const INITIAL_SHOW = 6;

export function SourcesGrid({ sources }: SourcesGridProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!sources || sources.length === 0) return null;

    const displayedSources = isExpanded ? sources : sources.slice(0, INITIAL_SHOW);
    const hiddenCount = sources.length - INITIAL_SHOW;
    const hasMore = hiddenCount > 0;

    return (
        <div>
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium block mb-4">
                Sources ({sources.length})
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedSources.map((source) => {
                    let hostname = '';
                    try {
                        hostname = new URL(source.url).hostname.replace(/^www\./, '');
                    } catch {
                        hostname = source.url;
                    }

                    return (
                        <a 
                            key={source.id} 
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block p-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] transition-colors"
                        >
                            <div className="flex flex-col gap-2">
                                <h4 className="text-[13px] font-medium text-white/80 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                                    {source.title}
                                </h4>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors truncate max-w-[70%]">
                                        {hostname}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/20">
                                        #{source.id}
                                    </span>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>
            
            {hasMore && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-4 text-[11px] font-mono text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                >
                    {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
}
