import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Gavel } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AdjudicationPanelProps {
    text: string;
    isStreaming: boolean;
    status: 'verified' | 'correction_needed';
}

export function AdjudicationPanel({ text, isStreaming, status }: AdjudicationPanelProps) {
    const isCorrection = status === 'correction_needed';

    // Styling based on status
    const borderColor = isCorrection ? 'border-amber-500/50' : 'border-emerald-500/50';
    const bgGradient = isCorrection
        ? 'bg-gradient-to-r from-amber-950/30 to-transparent'
        : 'bg-gradient-to-r from-emerald-950/30 to-transparent';
    const iconColor = isCorrection ? 'text-amber-400' : 'text-emerald-400';
    const titleColor = isCorrection ? 'text-amber-200' : 'text-emerald-200';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`mt-6 rounded-xl border-l-4 ${borderColor} ${bgGradient} p-5 relative overflow-hidden`}
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg bg-black/20 ${iconColor}`}>
                    {isCorrection ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                </div>
                <h3 className={`text-xs font-bold uppercase tracking-widest ${titleColor} flex items-center gap-2`}>
                    {isCorrection ? "Correction & Consensus" : "Verified Summary"}
                    {isStreaming && (
                        <span className="flex gap-1">
                            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                    )}
                </h3>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-[13px] leading-relaxed text-white/80 font-serif tracking-wide">
                    <ReactMarkdown>{text}</ReactMarkdown>
                    {isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-white/50 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Decorative Gavel Watermark (Optional, subtle) */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none transform rotate-12">
                <Gavel size={120} />
            </div>
        </motion.div>
    );
}
