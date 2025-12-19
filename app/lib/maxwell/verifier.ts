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

import { createClaimExtractionPrompt } from './prompts';
import { cosineSimilarity } from './embeddings';
import {
    CLAIM_EXTRACTION_MODEL,
    MAX_CLAIMS_TO_VERIFY,
    MIN_PASSAGE_LENGTH,
    CITATION_MISMATCH_THRESHOLD,
} from './constants';

import type {
    MaxwellSource,
    ExtractedClaim,
    Passage,
    RetrievalResult,
} from './types';

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

// ============================================
// CLAIM EXTRACTION
// ============================================

/**
 * Extracts factual claims from a synthesized answer.
 *
 * @param answer - The synthesized answer with citations
 * @returns Array of extracted claims with cited source numbers
 */
export async function extractClaims(answer: string): Promise<ExtractedClaim[]> {
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
            .slice(0, MAX_CLAIMS_TO_VERIFY)
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
// EXPORTS
// ============================================

// Export schema for potential use in next phases
export { ClaimsSchema };
