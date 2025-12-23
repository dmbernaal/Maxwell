import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Gavel } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // CRITICAL: Added plugin

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
                <div className="text-[15px] leading-relaxed text-white/90 font-sans">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Fix Headers to be distinct
                            h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold text-white/95 mt-4 mb-2 border-b border-white/10 pb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold text-white/90 mt-3 mb-1">{children}</h3>,
                            // Fix lists to have proper spacing
                            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="pl-1">{children}</li>,
                            // Fix horizontal rules
                            hr: () => <hr className="my-4 border-white/10" />,
                            // Make bold text pop
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            // Style links
                            a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline decoration-brand-accent/50 underline-offset-2">
                                    {children}
                                </a>
                            ),
                            // Table components
                            table: ({ children }) => (
                                <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse text-sm">{children}</table>
                                </div>
                            ),
                            thead: ({ children }) => <thead className="border-b border-white/20">{children}</thead>,
                            tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
                            tr: ({ children }) => <tr className="hover:bg-white/5">{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-white/90">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 text-white/70">{children}</td>,
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                    {isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-white/50 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Decorative Gavel Watermark */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none transform rotate-12">
                <Gavel size={120} />
            </div>
        </motion.div>
    );
}
