'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import type { MaxwellIntelligence, ThesisFactor, ResolutionRiskLevel } from '@/app/lib/maxwell/types';

type EvidenceType = 'pro' | 'con' | 'risk';

interface UnifiedFactor {
    id: string;
    type: EvidenceType;
    headline: string;
    description?: string;
    sourceIndex?: number;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    impact?: 'HIGH' | 'MEDIUM' | 'LOW' | ResolutionRiskLevel;
}

interface EvidenceGridProps {
    intelligence: MaxwellIntelligence | null;
    className?: string;
}

const IMPACT_COLORS: Record<string, string> = {
    HIGH: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    LOW: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};

const mapThesisFactor = (f: ThesisFactor, type: EvidenceType, index: number): UnifiedFactor => ({
    id: `${type}-${index}`,
    type,
    headline: f.point,
    description: f.evidence,
    sourceIndex: f.sourceIndex,
    confidence: f.confidence,
    impact: f.confidence,
});

function EvidenceCard({ factor, onClick }: { factor: UnifiedFactor; onClick?: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "group relative flex flex-col gap-3 p-4",
                "bg-white/5 border border-white/5 hover:border-white/10",
                "rounded-sm transition-colors duration-200 cursor-pointer",
                "hover:bg-white/[0.07]"
            )}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className={cn(
                    "text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border",
                    IMPACT_COLORS[factor.impact || 'MEDIUM']
                )}>
                    {factor.impact || 'MED'} IMPACT
                </div>
                {factor.sourceIndex && (
                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
                        <span className="text-[10px] font-mono">SOURCE [{factor.sourceIndex}]</span>
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="font-medium text-sm text-white leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {factor.headline}
                </h3>
                {factor.description && (
                    <p className="text-xs text-white/60 italic line-clamp-3 leading-relaxed">
                        "{factor.description}"
                    </p>
                )}
            </div>

            <div className="mt-auto pt-2 flex items-center gap-2 border-t border-white/5">
                <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                        <div 
                            key={i}
                            className={cn(
                                "w-1 h-1 rounded-full",
                                factor.confidence === 'HIGH' ? "bg-emerald-500" :
                                factor.confidence === 'MEDIUM' ? (i <= 2 ? "bg-amber-500" : "bg-white/10") :
                                (i === 1 ? "bg-zinc-500" : "bg-white/10")
                            )} 
                        />
                    ))}
                </div>
                <span className="text-[10px] text-white/30 font-mono ml-auto uppercase">
                    {factor.type} FACTOR
                </span>
            </div>
        </motion.div>
    );
}

export function EvidenceGrid({ intelligence, className }: EvidenceGridProps) {
    const [activeTab, setActiveTab] = useState<EvidenceType>('pro');
    const [expanded, setExpanded] = useState(false);
    
    const VISIBLE_COUNT = 6;

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

        return factors;
    }, [intelligence]);

    const filteredFactors = useMemo(() => 
        allFactors.filter(f => f.type === activeTab),
    [allFactors, activeTab]);

    const visibleFactors = expanded ? filteredFactors : filteredFactors.slice(0, VISIBLE_COUNT);
    const hasMore = filteredFactors.length > VISIBLE_COUNT;

    if (!intelligence) return null;

    const tabs: { id: EvidenceType; label: string; count: number }[] = [
        { id: 'pro', label: 'Primary Factors', count: allFactors.filter(f => f.type === 'pro').length },
        { id: 'con', label: 'Contra', count: allFactors.filter(f => f.type === 'con').length },
        { id: 'risk', label: 'Risk Analysis', count: allFactors.filter(f => f.type === 'risk').length },
    ];

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-medium tracking-widest text-white/90">EVIDENCE</h2>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/60">
                        {allFactors.length}
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-sm overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setExpanded(false);
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-sm text-[11px] font-medium transition-all whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-white/10 text-white shadow-sm" 
                                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                            )}
                        >
                            {tab.label} <span className="opacity-40 ml-1">[{tab.count}]</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                    {visibleFactors.length > 0 ? (
                        visibleFactors.map((factor) => (
                            <EvidenceCard key={factor.id} factor={factor} />
                        ))
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full flex items-center justify-center h-32 border border-dashed border-white/10 rounded-sm"
                        >
                            <span className="text-sm text-white/20">No factors found for this category</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {hasMore && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center pt-2"
                >
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors px-4 py-2 hover:bg-white/5 rounded-sm"
                    >
                        <span>{expanded ? 'Show Less' : `View ${filteredFactors.length - VISIBLE_COUNT} More Factors`}</span>
                        <svg 
                            className={cn("w-3 h-3 transition-transform duration-200", expanded ? "rotate-180" : "")} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </motion.div>
            )}
        </div>
    );
}
