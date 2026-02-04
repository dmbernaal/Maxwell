'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import type { MaxwellIntelligence, ThesisFactor, ResolutionRiskLevel } from '@/app/lib/maxwell/types';

type EvidenceType = 'pro' | 'con' | 'risk' | 'sources';

interface UnifiedFactor {
    id: string;
    type: EvidenceType;
    headline: string;
    description?: string;
    sourceIndex?: number;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    impact?: 'HIGH' | 'MEDIUM' | 'LOW' | ResolutionRiskLevel;
    url?: string;
}

interface EvidenceGridProps {
    intelligence: MaxwellIntelligence | null;
    className?: string;
}

const mapThesisFactor = (f: ThesisFactor, type: EvidenceType, index: number): UnifiedFactor => ({
    id: `${type}-${index}`,
    type,
    headline: f.point,
    description: f.evidence,
    sourceIndex: f.sourceIndex,
    confidence: f.confidence,
    impact: f.confidence,
});

export function EvidenceGrid({ intelligence, className }: EvidenceGridProps) {
    const [activeTab, setActiveTab] = useState<EvidenceType>('pro');

    const allFactors = useMemo(() => {
        if (!intelligence) return [];

        const factors: UnifiedFactor[] = [];

        if (intelligence.thesis?.factorsFor) {
            factors.push(...intelligence.thesis.factorsFor.map((f, i) =>
                mapThesisFactor(f, 'pro', i)
            ));
        }

        if (intelligence.thesis?.factorsAgainst) {
            factors.push(...intelligence.thesis.factorsAgainst.map((f, i) =>
                mapThesisFactor(f, 'con', i)
            ));
        }

        if (intelligence.resolutionRisk?.factors) {
            factors.push(...intelligence.resolutionRisk.factors.map((f, i) => ({
                id: `risk-${i}`,
                type: 'risk' as const,
                headline: f,
                impact: intelligence.resolutionRisk.level,
                confidence: 'MEDIUM' as const
            })));
        }

        if (intelligence.raw?.allSources) {
            factors.push(...intelligence.raw.allSources.map((s) => ({
                id: `source-${s.index}`,
                type: 'sources' as const,
                headline: s.title,
                description: new URL(s.url).hostname.replace('www.', ''),
                sourceIndex: s.index,
                url: s.url,
                impact: 'LOW' as const
            })));
        }

        return factors;
    }, [intelligence]);

    const filteredFactors = useMemo(() =>
        allFactors.filter(f => f.type === activeTab),
        [allFactors, activeTab]);

    if (!intelligence) return null;

    const tabs: { id: EvidenceType; label: string; count: number }[] = [
        { id: 'pro', label: 'Primary Factors', count: allFactors.filter(f => f.type === 'pro').length },
        { id: 'con', label: 'Contra', count: allFactors.filter(f => f.type === 'con').length },
        { id: 'risk', label: 'Risk Analysis', count: allFactors.filter(f => f.type === 'risk').length },
        { id: 'sources', label: 'Sources', count: allFactors.filter(f => f.type === 'sources').length },
    ];

    return (
        <div className={cn("w-full border-t border-[#2A2A2A]", className)}>
            <div className="h-10 flex items-center bg-transparent">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "h-full flex-1 flex items-center justify-center gap-2 text-[11px] font-medium transition-all select-none border-b border-[#2A2A2A] relative",
                                isActive 
                                    ? "text-white" 
                                    : "text-[#666666] hover:text-[#A3A3A3] hover:bg-[#1A1A1A]"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "font-mono text-[9px]",
                                isActive ? "text-[#737373]" : "text-[#3A3A3A]"
                            )}>
                                {tab.count}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FA5D19]"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="divide-y divide-[#2A2A2A] min-h-[120px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        {filteredFactors.length > 0 ? (
                            filteredFactors.map((factor) => (
                                <EvidenceItem key={factor.id} factor={factor} />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-32">
                                <span className="text-xs text-[#3A3A3A] font-mono">No factors identified</span>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function EvidenceItem({ factor }: { factor: UnifiedFactor }) {
    if (factor.type === 'sources') {
        return (
            <a 
                href={factor.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-4 hover:bg-[#1A1A1A] transition-colors block border-b border-[#2A2A2A] last:border-0"
            >
                <div className="flex items-baseline justify-between gap-4 mb-1">
                    <h4 className="text-xs font-medium text-white leading-snug group-hover:text-[#FA5D19] transition-colors truncate">
                        {factor.headline}
                    </h4>
                    
                    <span className="text-[9px] font-mono text-[#3A3A3A] shrink-0">
                        SRC_{factor.sourceIndex}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#525252]">
                        {factor.description}
                    </span>
                </div>
            </a>
        );
    }

    return (
        <div className="group p-4 hover:bg-[#1A1A1A] transition-colors border-b border-[#2A2A2A] last:border-0">
            <div className="flex items-baseline justify-between gap-4 mb-1">
                <h4 className="text-xs font-medium text-white leading-snug">
                    {factor.headline}
                </h4>
                
                <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                        "text-[9px] font-mono tracking-wide uppercase",
                        factor.impact === 'HIGH' ? "text-[#A3A3A3]" : "text-[#525252]"
                    )}>
                        {factor.impact} IMPACT
                    </span>
                    {factor.sourceIndex && (
                        <span className="text-[9px] font-mono text-[#3A3A3A] group-hover:text-[#525252] transition-colors">
                            SRC_{factor.sourceIndex}
                        </span>
                    )}
                </div>
            </div>

            {factor.description && (
                <p className="text-[11px] text-[#666666] leading-relaxed line-clamp-2 font-sans pr-8">
                    {factor.description}
                </p>
            )}
        </div>
    );
}
