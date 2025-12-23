/**
 * Claim Heatmap Component
 *
 * Renders synthesized text with confidence-based highlighting.
 * Each sentence that matches a verified claim gets a background color
 * based on the verification confidence (green/yellow/red).
 *
 * Hover over highlighted text to see claim details and evidence.
 *
 * IMPORTANT: This component preserves markdown formatting by using
 * ReactMarkdown with custom components that apply highlighting.
 *
 * @module components/maxwell/ClaimHeatmap
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import {
    mapClaimsToText,
    getConfidenceColorClass,
    getEntailmentLabel,
    type SentenceWithConfidence,
    type ClaimMappingResult,
} from '../../lib/maxwell/claimMatcher';
import type { VerifiedClaim } from '../../lib/maxwell/types';

// ============================================
// TYPES
// ============================================

interface ClaimHeatmapProps {
    /** The synthesized text content (markdown) */
    content: string;
    /** Verified claims from the verification phase */
    claims: VerifiedClaim[];
}

interface ClaimTooltipProps {
    sentence: SentenceWithConfidence;
    position: { x: number; y: number };
}

// ============================================
// TOOLTIP COMPONENT
// ============================================

function ClaimTooltip({ sentence, position }: ClaimTooltipProps) {
    const claim = sentence.matchedClaim;
    if (!claim) return null;

    const confidencePercent = Math.round((claim.confidence || 0) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed z-[100] w-80 pointer-events-none"
            style={{
                left: Math.min(position.x, window.innerWidth - 340),
                top: position.y - 8,
                transform: 'translateY(-100%)',
            }}
        >
            <div className="relative flex flex-col gap-3 p-4 bg-[#1a1721] border border-white/10 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {claim.entailment === 'SUPPORTED' ? (
                            <ShieldCheck size={14} className="text-emerald-400" />
                        ) : claim.entailment === 'CONTRADICTED' ? (
                            <ShieldX size={14} className="text-rose-400" />
                        ) : (
                            <ShieldAlert size={14} className="text-amber-400" />
                        )}
                        <span className={`text-xs font-medium ${getConfidenceColorClass(claim.confidenceLevel, 'text')}`}>
                            {getEntailmentLabel(claim.entailment)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Confidence</span>
                        <span className={`text-sm font-bold ${getConfidenceColorClass(claim.confidenceLevel, 'text')}`}>
                            {confidencePercent}%
                        </span>
                    </div>
                </div>

                {/* Claim Text */}
                <div className="relative z-10">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Claim</span>
                    <p className="text-sm text-white/80 leading-relaxed">{claim.text}</p>
                </div>

                {/* Evidence */}
                {claim.bestMatchingSource?.passage && (
                    <div className="relative z-10 pl-2 border-l-2 border-white/10">
                        <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Evidence</span>
                        <p className="text-xs text-white/50 italic leading-relaxed line-clamp-3">
                            "{claim.bestMatchingSource.passage}"
                        </p>
                        <span className="text-[10px] text-white/20 mt-1 block">
                            — {claim.bestMatchingSource.sourceTitle}
                        </span>
                    </div>
                )}

                {/* Match Quality */}
                <div className="relative z-10 flex items-center justify-between text-[10px] text-white/30 pt-2 border-t border-white/5">
                    <span>Match Quality: {Math.round(sentence.matchScore * 100)}%</span>
                    {claim.issues.length > 0 && (
                        <span className="text-amber-400/70">⚠ {claim.issues.length} issue(s)</span>
                    )}
                </div>
            </div>

            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full border-8 border-transparent border-t-[#1a1721]" />
        </motion.div>
    );
}

// ============================================
// HIGHLIGHTED TEXT SPAN COMPONENT
// ============================================

function HighlightedSpan({
    text,
    sentence
}: {
    text: string;
    sentence: SentenceWithConfidence | null;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);

    // Ensure we only render portal on client side
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleMouseEnter = (e: React.MouseEvent) => {
        setIsHovered(true);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
    };

    // If no matched claim, render plain text
    if (!sentence?.matchedClaim) {
        return <>{text}</>;
    }

    const bgClass = getConfidenceColorClass(sentence.confidenceLevel, 'bg');

    return (
        <>
            <span
                className={`${bgClass} rounded-sm cursor-help transition-all duration-200 hover:brightness-125`}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsHovered(false)}
            >
                {text}
            </span>

            {/* Use Portal to render tooltip outside the DOM hierarchy */}
            {/* This prevents <div> inside <p> hydration errors */}
            {isMounted && isHovered && createPortal(
                <AnimatePresence>
                    <ClaimTooltip sentence={sentence} position={tooltipPosition} />
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

// ============================================
// STATS BAR COMPONENT
// ============================================

function HeatmapStats({ stats }: { stats: ClaimMappingResult['stats'] }) {
    return (
        <div className="flex items-center gap-4 text-[10px] text-white/40 mb-4">
            <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-white/30" />
                <span>
                    <span className="text-white/60 font-medium">{stats.matchedSentences}</span>
                    /{stats.totalSentences} sentences verified
                </span>
            </div>

            <div className="flex items-center gap-1.5">
                <span>Coverage:</span>
                <span className="text-white/60 font-medium">{stats.coveragePercent}%</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    High
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                    Medium
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500/50" />
                    Low
                </span>
            </div>
        </div>
    );
}

// ============================================
// TEXT PROCESSOR - Applies highlighting to text content
// ============================================

/**
 * Strips markdown formatting from text for comparison.
 */
function stripMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
        .replace(/\*([^*]+)\*/g, '$1')       // *italic*
        .replace(/\[(\d+)\]/g, '')           // [1] citations
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
        .replace(/#{1,6}\s*/g, '')           // ## headers
        .trim();
}

/**
 * Tokenizes text for fuzzy matching.
 */
function tokenizeForMatching(text: string): string[] {
    return stripMarkdown(text)
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 2);
}

/**
 * Finds the best matching sentence from the map using token overlap.
 * Returns the matched sentence data if a good match is found.
 */
function findBestMatch(
    text: string,
    sentenceMap: Map<string, SentenceWithConfidence>
): SentenceWithConfidence | null {
    const textTokens = new Set(tokenizeForMatching(text));
    if (textTokens.size < 3) return null; // Too short to match

    let bestMatch: SentenceWithConfidence | null = null;
    let bestScore = 0;

    for (const [sentenceText, sentenceData] of sentenceMap) {
        const sentenceTokens = tokenizeForMatching(sentenceText);
        if (sentenceTokens.length === 0) continue;

        // Calculate overlap
        const matchingTokens = sentenceTokens.filter(t => textTokens.has(t));
        const score = matchingTokens.length / sentenceTokens.length;

        if (score > bestScore && score >= 0.5) {
            bestScore = score;
            bestMatch = sentenceData;
        }
    }

    return bestMatch;
}

/**
 * Process text and apply highlighting based on claim matches.
 * Uses fuzzy token matching to handle markdown stripping by ReactMarkdown.
 */
function processTextWithHighlights(
    text: string,
    sentenceMap: Map<string, SentenceWithConfidence>
): React.ReactNode {
    if (!text || sentenceMap.size === 0) return text;

    // Try to find a matching sentence for this text block
    const match = findBestMatch(text, sentenceMap);

    if (match) {
        // The whole text block matches a verified sentence - highlight it entirely
        return (
            <HighlightedSpan
                key={`hl-${text.slice(0, 20)}`}
                text={text}
                sentence={match}
            />
        );
    }

    // No match found - return plain text
    return text;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClaimHeatmap({
    content,
    claims,
}: ClaimHeatmapProps) {
    // Compute the mapping
    const mapping = useMemo(() => {
        if (!claims || claims.length === 0) return null;
        return mapClaimsToText(content, claims);
    }, [content, claims]);

    // Create a map of sentence text -> sentence data for quick lookup
    const sentenceMap = useMemo(() => {
        if (!mapping) return new Map<string, SentenceWithConfidence>();

        const map = new Map<string, SentenceWithConfidence>();
        for (const sentence of mapping.sentences) {
            if (sentence.matchedClaim) {
                // Use trimmed text as key
                map.set(sentence.text.trim(), sentence);
            }
        }
        return map;
    }, [mapping]);

    // Create custom text renderer that applies highlighting
    const renderText = useCallback((text: string) => {
        return processTextWithHighlights(text, sentenceMap);
    }, [sentenceMap]);

    if (!mapping) {
        return (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        );
    }

    return (
        <div>
            {/* Stats Bar */}
            <HeatmapStats stats={mapping.stats} />

            {/* Rendered Markdown with Highlights */}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Headers
                    h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-white mt-6 mb-3">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-white/95 mt-5 mb-2 border-b border-white/10 pb-1">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-base font-bold text-white/90 mt-4 mb-2">{children}</h3>
                    ),
                    // Horizontal rule
                    hr: () => <hr className="my-6 border-white/10" />,
                    // Paragraphs - Apply highlighting to text content
                    p: ({ children }) => (
                        <p className="mb-3 last:mb-0 leading-relaxed text-[17px]">
                            {React.Children.map(children, (child) => {
                                if (typeof child === 'string') {
                                    return renderText(child);
                                }
                                return child;
                            })}
                        </p>
                    ),
                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/90 font-medium underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-brand-accent transition-all"
                        >
                            {children}
                        </a>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-relaxed">
                            {React.Children.map(children, (child) => {
                                if (typeof child === 'string') {
                                    return renderText(child);
                                }
                                return child;
                            })}
                        </li>
                    ),
                    code: ({ className, children }) => {
                        const isInline = !className;
                        return isInline ? (
                            <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                            </code>
                        ) : (
                            <pre className="bg-zinc-900 p-3 rounded-lg overflow-x-auto text-sm font-mono">
                                <code>{children}</code>
                            </pre>
                        );
                    },
                    // Table components
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="border-b border-white/20">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-white/10">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-white/5">{children}</tr>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 text-left font-semibold text-white/90">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-white/70">
                            {React.Children.map(children, (child) => {
                                if (typeof child === 'string') {
                                    return renderText(child);
                                }
                                return child;
                            })}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
