'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface VerdictCardProps {
    adjudication: string | null;
    confidence: number;
    phase: string;
}

export function VerdictCard({ adjudication, confidence, phase }: VerdictCardProps) {
    // If no adjudication yet, show skeleton or "Analyzing" state
    if (!adjudication) {
        return (
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    // Determine Sentiment/Direction (Simple heuristic for demo - in prod this would come from analysis)
    const isPositive = adjudication.toLowerCase().includes('bullish') || adjudication.toLowerCase().includes('yes') || adjudication.toLowerCase().includes('positive');
    const isNegative = adjudication.toLowerCase().includes('bearish') || adjudication.toLowerCase().includes('no') || adjudication.toLowerCase().includes('negative');
    
    // Config based on confidence
    const getConfidenceConfig = (score: number) => {
        if (score >= 80) return { color: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/20', icon: ShieldCheck };
        if (score >= 50) return { color: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-500/20', icon: ShieldAlert };
        return { color: 'text-rose-400', bg: 'bg-rose-400', border: 'border-rose-500/20', icon: ShieldX };
    };

    const config = getConfidenceConfig(confidence);
    const Icon = config.icon;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative w-full overflow-hidden rounded-2xl border ${config.border} bg-[#18151d] shadow-2xl`}
        >
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} opacity-[0.03] blur-3xl rounded-full -mr-10 -mt-10`} />

            <div className="relative p-6">
                {/* Header: Verdict Label & Confidence */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">
                            Maxwell Verdict
                        </span>
                        <h2 className="text-xl font-bold text-white/95 leading-tight">
                            {/* Extract first sentence or headline */}
                            {adjudication.split('.')[0]}.
                        </h2>
                    </div>

                    {/* Confidence Badge */}
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.03] border border-white/5 ${config.color}`}>
                            <Icon size={14} />
                            <span className="text-xs font-bold">{confidence}%</span>
                        </div>
                    </div>
                </div>

                {/* Body: Summary */}
                <div className="relative">
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3 font-light">
                        {adjudication}
                    </p>
                    {/* Fade out bottom if long */}
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#18151d] to-transparent" />
                </div>

                {/* Footer: Action/Status */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${config.bg} animate-pulse`} />
                        <span className="text-[10px] font-mono text-white/30 uppercase">
                            Market Impact
                        </span>
                    </div>
                    {isPositive ? (
                        <TrendingUp size={16} className="text-emerald-400" />
                    ) : isNegative ? (
                        <TrendingDown size={16} className="text-rose-400" />
                    ) : (
                        <Activity size={16} className="text-white/20" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
