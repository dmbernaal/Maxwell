/**
 * Claim Matcher Utility
 *
 * Maps verified claims back to sentences in the synthesized text.
 * Enables "attention map" style heatmap visualization.
 *
 * @module maxwell/claimMatcher
 */

import type { VerifiedClaim, EntailmentVerdict } from './types';

// ============================================
// TYPES
// ============================================

/**
 * A sentence from the synthesized text with its matched claim data.
 */
export interface SentenceWithConfidence {
    /** The raw sentence text */
    text: string;
    /** Confidence score from matched claim (null if no match) */
    confidence: number | null;
    /** Confidence level category */
    confidenceLevel: 'high' | 'medium' | 'low' | null;
    /** Entailment verdict from NLI */
    entailment: EntailmentVerdict | null;
    /** The matched claim (if any) */
    matchedClaim: VerifiedClaim | null;
    /** Match quality score (0-1) */
    matchScore: number;
}

/**
 * Result of claim-to-text mapping.
 */
export interface ClaimMappingResult {
    /** Sentences with their confidence data */
    sentences: SentenceWithConfidence[];
    /** Statistics about the mapping */
    stats: {
        totalSentences: number;
        matchedSentences: number;
        avgConfidence: number;
        coveragePercent: number;
    };
}

// ============================================
// TOKENIZATION
// ============================================

/**
 * Extracts meaningful words from text for comparison.
 * Filters out common stop words and short words.
 */
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'their', 'them', 'we', 'our', 'you', 'your',
    'he', 'she', 'his', 'her', 'which', 'who', 'whom', 'what', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/\[\d+\]/g, '') // Remove citation markers [1], [2], etc.
        .split(/\W+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

// ============================================
// MATCHING ALGORITHM
// ============================================

/**
 * Calculates similarity between a sentence and a claim using Jaccard similarity.
 * Returns a score between 0 (no overlap) and 1 (perfect match).
 */
function calculateSimilarity(sentenceTokens: Set<string>, claimTokens: string[]): number {
    if (claimTokens.length === 0) return 0;

    const matchingTokens = claimTokens.filter(token => sentenceTokens.has(token));

    // Jaccard-like similarity: intersection / union
    const intersection = matchingTokens.length;
    const union = new Set([...sentenceTokens, ...claimTokens]).size;

    if (union === 0) return 0;

    // Weight by claim coverage (how much of the claim is in the sentence)
    const claimCoverage = intersection / claimTokens.length;
    const jaccardSimilarity = intersection / union;

    // Combined score favoring claim coverage
    return (claimCoverage * 0.7) + (jaccardSimilarity * 0.3);
}

/**
 * Finds the best matching claim for a given sentence.
 */
function findBestMatchingClaim(
    sentence: string,
    claims: VerifiedClaim[],
    usedClaims: Set<string>
): { claim: VerifiedClaim | null; score: number } {
    const sentenceTokens = new Set(tokenize(sentence));

    if (sentenceTokens.size === 0) {
        return { claim: null, score: 0 };
    }

    let bestClaim: VerifiedClaim | null = null;
    let bestScore = 0;

    for (const claim of claims) {
        // Skip already-used claims (one claim per sentence max)
        if (usedClaims.has(claim.id)) continue;

        const claimTokens = tokenize(claim.text);
        const score = calculateSimilarity(sentenceTokens, claimTokens);

        if (score > bestScore) {
            bestScore = score;
            bestClaim = claim;
        }
    }

    // Threshold: require at least 40% similarity to consider it a match
    const MATCH_THRESHOLD = 0.4;

    if (bestScore >= MATCH_THRESHOLD && bestClaim) {
        return { claim: bestClaim, score: bestScore };
    }

    return { claim: null, score: 0 };
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Maps verified claims to sentences in the synthesized text.
 *
 * @param synthesizedText - The full synthesized answer text
 * @param claims - Array of verified claims from the verification phase
 * @returns Mapping result with sentences and their confidence data
 */
export function mapClaimsToText(
    synthesizedText: string,
    claims: VerifiedClaim[]
): ClaimMappingResult {
    // 1. Segment text into sentences using Intl.Segmenter
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const segments = Array.from(segmenter.segment(synthesizedText));

    const sentences: SentenceWithConfidence[] = [];
    const usedClaims = new Set<string>();

    // 2. Process each sentence
    for (const segment of segments) {
        const text = segment.segment.trim();

        // Skip very short segments (likely punctuation or whitespace)
        if (text.length < 10) {
            continue;
        }

        const { claim, score } = findBestMatchingClaim(text, claims, usedClaims);

        if (claim) {
            usedClaims.add(claim.id);
            sentences.push({
                text,
                confidence: claim.confidence,
                confidenceLevel: claim.confidenceLevel,
                entailment: claim.entailment,
                matchedClaim: claim,
                matchScore: score,
            });
        } else {
            sentences.push({
                text,
                confidence: null,
                confidenceLevel: null,
                entailment: null,
                matchedClaim: null,
                matchScore: 0,
            });
        }
    }

    // 3. Calculate statistics
    const matchedSentences = sentences.filter(s => s.matchedClaim !== null);
    const avgConfidence = matchedSentences.length > 0
        ? matchedSentences.reduce((sum, s) => sum + (s.confidence || 0), 0) / matchedSentences.length
        : 0;

    return {
        sentences,
        stats: {
            totalSentences: sentences.length,
            matchedSentences: matchedSentences.length,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
            coveragePercent: sentences.length > 0
                ? Math.round((matchedSentences.length / sentences.length) * 100)
                : 0,
        },
    };
}

/**
 * Gets the CSS class for a confidence level.
 */
export function getConfidenceColorClass(
    confidenceLevel: 'high' | 'medium' | 'low' | null,
    variant: 'bg' | 'text' | 'border' = 'bg'
): string {
    const colors = {
        high: {
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
        },
        medium: {
            bg: 'bg-amber-500/20',
            text: 'text-amber-400',
            border: 'border-amber-500/30',
        },
        low: {
            bg: 'bg-rose-500/20',
            text: 'text-rose-400',
            border: 'border-rose-500/30',
        },
        null: {
            bg: '',
            text: 'text-white/50',
            border: 'border-white/10',
        },
    };

    return colors[confidenceLevel ?? 'null'][variant];
}

/**
 * Gets a human-readable label for an entailment verdict.
 */
export function getEntailmentLabel(entailment: EntailmentVerdict | null): string {
    switch (entailment) {
        case 'SUPPORTED':
            return 'Verified';
        case 'NEUTRAL':
            return 'Unverified';
        case 'CONTRADICTED':
            return 'Disputed';
        default:
            return 'Unknown';
    }
}
