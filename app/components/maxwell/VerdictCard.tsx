'use client';

import { motion } from 'framer-motion';

interface VerdictCardProps {
    adjudication: string | null;
    confidence: number;
    phase: string;
}

type MarketVerdict = 'YES' | 'NO' | 'LIKELY' | 'UNLIKELY' | 'UNCERTAIN';

interface ParsedVerdict {
    verdict: MarketVerdict;
    confidence: number;
    reasoning: string;
    fullAnalysis: string;
}

function parseMarketVerdict(adjudication: string, fallbackConfidence: number): ParsedVerdict {
    const text = adjudication.toLowerCase();
    
    const verdictMatch = adjudication.match(/VERDICT:\s*(YES|NO|LIKELY|UNLIKELY|UNCERTAIN)/i);
    const confidenceMatch = adjudication.match(/CONFIDENCE:\s*(\d+)%/i);
    const reasoningMatch = adjudication.match(/REASONING:\s*([^\n]+)/i);
    
    let verdict: MarketVerdict = 'UNCERTAIN';
    if (verdictMatch) {
        verdict = verdictMatch[1].toUpperCase() as MarketVerdict;
    } else {
        if (text.includes('yes') && (text.includes('will') || text.includes('should') || text.includes('likely to happen'))) {
            verdict = 'LIKELY';
        } else if (text.includes('no') && (text.includes('unlikely') || text.includes("won't") || text.includes('will not'))) {
            verdict = 'UNLIKELY';
        } else if (text.includes('bullish') || text.includes('positive outlook')) {
            verdict = 'LIKELY';
        } else if (text.includes('bearish') || text.includes('negative outlook')) {
            verdict = 'UNLIKELY';
        }
    }
    
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : fallbackConfidence;
    const reasoning = reasoningMatch?.[1]?.trim() || adjudication.split('.').slice(0, 2).join('.') + '.';
    
    return {
        verdict,
        confidence,
        reasoning,
        fullAnalysis: adjudication,
    };
}

const verdictConfig: Record<MarketVerdict, { color: string; bgGlow: string; label: string }> = {
    YES: { color: 'text-emerald-400', bgGlow: 'bg-emerald-400', label: 'YES' },
    LIKELY: { color: 'text-emerald-400', bgGlow: 'bg-emerald-400', label: 'LIKELY' },
    NO: { color: 'text-rose-400', bgGlow: 'bg-rose-400', label: 'NO' },
    UNLIKELY: { color: 'text-rose-400', bgGlow: 'bg-rose-400', label: 'UNLIKELY' },
    UNCERTAIN: { color: 'text-amber-400', bgGlow: 'bg-amber-400', label: 'UNCERTAIN' },
};

export function VerdictCard({ adjudication, confidence, phase }: VerdictCardProps) {
    if (!adjudication) {
        return (
            <div className="space-y-4">
                <div className="h-16 w-48 bg-white/5 rounded animate-pulse" />
                <div className="space-y-2">
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    const parsed = parseMarketVerdict(adjudication, confidence);
    const config = verdictConfig[parsed.verdict];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
        >
            <div className={`absolute top-0 left-0 w-32 h-32 ${config.bgGlow} opacity-[0.05] blur-3xl rounded-full -ml-10 -mt-10`} />

            <div className="relative space-y-4">
                <div className="flex items-end gap-4">
                    <span className={`text-5xl lg:text-6xl font-bold tracking-tighter ${config.color}`}>
                        {config.label}
                    </span>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-white/40">{parsed.confidence}%</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/30">confidence</span>
                    </div>
                </div>

                <div className="pl-1 border-l-2 border-white/10">
                    <p className="text-base lg:text-lg text-white/60 leading-relaxed">
                        {parsed.reasoning}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
