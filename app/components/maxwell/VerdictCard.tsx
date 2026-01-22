'use client';

import { motion } from 'framer-motion';
import type { VerificationOutput } from '../../lib/maxwell/types';

interface VerdictCardProps {
    adjudication: string | null;
    verification: VerificationOutput | null;
}

type MarketVerdict = 'YES' | 'NO' | 'LIKELY' | 'UNLIKELY' | 'UNCERTAIN';

interface ParsedVerdict {
    verdict: MarketVerdict;
    confidence: number;
    summary: string;
}

function parseMarketVerdict(adjudication: string, verification: VerificationOutput | null): ParsedVerdict {
    const text = adjudication.toLowerCase();
    
    let verdict: MarketVerdict = 'UNCERTAIN';
    const verdictMatch = adjudication.match(/(?:Executive Summary|VERDICT):\s*(YES|NO|LIKELY YES|LIKELY NO|LIKELY|UNLIKELY|UNCERTAIN)/i);
    
    if (verdictMatch) {
        const match = verdictMatch[1].toUpperCase();
        if (match === 'LIKELY YES') verdict = 'LIKELY';
        else if (match === 'LIKELY NO') verdict = 'UNLIKELY';
        else verdict = match as MarketVerdict;
    } else {
        if (text.includes('likely yes') || (text.includes('yes') && text.includes('likely'))) {
            verdict = 'LIKELY';
        } else if (text.includes('likely no') || text.includes('unlikely')) {
            verdict = 'UNLIKELY';
        } else if (text.includes('bullish') || text.includes('positive outlook')) {
            verdict = 'LIKELY';
        } else if (text.includes('bearish') || text.includes('negative outlook')) {
            verdict = 'UNLIKELY';
        }
    }
    
    const confidenceMatch = adjudication.match(/Confidence Level:\s*[^(]*\((\d+)%\)/i) ||
                           adjudication.match(/CONFIDENCE:\s*(\d+)%/i) ||
                           adjudication.match(/(\d+)%\s*confidence/i);
    let confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
    
    if (!confidence && verification?.overallConfidence) {
        confidence = Math.round(verification.overallConfidence);
    }
    
    let summary = '';
    const lines = adjudication.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 50 && 
            !trimmed.startsWith('#') && 
            !trimmed.startsWith('**') &&
            !trimmed.includes('Executive Summary') &&
            !trimmed.includes('Confidence Level') &&
            !trimmed.includes('Market Resolution')) {
            summary = trimmed.replace(/\*\*/g, '').replace(/\[[\d,]+\]/g, '').trim();
            break;
        }
    }
    
    if (!summary) {
        const paragraphs = adjudication.split('\n\n');
        for (const p of paragraphs) {
            const clean = p.replace(/\*\*/g, '').replace(/##/g, '').replace(/\[[\d,]+\]/g, '').trim();
            if (clean.length > 80 && !clean.includes(':')) {
                summary = clean.split('.').slice(0, 2).join('.') + '.';
                break;
            }
        }
    }
    
    return { verdict, confidence, summary };
}

const VERDICT_CONFIG = {
    YES: { color: '#10b981', label: 'YES', sublabel: 'Likely to resolve yes' },
    LIKELY: { color: '#10b981', label: 'LIKELY', sublabel: 'Favorable outcome expected' },
    NO: { color: '#a855f7', label: 'NO', sublabel: 'Likely to resolve no' },
    UNLIKELY: { color: '#a855f7', label: 'UNLIKELY', sublabel: 'Unfavorable conditions' },
    UNCERTAIN: { color: '#71717a', label: 'UNCERTAIN', sublabel: 'Insufficient evidence' },
};

export function VerdictCard({ adjudication, verification }: VerdictCardProps) {
    if (!adjudication) return null;

    const { verdict, confidence, summary } = parseMarketVerdict(adjudication, verification);
    const config = VERDICT_CONFIG[verdict];

    return (
        <div className="space-y-6">
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-between gap-6"
            >
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium block mb-2">
                        Maxwell Verdict
                    </span>
                    <div className="flex items-baseline gap-3">
                        <span 
                            className="text-5xl lg:text-6xl font-bold tracking-tight"
                            style={{ color: config.color }}
                        >
                            {config.label}
                        </span>
                        {confidence > 0 && (
                            <span className="text-xl font-mono text-white/40">
                                {confidence}%
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-white/40 mt-1 block">
                        {config.sublabel}
                    </span>
                </div>

                {verification && (
                    <div className="flex items-center gap-4 text-[11px] font-mono text-white/30">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>{verification.summary.supported}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                            <span>{verification.summary.uncertain}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                            <span>{verification.summary.contradicted}</span>
                        </div>
                    </div>
                )}
            </motion.div>

            {summary && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[15px] leading-relaxed text-white/60 max-w-3xl"
                >
                    {summary}
                </motion.p>
            )}
        </div>
    );
}
