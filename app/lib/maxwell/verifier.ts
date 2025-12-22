/**
 * Multi-Signal Verification Module (Core)
 *
 * Verifies claims from synthesized answers using multiple signals.
 * Core components: Claim Extraction, Passage Chunking, Evidence Retrieval.
 *
 * @module maxwell/verifier
 */

import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

import { createClaimExtractionPrompt, createNLIPrompt } from './prompts';
import { embedText, embedTexts, cosineSimilarity } from './embeddings';
import {
    CLAIM_EXTRACTION_MODEL,
    NLI_MODEL,
    MAX_CLAIMS_TO_VERIFY,
    MIN_PASSAGE_LENGTH,
    CITATION_MISMATCH_THRESHOLD,
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
    ENTAILMENT_SUPPORTED_CONFIDENCE,
    ENTAILMENT_NEUTRAL_CONFIDENCE,
    ENTAILMENT_CONTRADICTED_CONFIDENCE,
    LOW_RETRIEVAL_MULTIPLIER,
    LOW_RETRIEVAL_THRESHOLD,
    CITATION_MISMATCH_MULTIPLIER,
    NUMERIC_MISMATCH_MULTIPLIER,
    DEFAULT_VERIFICATION_CONCURRENCY,
} from './constants';

import type {
    MaxwellSource,
    ExtractedClaim,
    Passage,
    RetrievalResult,
    EntailmentVerdict,
    NumericCheck,
    AggregatedVerdict,
    VerifiedClaim,
    VerificationOutput,
    VerificationSummary,
} from './types';

// ============================================
// PROGRESS TYPES
// ============================================

/**
 * Progress update during verification.
 */
export interface VerificationProgress {
    current: number;
    total: number;
    status: string;
}

/**
 * Callback for verification progress updates.
 */
export type VerificationProgressCallback = (progress: VerificationProgress) => void;

// ============================================
// OPENROUTER CLIENT
// ============================================

/**
 * Creates an OpenRouter client instance.
 * @throws Error if OPENROUTER_API_KEY is not set
 */
function getOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return createOpenRouter({ apiKey });
}

// ============================================
// SCHEMAS
// ============================================

/**
 * Zod schema for claim extraction LLM output.
 */
const ClaimsSchema = z.object({
    claims: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            citedSources: z.array(z.number()),
        })
    ),
});

/**
 * Zod schema for NLI entailment LLM output.
 */
const EntailmentSchema = z.object({
    verdict: z.enum(['SUPPORTED', 'CONTRADICTED', 'NEUTRAL']),
    reasoning: z.string(),
});

// ============================================
// CLAIM EXTRACTION
// ============================================

/**
 * Extracts factual claims from a synthesized answer.
 *
 * @param answer - The synthesized answer with citations
 * @returns Array of extracted claims with cited source numbers
 */
export async function extractClaims(
    answer: string,
    maxClaimsToVerify: number = MAX_CLAIMS_TO_VERIFY // Added parameter with default
): Promise<ExtractedClaim[]> {
    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        return [];
    }

    try {
        const openrouter = getOpenRouterClient();
        const prompt = createClaimExtractionPrompt(answer);

        const { object } = await generateObject({
            model: openrouter(CLAIM_EXTRACTION_MODEL),
            schema: ClaimsSchema,
            prompt,
        });

        // Normalize and limit
        return object.claims
            .slice(0, maxClaimsToVerify) // Use dynamic limit
            .map((claim, index) => ({
                id: `c${index + 1}`,
                text: claim.text.trim(),
                citedSources: claim.citedSources.filter((n) => n > 0),
            }));
    } catch (error) {
        console.error('[Maxwell Verifier] Claim extraction failed:', error);
        return [];
    }
}

// ============================================
// PASSAGE CHUNKING
// ============================================

/**
 * Chunks sources into sentence-level passages using Intl.Segmenter.
 * Creates overlapping windows (1, 2, 3 sentences) for maximal context.
 *
 * Uses Intl.Segmenter instead of regex to correctly handle:
 * - "Mr. Smith" (stays together)
 * - "U.S.A." (stays together)
 * - "Inc." (stays together)
 *
 * @param sources - Array of sources to chunk
 * @returns Array of passages with source metadata
 */
export function chunkSourcesIntoPassages(sources: MaxwellSource[]): Passage[] {
    const passages: Passage[] = [];

    // Robust sentence segmentation using native browser/Node API
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const sourceIndex = i + 1; // 1-indexed for citation matching

        // Extract raw sentences
        const segments = Array.from(segmenter.segment(source.snippet));
        const sentences = segments
            .map((s) => s.segment.trim())
            .filter((s) => s.length >= MIN_PASSAGE_LENGTH);

        // Fallback: If no valid sentences found, use whole snippet
        if (sentences.length === 0 && source.snippet.length >= MIN_PASSAGE_LENGTH) {
            passages.push({
                text: source.snippet,
                sourceId: source.id,
                sourceIndex,
                sourceTitle: source.title,
            });
            continue;
        }

        // Create overlapping windows for better context
        for (let j = 0; j < sentences.length; j++) {
            // Window sizes: 1, 2, 3 sentences
            const windowSizes = [1, 2, 3];

            for (const size of windowSizes) {
                if (j + size <= sentences.length) {
                    const windowText = sentences.slice(j, j + size).join(' ');
                    passages.push({
                        text: windowText,
                        sourceId: source.id,
                        sourceIndex,
                        sourceTitle: source.title,
                    });
                }
            }
        }
    }

    return passages;
}

// ============================================
// EVIDENCE PREPARATION (for parallel pipelining)
// ============================================

/**
 * Prepared evidence for verification.
 */
export interface PreparedEvidence {
    passages: Passage[];
    embeddings: number[][];
}

/**
 * Prepares evidence by chunking sources and embedding passages.
 * This can be called in the background during synthesis to save time.
 *
 * @param sources - Array of sources to prepare
 * @returns Passages and their embeddings, ready for verification
 */
export async function prepareEvidence(sources: MaxwellSource[]): Promise<PreparedEvidence> {
    const passages = chunkSourcesIntoPassages(sources);

    if (passages.length === 0) {
        return { passages: [], embeddings: [] };
    }

    const texts = passages.map((p) => p.text);
    const embeddings = await embedTexts(texts);

    return { passages, embeddings };
}

// ============================================
// EVIDENCE RETRIEVAL
// ============================================

/**
 * Retrieves the best matching passage for a claim embedding.
 *
 * @param claimEmbedding - Vector embedding of the claim
 * @param passages - All available passages
 * @param passageEmbeddings - Embeddings for each passage
 * @param citedSourceIndices - Source indices cited in the original answer
 * @returns RetrievalResult with best match and mismatch detection
 */
export function retrieveEvidence(
    claimEmbedding: number[],
    passages: Passage[],
    passageEmbeddings: number[][],
    citedSourceIndices: number[]
): RetrievalResult {
    if (passages.length === 0 || passageEmbeddings.length === 0) {
        throw new Error('No passages available for retrieval');
    }

    // Calculate similarities for all passages
    const similarities = passages.map((passage, idx) => ({
        passage,
        similarity: cosineSimilarity(claimEmbedding, passageEmbeddings[idx]),
    }));

    // Sort descending by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Best overall match
    const bestMatch = similarities[0];
    const globalBestSupport = bestMatch.similarity;

    // Best match from CITED sources only
    const citedMatches = similarities.filter((s) =>
        citedSourceIndices.includes(s.passage.sourceIndex)
    );
    const citedSourceSupport = citedMatches.length > 0 ? citedMatches[0].similarity : 0;

    // Detect Citation Mismatch:
    // User cited source X, but source Y matches much better
    const citationMismatch =
        citedSourceIndices.length > 0 &&
        globalBestSupport - citedSourceSupport > CITATION_MISMATCH_THRESHOLD &&
        !citedSourceIndices.includes(bestMatch.passage.sourceIndex);

    return {
        bestPassage: bestMatch.passage,
        retrievalSimilarity: globalBestSupport,
        citedSourceSupport,
        globalBestSupport,
        citationMismatch,
    };
}

// ============================================
// NLI ENTAILMENT CHECK
// ============================================

/**
 * Checks if evidence supports, contradicts, or is neutral to a claim.
 *
 * @param claim - The factual claim to verify
 * @param evidence - The evidence passage to check against
 * @returns Verdict and reasoning from NLI model
 */
export async function checkEntailment(
    claim: string,
    evidence: string
): Promise<{ verdict: EntailmentVerdict; reasoning: string }> {
    if (!claim || !evidence) {
        return { verdict: 'NEUTRAL', reasoning: 'Missing claim or evidence' };
    }

    try {
        const openrouter = getOpenRouterClient();
        const prompt = createNLIPrompt(claim, evidence);

        const { object } = await generateObject({
            model: openrouter(NLI_MODEL),
            schema: EntailmentSchema,
            prompt,
        });

        return {
            verdict: object.verdict,
            reasoning: object.reasoning,
        };
    } catch (error) {
        console.error('[Maxwell Verifier] NLI check failed:', error);
        return { verdict: 'NEUTRAL', reasoning: 'NLI check failed' };
    }
}

// ============================================
// NUMERIC EXTRACTION
// ============================================

/**
 * Patterns for extracting numbers from text.
 */
const NUMBER_PATTERNS = [
    /[$¥€£][\d,.]+\s*[BMKbmk](?:illion|illion)?/gi, // Currency + suffix
    /[\d,.]+%/g, // Percentages
    /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, // Comma separated
    /\b\d+\.\d+\b/g, // Decimals
    /\b\d+\s*(?:billion|million|thousand|trillion)/gi, // Number + unit
    /\b(19|20)\d{2}\b/g, // Years
    /\b\d{4,}\b/g, // Large integers
];

/**
 * Extracts all numbers from text using multiple patterns.
 *
 * @param text - Text to extract numbers from
 * @returns Array of number strings found
 */
export function extractNumbers(text: string): string[] {
    if (!text) return [];
    const numbers = new Set<string>();

    for (const pattern of NUMBER_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach((m) => numbers.add(m.toLowerCase().trim()));
        }
    }

    return Array.from(numbers);
}

/**
 * Normalizes a number string to a numeric value.
 * Handles B/M/K suffixes, currencies, and percentages.
 *
 * @param numStr - Number string like "$96.8 billion" or "18.5%"
 * @returns Normalized number or null if invalid
 */
export function normalizeNumber(numStr: string): number | null {
    if (!numStr) return null;

    // Clean string
    let cleaned = numStr.replace(/[$¥€£,]/g, '').toLowerCase().trim();

    // Percentages - keep as-is (18.8% → 18.8)
    if (cleaned.endsWith('%')) {
        const val = parseFloat(cleaned);
        return isNaN(val) ? null : val;
    }

    // Suffixes
    let multiplier = 1;
    if (cleaned.match(/t(rillion)?$/)) multiplier = 1e12;
    else if (cleaned.match(/b(illion)?$/)) multiplier = 1e9;
    else if (cleaned.match(/m(illion)?$/)) multiplier = 1e6;
    else if (cleaned.match(/k(ousand)?$/)) multiplier = 1e3;

    // Remove words to parse
    cleaned = cleaned.replace(/[a-z%]/g, '').trim();

    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val * multiplier;
}

/**
 * Checks if two number strings represent the same value.
 *
 * @param a - First number string
 * @param b - Second number string
 * @returns True if numbers match within tolerance
 */
function numbersMatch(a: string, b: string): boolean {
    const valA = normalizeNumber(a);
    const valB = normalizeNumber(b);

    if (valA === null || valB === null) return false;

    // Percentages need exactish match (0.5 tolerance)
    if (a.includes('%') || b.includes('%')) {
        return Math.abs(valA - valB) < 0.5;
    }

    // Standard tolerance (5%)
    if (valA === 0) return valB === 0;
    const ratio = valA / valB;
    return ratio > 0.95 && ratio < 1.05;
}

/**
 * Helper: Converts string array to sorted number array, filtering out years and nulls.
 */
function getNumericValues(strs: string[]): number[] {
    return strs
        .map(normalizeNumber)
        .filter((n): n is number => n !== null && !/^(19|20)\d{2}$/.test(String(n))) // Filter nulls and years (1900-2099)
        .sort((a, b) => a - b);
}

/**
 * Helper: Checks if two numbers match within 10% tolerance.
 */
function isRoughlyEqual(a: number, b: number): boolean {
    if (a === 0) return b === 0;
    const ratio = a / b;
    return ratio > 0.90 && ratio < 1.10; // Increased tolerance to 10% for "roughly" checks
}

/**
 * Checks if numbers in claim match numbers in evidence.
 * NOW SUPPORTS: Exact matching, Range Overlaps, and Containment.
 *
 * @param claimNumbers - Numbers extracted from claim
 * @param evidenceNumbers - Numbers extracted from evidence
 * @returns NumericCheck result
 */
export function checkNumericConsistency(
    claimNumbers: string[],
    evidenceNumbers: string[]
): NumericCheck {
    // 1. Trivial pass
    if (claimNumbers.length === 0) {
        return { claimNumbers, evidenceNumbers, match: true };
    }

    // 2. STRICT CHECK (The original logic)
    // Every claim number must match an evidence number
    let allStrictMatch = true;
    for (const claimNum of claimNumbers) {
        if (/^(19|20)\d{2}$/.test(claimNum)) continue; // Skip years
        const found = evidenceNumbers.some((evNum) => numbersMatch(claimNum, evNum));
        if (!found) {
            allStrictMatch = false;
            break;
        }
    }

    // If strict match passes, we are golden.
    if (allStrictMatch) {
        return { claimNumbers, evidenceNumbers, match: true };
    }

    // 3. RANGE / CONTEXT CHECK (The Fix for Battery Costs)
    // If strict match failed, check if it's a valid range approximation.

    const cVals = getNumericValues(claimNumbers);
    const eVals = getNumericValues(evidenceNumbers);

    // If we don't have enough numbers to compare ranges/values, fail.
    if (cVals.length === 0 || eVals.length === 0) {
        return { claimNumbers, evidenceNumbers, match: false };
    }

    // SCENARIO A: Range Overlap / Bounds Match
    // Claim: "400 to 800" (400, 800)
    // Evidence: "400 to 600" (400, 600)
    // If the Minimums match OR the Maximums match, we consider it supported.
    if (cVals.length >= 2 && eVals.length >= 2) {
        const cMin = cVals[0];
        const cMax = cVals[cVals.length - 1];
        const eMin = eVals[0];
        const eMax = eVals[eVals.length - 1];

        const minMatch = isRoughlyEqual(cMin, eMin);
        const maxMatch = isRoughlyEqual(cMax, eMax);

        // If at least one bound matches, and the ranges overlap, it's a pass.
        // Overlap check: start of one <= end of other
        const overlap = Math.max(cMin, eMin) <= Math.min(cMax, eMax);

        if ((minMatch || maxMatch) && overlap) {
            return { claimNumbers, evidenceNumbers, match: true };
        }
    }

    // SCENARIO B: Containment
    // Claim: "Bitcoin is $87,500" (87500)
    // Evidence: "Bitcoin trading between $87,000 and $88,000" (87000, 88000)
    // The claim is inside the evidence range.
    if (eVals.length >= 2 && cVals.length === 1) {
        const val = cVals[0];
        const eMin = eVals[0];
        const eMax = eVals[eVals.length - 1];

        if (val >= eMin && val <= eMax) {
            return { claimNumbers, evidenceNumbers, match: true };
        }
    }

    // SCENARIO C: Reverse Containment (Claim is a range, Evidence is a point)
    // Claim: "Costs between $400-$800"
    // Evidence: "Costs are $500"
    // The evidence supports the claim interval.
    if (cVals.length >= 2 && eVals.length === 1) {
        const val = eVals[0];
        const cMin = cVals[0];
        const cMax = cVals[cVals.length - 1];

        if (val >= cMin && val <= cMax) {
            return { claimNumbers, evidenceNumbers, match: true };
        }
    }

    return { claimNumbers, evidenceNumbers, match: false };
}

// ============================================
// SIGNAL AGGREGATION
// ============================================

/**
 * Aggregates all verification signals into a final confidence score.
 *
 * @param entailment - NLI verdict
 * @param retrievalSimilarity - Semantic similarity score
 * @param citationMismatch - Whether best evidence was from uncited source
 * @param numericCheck - Result of numeric consistency check
 * @returns Aggregated verdict with confidence and issues
 */
export function aggregateSignals(
    entailment: EntailmentVerdict,
    retrievalSimilarity: number,
    citationMismatch: boolean,
    numericCheck: NumericCheck | null
): AggregatedVerdict {
    const issues: string[] = [];
    let confidence: number;

    // 1. Base Confidence from NLI
    switch (entailment) {
        case 'SUPPORTED':
            confidence = ENTAILMENT_SUPPORTED_CONFIDENCE;
            break;
        case 'CONTRADICTED':
            confidence = ENTAILMENT_CONTRADICTED_CONFIDENCE;
            issues.push('Evidence contradicts claim');
            break;
        case 'NEUTRAL':
            confidence = ENTAILMENT_NEUTRAL_CONFIDENCE;
            issues.push('Evidence is neutral/irrelevant');
            break;
    }

    // 2. Retrieval Penalty
    if (retrievalSimilarity < LOW_RETRIEVAL_THRESHOLD) {
        confidence *= LOW_RETRIEVAL_MULTIPLIER;
        issues.push('Low semantic similarity');
    }

    // 3. Citation Penalty
    if (citationMismatch) {
        confidence *= CITATION_MISMATCH_MULTIPLIER;
        issues.push('Better evidence found in uncited source');
    }

    // 4. Numeric Penalty (Severe)
    if (numericCheck && !numericCheck.match) {
        confidence *= NUMERIC_MISMATCH_MULTIPLIER;
        issues.push(
            `Numeric mismatch: [${numericCheck.claimNumbers.join(', ')}] vs [${numericCheck.evidenceNumbers.join(', ')}]`
        );
    }

    // Determine confidence level
    let confidenceLevel: 'high' | 'medium' | 'low';
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) confidenceLevel = 'high';
    else if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) confidenceLevel = 'medium';
    else confidenceLevel = 'low';

    return { confidence, confidenceLevel, issues };
}

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

/**
 * Main verification orchestrator.
 * Connects: Extraction → Chunking → Embedding → Retrieval → NLI → Aggregation
 *
 * @param answer - The synthesized answer to verify
 * @param sources - The sources used in synthesis
 * @param onProgress - Optional callback for progress updates
 * @param precomputedEvidence - Optional pre-computed evidence from background prep
 * @returns Complete verification output with all claims verified
 */
export async function verifyClaims(
    answer: string,
    sources: MaxwellSource[],
    onProgress?: VerificationProgressCallback,
    precomputedEvidence?: PreparedEvidence,
    maxClaimsToVerify: number = MAX_CLAIMS_TO_VERIFY, // Added parameter
    verificationConcurrency: number = DEFAULT_VERIFICATION_CONCURRENCY // Added parameter
): Promise<VerificationOutput> {
    const startTime = Date.now();

    // 1. Extract claims
    onProgress?.({ current: 0, total: 1, status: 'Extracting factual claims...' });
    const claims = await extractClaims(answer, maxClaimsToVerify); // Pass limit

    // Handle no claims
    if (claims.length === 0) {
        return {
            claims: [],
            overallConfidence: 0,
            summary: createEmptySummary(),
            durationMs: Date.now() - startTime,
        };
    }

    // 2. Get evidence (use precomputed if available - OPTIMIZATION)
    let passages: Passage[];
    let passageEmbeddings: number[][];

    if (precomputedEvidence && precomputedEvidence.passages.length > 0) {
        // 🚀 FAST PATH: Evidence was prepared during synthesis
        passages = precomputedEvidence.passages;
        passageEmbeddings = precomputedEvidence.embeddings;
    } else {
        // SLOW PATH: Prepare evidence now (fallback)
        onProgress?.({ current: 0, total: claims.length, status: 'Processing evidence...' });
        const prep = await prepareEvidence(sources);
        passages = prep.passages;
        passageEmbeddings = prep.embeddings;
    }

    if (passages.length === 0) {
        // If we have claims but no sources to check against, return low confidence
        return createNoEvidenceResult(claims, startTime);
    }

    // 3. Batch embed claims (passages already embedded)
    onProgress?.({ current: 0, total: claims.length, status: 'Embedding claims...' });
    const claimTexts = claims.map((c) => c.text);
    const claimEmbeddings = await embedTexts(claimTexts);

    // 4. Verify claims in parallel with concurrency limit
    // Concurrency set by quality preset (FAST=8, MEDIUM=6, SLOW=4)
    const CONCURRENCY_LIMIT = verificationConcurrency; // Use dynamic concurrency

    onProgress?.({ current: 0, total: claims.length, status: 'Verifying claims in parallel...' });

    const verifiedClaims = await mapAsyncWithConcurrency(
        claims,
        CONCURRENCY_LIMIT,
        async (claim, i) => {
            onProgress?.({
                current: i + 1,
                total: claims.length,
                status: `Verifying claims (${i + 1}/${claims.length})...`,
            });

            try {
                // 4a. Use pre-computed claim embedding (no network call!)
                const claimEmbedding = claimEmbeddings[i];

                // 4b. Retrieve best evidence (CPU-bound, fast)
                const retrieval = retrieveEvidence(
                    claimEmbedding,
                    passages,
                    passageEmbeddings,
                    claim.citedSources
                );

                // 4c. Check entailment via NLI (network-bound, now parallel)
                const entailment = await checkEntailment(
                    claim.text,
                    retrieval.bestPassage.text
                );

                // 4d. Check numeric consistency (CPU-bound, fast)
                const claimNumbers = extractNumbers(claim.text);
                const evidenceNumbers = extractNumbers(retrieval.bestPassage.text);
                const numericCheck =
                    claimNumbers.length > 0
                        ? checkNumericConsistency(claimNumbers, evidenceNumbers)
                        : null;

                // 4e. Aggregate all signals
                const verdict = aggregateSignals(
                    entailment.verdict,
                    retrieval.retrievalSimilarity,
                    retrieval.citationMismatch,
                    numericCheck
                );

                return {
                    id: claim.id,
                    text: claim.text,
                    confidence: verdict.confidence,
                    confidenceLevel: verdict.confidenceLevel,
                    entailment: entailment.verdict,
                    entailmentReasoning: entailment.reasoning,
                    bestMatchingSource: {
                        sourceId: retrieval.bestPassage.sourceId,
                        sourceTitle: retrieval.bestPassage.sourceTitle,
                        sourceIndex: retrieval.bestPassage.sourceIndex,
                        passage: retrieval.bestPassage.text,
                        similarity: retrieval.retrievalSimilarity,
                        isCitedSource: claim.citedSources.includes(retrieval.bestPassage.sourceIndex),
                    },
                    citationMismatch: retrieval.citationMismatch,
                    citedSourceSupport: retrieval.citedSourceSupport,
                    globalBestSupport: retrieval.globalBestSupport,
                    numericCheck,
                    issues: verdict.issues,
                } as VerifiedClaim;
            } catch (error) {
                // Fallback for failed claim - doesn't affect other claims
                console.error(`[Maxwell Verifier] Failed to verify claim "${claim.text}":`, error);
                return {
                    id: claim.id,
                    text: claim.text,
                    confidence: 0,
                    confidenceLevel: 'low',
                    entailment: 'NEUTRAL',
                    entailmentReasoning: 'Verification failed due to internal error',
                    bestMatchingSource: {
                        sourceId: '',
                        sourceTitle: 'Error',
                        sourceIndex: 0,
                        passage: '',
                        similarity: 0,
                        isCitedSource: false,
                    },
                    citationMismatch: false,
                    citedSourceSupport: 0,
                    globalBestSupport: 0,
                    numericCheck: null,
                    issues: ['System error during verification'],
                } as VerifiedClaim;
            }
        }
    );

    // 5. Calculate summary and overall confidence
    const confidenceScores = verifiedClaims.map((c) => c.confidence);
    const avgConf = confidenceScores.reduce((a, b) => a + b, 0) / (confidenceScores.length || 1);

    return {
        claims: verifiedClaims,
        overallConfidence: Math.round(avgConf * 100),
        summary: {
            supported: verifiedClaims.filter((c) => c.entailment === 'SUPPORTED').length,
            uncertain: verifiedClaims.filter((c) => c.entailment === 'NEUTRAL').length,
            contradicted: verifiedClaims.filter((c) => c.entailment === 'CONTRADICTED').length,
            citationMismatches: verifiedClaims.filter((c) => c.citationMismatch).length,
            numericMismatches: verifiedClaims.filter((c) => c.numericCheck && !c.numericCheck.match).length,
        },
        durationMs: Date.now() - startTime,
    };
}

/**
 * Streaming wrapper for verifyClaims.
 * Yields progress events and final result.
 */
export async function* verifyClaimsStream(
    answer: string,
    sources: MaxwellSource[],
    precomputedEvidence?: PreparedEvidence
): AsyncGenerator<{ type: 'progress'; data: VerificationProgress } | { type: 'result'; data: VerificationOutput }> {
    const progressQueue: VerificationProgress[] = [];
    let resolveProgress: (() => void) | null = null;
    let isDone = false;
    let error: unknown = null;

    const onProgress = (p: VerificationProgress) => {
        progressQueue.push(p);
        if (resolveProgress) {
            resolveProgress();
            resolveProgress = null;
        }
    };

    const verificationPromise = verifyClaims(answer, sources, onProgress, precomputedEvidence)
        .then((result) => {
            isDone = true;
            if (resolveProgress) resolveProgress();
            return result;
        })
        .catch((err) => {
            isDone = true;
            error = err;
            if (resolveProgress) resolveProgress();
            throw err;
        });

    while (!isDone || progressQueue.length > 0) {
        if (progressQueue.length > 0) {
            yield { type: 'progress', data: progressQueue.shift()! };
        } else {
            if (isDone) break;
            await new Promise<void>((resolve) => {
                resolveProgress = resolve;
            });
        }
    }

    if (error) throw error;
    const result = await verificationPromise;
    yield { type: 'result', data: result };
}

// ============================================
// HELPERS
// ============================================

/**
 * Creates an empty verification summary.
 */
function createEmptySummary(): VerificationSummary {
    return {
        supported: 0,
        uncertain: 0,
        contradicted: 0,
        citationMismatches: 0,
        numericMismatches: 0,
    };
}

/**
 * Creates a result when no evidence is available.
 */
function createNoEvidenceResult(
    claims: ExtractedClaim[],
    startTime: number
): VerificationOutput {
    return {
        claims: claims.map((c) => ({
            id: c.id,
            text: c.text,
            confidence: 0,
            confidenceLevel: 'low' as const,
            entailment: 'NEUTRAL' as const,
            entailmentReasoning: 'No evidence available',
            bestMatchingSource: {
                sourceId: '',
                sourceTitle: '',
                sourceIndex: 0,
                passage: '',
                similarity: 0,
                isCitedSource: false,
            },
            citationMismatch: false,
            citedSourceSupport: 0,
            globalBestSupport: 0,
            numericCheck: null,
            issues: ['No sources available for verification'],
        })),
        overallConfidence: 0,
        summary: { ...createEmptySummary(), uncertain: claims.length },
        durationMs: Date.now() - startTime,
    };
}

/**
 * Validates verification output structure.
 */
export function validateVerificationOutput(output: VerificationOutput): boolean {
    if (!Array.isArray(output.claims)) throw new Error('claims must be array');
    if (typeof output.overallConfidence !== 'number') throw new Error('overallConfidence must be number');
    if (!output.summary) throw new Error('summary missing');
    return true;
}

// ============================================
// CONCURRENCY UTILITY
// ============================================

/**
 * Processes items in parallel with a concurrency limit.
 * Race-condition safe: uses pre-allocated results array with index-based writes.
 *
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent operations
 * @param fn - Async function to process each item
 * @returns Array of results in same order as input
 */
async function mapAsyncWithConcurrency<T, U>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<U>
): Promise<U[]> {
    // Pre-allocate results array to guarantee order preservation
    const results = new Array<U>(items.length);

    // Create work queue with original indices
    // Each worker pulls from this queue - shift() is atomic in JS single-threaded event loop
    const queue = items.map((item, index) => ({ item, index }));

    // Worker function - each worker processes items until queue is empty
    const worker = async (): Promise<void> => {
        while (queue.length > 0) {
            const task = queue.shift();
            if (task) {
                // Each worker writes to its own index - no race conditions
                results[task.index] = await fn(task.item, task.index);
            }
        }
    };

    // Spawn workers up to concurrency limit (or item count if smaller)
    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    return results;
}

// ============================================
// EXPORTS
// ============================================

// Export schemas for potential use in next phases
export { ClaimsSchema, EntailmentSchema };

